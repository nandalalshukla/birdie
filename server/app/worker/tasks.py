import logging
from datetime import datetime, timezone

from app.config import Settings
from app.db import session_scope
from app.models import AnalysisJob, JobStatus
from app.services.aggregation import aggregate, detected_noise
from app.services.audio import AudioError, load_audio, validate_duration
from app.services.classifiers import get_classifier

log = logging.getLogger(__name__)


class AnalysisPipeline:
    """Upload → resample 48 kHz → 3 s windows → BirdNET → stored result."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def __call__(self, job_id: str) -> None:
        with session_scope() as s:
            job = s.get(AnalysisJob, job_id)
            if job is None or job.status in (JobStatus.done, JobStatus.failed):
                return
            job.status = JobStatus.processing
            job.started_at = datetime.now(timezone.utc)
            params = {
                "audio_path": job.audio_path,
                "lat": job.lat,
                "lon": job.lon,
                "date": job.recorded_at,
                "min_confidence": job.min_confidence,
            }

        try:
            duration, result = self.run(**params)
        except AudioError as exc:
            self._fail(job_id, str(exc))
            return
        except Exception as exc:
            log.exception("Analysis %s failed", job_id)
            self._fail(job_id, f"Analysis failed: {exc.__class__.__name__}")
            return

        with session_scope() as s:
            job = s.get(AnalysisJob, job_id)
            job.duration_seconds = duration
            job.result = result
            job.status = JobStatus.done
            job.finished_at = datetime.now(timezone.utc)

    def run(self, *, audio_path: str, lat, lon, date, min_confidence: float) -> tuple[float, dict]:
        cfg = self.settings
        audio = load_audio(audio_path, sample_rate=cfg.sample_rate)
        audio = validate_duration(audio, cfg.min_duration_seconds, cfg.max_duration_seconds)

        classification = get_classifier(cfg).classify(
            audio,
            lat=lat,
            lon=lon,
            date=date,
            min_confidence=min(cfg.window_min_confidence, min_confidence),
        )
        windows = sorted(classification.detections, key=lambda d: (d.start, -d.confidence))
        result = {
            "model": classification.model,
            "window_count": classification.window_count,
            "window_seconds": cfg.window_seconds,
            "location_filtered": classification.location_filtered,
            "candidate_species": classification.candidate_species,
            "min_confidence": min_confidence,
            "windows": [d.as_dict() for d in windows],
            "species": [s.as_dict() for s in aggregate(classification.detections, min_confidence)],
            "noise": detected_noise(classification.detections),
        }
        return round(audio.duration, 2), result

    @staticmethod
    def _fail(job_id: str, message: str) -> None:
        with session_scope() as s:
            job = s.get(AnalysisJob, job_id)
            job.status = JobStatus.failed
            job.error = message
            job.finished_at = datetime.now(timezone.utc)
