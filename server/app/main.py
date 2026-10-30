import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.routes import analyses, health
from app.config import Settings, get_settings
from app.db import init_db, session_scope
from app.models import AnalysisJob, JobStatus
from app.worker.queue import InProcessQueue, JobQueue
from app.worker.tasks import process_analysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def _requeue_unfinished(queue: JobQueue) -> None:
    """Jobs interrupted by a restart are picked up again."""
    with session_scope() as s:
        ids = s.scalars(
            select(AnalysisJob.id).where(AnalysisJob.status.in_([JobStatus.queued, JobStatus.processing]))
        ).all()
    for job_id in ids:
        queue.enqueue(job_id)


def create_app(settings: Settings | None = None, queue: JobQueue | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        settings.ensure_dirs()
        init_db(settings.resolved_database_url)
        q = queue or InProcessQueue(process_analysis, workers=settings.worker_threads)
        app.state.settings = settings
        app.state.queue = q
        q.start()
        _requeue_unfinished(q)
        yield
        q.stop()

    app = FastAPI(title="BirdEar API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(analyses.router)
    return app


app = create_app()
