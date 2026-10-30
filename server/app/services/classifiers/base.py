from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol

from app.services.audio import Audio


@dataclass(frozen=True)
class Detection:
    start: float
    end: float
    scientific_name: str
    common_name: str
    confidence: float

    def as_dict(self) -> dict:
        return {
            "start": self.start,
            "end": self.end,
            "scientific_name": self.scientific_name,
            "common_name": self.common_name,
            "confidence": round(float(self.confidence), 4),
        }


@dataclass
class ClassificationResult:
    detections: list[Detection]
    window_count: int
    model: str
    # Number of species BirdNET's range model expects at this place/week (None = no location).
    candidate_species: int | None = None
    location_filtered: bool = False
    extra: dict = field(default_factory=dict)


class Classifier(Protocol):
    name: str

    def classify(
        self,
        audio: Audio,
        *,
        lat: float | None,
        lon: float | None,
        date: datetime | None,
        min_confidence: float,
    ) -> ClassificationResult: ...
