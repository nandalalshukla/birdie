from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_app_settings, get_queue
from app.config import Settings
from app.db import get_session
from app.models import AnalysisJob
from app.schemas import JobCreated, JobOut
from app.services.storage import UploadTooLarge, save_upload
from app.worker.queue import JobQueue

router = APIRouter(prefix="/analyses", tags=["analyses"])


@router.post("", response_model=JobCreated, status_code=status.HTTP_202_ACCEPTED)
def create_analysis(
    audio: UploadFile = File(..., description="10–15 s recording (m4a, wav, webm, …)"),
    lat: float | None = Form(None, ge=-90, le=90),
    lon: float | None = Form(None, ge=-180, le=180),
    recorded_at: datetime | None = Form(None),
    min_confidence: float | None = Form(None, ge=0, le=1),
    device_id: str | None = Form(None, max_length=64),
    settings: Settings = Depends(get_app_settings),
    session: Session = Depends(get_session),
    queue: JobQueue = Depends(get_queue),
) -> JobCreated:
    """Upload a recording; it is queued for BirdNET analysis. Poll `GET /analyses/{id}`."""
    try:
        path = save_upload(audio.file, audio.filename, settings.uploads_dir, settings.max_upload_mb * 1024 * 1024)
    except UploadTooLarge:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"Max upload is {settings.max_upload_mb} MB")

    job = AnalysisJob(
        audio_path=str(path),
        original_filename=audio.filename,
        lat=lat,
        lon=lon,
        recorded_at=recorded_at or datetime.now(timezone.utc),
        min_confidence=settings.min_confidence if min_confidence is None else min_confidence,
        device_id=device_id,
    )
    session.add(job)
    session.commit()
    queue.enqueue(job.id)
    return JobCreated(id=job.id, status=job.status)


@router.get("/{job_id}", response_model=JobOut)
def get_analysis(job_id: str, session: Session = Depends(get_session)) -> JobOut:
    job = session.get(AnalysisJob, job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found")
    out = JobOut.model_validate(job)
    out.has_spectrogram = bool(job.spectrogram_path)
    return out
