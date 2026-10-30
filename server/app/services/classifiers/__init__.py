import threading

from app.config import Settings
from app.services.classifiers.base import ClassificationResult, Classifier, Detection

__all__ = ["ClassificationResult", "Classifier", "Detection", "get_classifier"]

_lock = threading.Lock()
_instances: dict[str, Classifier] = {}


def get_classifier(settings: Settings) -> Classifier:
    """Process-wide classifier singleton, created lazily on first use."""
    with _lock:
        if settings.classifier not in _instances:
            if settings.classifier == "mock":
                from app.services.classifiers.mock import MockClassifier

                _instances[settings.classifier] = MockClassifier()
            else:
                from app.services.classifiers.birdnet import BirdNETClassifier

                _instances[settings.classifier] = BirdNETClassifier(
                    overlap=settings.window_overlap_seconds,
                    location_filter_threshold=settings.location_filter_threshold,
                )
        return _instances[settings.classifier]
