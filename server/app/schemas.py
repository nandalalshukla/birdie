from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

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


class SightingCreate(BaseModel):
    job_id: str
    scientific_name: str
    device_id: str = Field(min_length=8, max_length=64)
    observer_name: str | None = Field(None, max_length=64)
    note: str | None = Field(None, max_length=500)
    is_public: bool = True
    # Only used when the analysis itself has no location.
    lat: float | None = Field(None, ge=-90, le=90)
    lon: float | None = Field(None, ge=-180, le=180)


class SightingOut(BaseModel):
    id: str
    job_id: str | None
    scientific_name: str
    common_name: str
    confidence: float
    lat: float
    lon: float
    observed_at: datetime
    observer_name: str | None
    note: str | None
    is_public: bool
    is_mine: bool
    created_at: datetime


class SightingPage(BaseModel):
    items: list[SightingOut]
    next_cursor: str | None
