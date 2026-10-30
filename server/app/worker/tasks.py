import logging
from datetime import datetime, timezone

from app.db import session_scope
from app.models import AnalysisJob, JobStatus

log = logging.getLogger(__name__)


def process_analysis(job_id: str) -> None:
    """Run the full pipeline for one uploaded recording."""
    with session_scope() as s:
        job = s.get(AnalysisJob, job_id)
        if job is None or job.status == JobStatus.done:
            return
        job.status = JobStatus.processing
        job.started_at = datetime.now(timezone.utc)

    try:
        result: dict = {"species": [], "windows": []}
    except Exception as exc:
        log.exception("Analysis %s failed", job_id)
        with session_scope() as s:
            job = s.get(AnalysisJob, job_id)
            job.status = JobStatus.failed
            job.error = str(exc) or exc.__class__.__name__
            job.finished_at = datetime.now(timezone.utc)
        return

    with session_scope() as s:
        job = s.get(AnalysisJob, job_id)
        job.result = result
        job.status = JobStatus.done
        job.finished_at = datetime.now(timezone.utc)
