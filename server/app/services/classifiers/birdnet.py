"""BirdNET v2.4 via birdnetlib.

birdnetlib imports `tflite_runtime` or `tensorflow.lite`. Neither ships wheels for
recent Pythons, so we fall back to Google's `ai-edge-litert` (the renamed TFLite
runtime), which is API-compatible.
"""

import importlib
import logging
import sys
import threading
import types
from datetime import datetime

from app.services.audio import Audio
from app.services.classifiers.base import ClassificationResult, Detection

log = logging.getLogger(__name__)

MODEL_NAME = "BirdNET-Analyzer v2.4 (GLOBAL 6K)"


def _ensure_tflite_runtime() -> None:
    for mod in ("tflite_runtime.interpreter", "tensorflow.lite"):
        try:
            importlib.import_module(mod)
            return
        except ImportError:
            continue
    try:
        litert = importlib.import_module("ai_edge_litert.interpreter")
    except ImportError as exc:
        raise RuntimeError(
            "No TFLite interpreter found. Install one of: tflite-runtime, tensorflow, ai-edge-litert"
        ) from exc
    shim = types.ModuleType("tflite_runtime")
    shim.interpreter = litert  # type: ignore[attr-defined]
    sys.modules["tflite_runtime"] = shim
    sys.modules["tflite_runtime.interpreter"] = litert


class BirdNETClassifier:
    name = MODEL_NAME

    def __init__(self, sensitivity: float = 1.0, overlap: float = 0.0, location_filter_threshold: float = 0.03):
        _ensure_tflite_runtime()
        from birdnetlib.analyzer import Analyzer  # noqa: F401 (fail fast on import problems)

        self._sensitivity = sensitivity
        self._overlap = overlap
        self._filter_threshold = location_filter_threshold
        # A birdnetlib Analyzer keeps per-recording state (species allow-list, results),
        # so each worker thread gets its own instance.
        self._local = threading.local()

    def _analyzer(self):
        analyzer = getattr(self._local, "analyzer", None)
        if analyzer is None:
            from birdnetlib.analyzer import Analyzer

            log.info("Loading BirdNET model in %s", threading.current_thread().name)
            analyzer = Analyzer()
            self._local.analyzer = analyzer
        return analyzer

    def warm_up(self) -> None:
        self._analyzer()

    def classify(
        self,
        audio: Audio,
        *,
        lat: float | None,
        lon: float | None,
        date: datetime | None,
        min_confidence: float,
    ) -> ClassificationResult:
        from birdnetlib import RecordingBuffer

        if audio.sample_rate != 48_000:
            raise ValueError("BirdNET expects 48 kHz audio")

        analyzer = self._analyzer()
        has_location = lat is not None and lon is not None
        # birdnetlib leaves the previous recording's location allow-list in place;
        # clear it so a recording without location considers every species.
        analyzer.custom_species_list = []

        recording = RecordingBuffer(
            analyzer,
            audio.samples,
            audio.sample_rate,
            date=date if has_location else None,
            lat=lat if has_location else None,
            lon=lon if has_location else None,
            min_conf=min_confidence,
            sensitivity=self._sensitivity,
            overlap=self._overlap,
            filter_threshold=self._filter_threshold,
        )
        recording.analyze()

        detections = [
            Detection(
                start=float(d["start_time"]),
                end=float(d["end_time"]),
                scientific_name=d["scientific_name"],
                common_name=d["common_name"],
                confidence=float(d["confidence"]),
            )
            for d in recording.detections
        ]
        candidates = len(analyzer.custom_species_list) if has_location else None
        return ClassificationResult(
            detections=detections,
            window_count=len(recording.chunks),
            model=self.name,
            candidate_species=candidates,
            location_filtered=bool(candidates),
        )
