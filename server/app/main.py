import logging
from collections.abc import Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.routes import analyses, health, species
from app.config import Settings, get_settings
from app.db import init_db, session_scope
from app.models import AnalysisJob, JobStatus
from app.services.species_info import SpeciesInfoService
from app.worker.queue import InProcessQueue, JobQueue
from app.worker.tasks import AnalysisPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def _requeue_unfinished(queue: JobQueue) -> None:
    """Jobs interrupted by a restart are picked up again."""
    with session_scope() as s:
        ids = s.scalars(
            select(AnalysisJob.id).where(AnalysisJob.status.in_([JobStatus.queued, JobStatus.processing]))
        ).all()
    for job_id in ids:
        queue.enqueue(job_id)


QueueFactory = Callable[[Callable[[str], None]], JobQueue]


def create_app(
    settings: Settings | None = None,
    queue_factory: QueueFactory | None = None,
    species_info: SpeciesInfoService | None = None,
) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        settings.ensure_dirs()
        init_db(settings.resolved_database_url)
        handler = AnalysisPipeline(settings)
        if queue_factory:
            q = queue_factory(handler)
        else:
            q = InProcessQueue(handler, workers=settings.worker_threads)
        app.state.settings = settings
        app.state.queue = q
        app.state.species_info = species_info or SpeciesInfoService(settings)
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
    app.include_router(species.router)
    return app


app = create_app()
