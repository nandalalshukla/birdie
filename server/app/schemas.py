from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import JobStatus


class JobCreated(BaseModel):
    id: str
    status: JobStatus


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: JobStatus
    lat: float | None
    lon: float | None
    recorded_at: datetime
    min_confidence: float
    duration_seconds: float | None
    result: dict | None
    has_spectrogram: bool = False
    error: str | None
    created_at: datetime
    finished_at: datetime | None
