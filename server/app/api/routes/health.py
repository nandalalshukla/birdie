from fastapi import APIRouter, Depends

from app.api.deps import get_app_settings, get_queue
from app.config import Settings
from app.worker.queue import JobQueue

router = APIRouter(tags=["health"])


@router.get("/health")
def health(settings: Settings = Depends(get_app_settings), q: JobQueue = Depends(get_queue)) -> dict:
    return {"status": "ok", "classifier": settings.classifier, "queued": q.pending()}
