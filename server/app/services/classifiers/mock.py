"""Deterministic stand-in for BirdNET, for UI development and tests.

It "detects" species from a small fixed list based on simple spectral
statistics, so the same clip always yields the same answer.
"""

from datetime import datetime

import numpy as np

from app.services.audio import Audio, split_windows
from app.services.classifiers.base import ClassificationResult, Detection

SPECIES = [
    ("Turdus merula", "Eurasian Blackbird"),
    ("Erithacus rubecula", "European Robin"),
    ("Parus major", "Great Tit"),
    ("Cardinalis cardinalis", "Northern Cardinal"),
    ("Turdus migratorius", "American Robin"),
    ("Copsychus saularis", "Oriental Magpie-Robin"),
]


class MockClassifier:
    name = "mock"

    def classify(
        self,
        audio: Audio,
        *,
        lat: float | None,
        lon: float | None,
        date: datetime | None,
        min_confidence: float,
    ) -> ClassificationResult:
        detections: list[Detection] = []
        windows = split_windows(audio)
        for w in windows:
            rms = float(np.sqrt(np.mean(w.samples**2)))
            if rms < 1e-3:
                continue
            spectrum = np.abs(np.fft.rfft(w.samples))
            peak_hz = float(np.argmax(spectrum)) * audio.sample_rate / len(w.samples)
            idx = int(peak_hz // 1000) % len(SPECIES)
            conf = min(0.97, 0.55 + rms * 2)
            for i, c in ((idx, conf), ((idx + 1) % len(SPECIES), conf * 0.4)):
                if c >= min_confidence:
                    sci, common = SPECIES[i]
                    detections.append(Detection(w.start, w.end, sci, common, c))
        return ClassificationResult(
            detections=detections,
            window_count=len(windows),
            model=self.name,
            candidate_species=len(SPECIES) if lat is not None else None,
            location_filtered=lat is not None,
        )
