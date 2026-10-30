from fastapi import Request

from app.config import Settings
from app.worker.queue import JobQueue


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_queue(request: Request) -> JobQueue:
    return request.app.state.queue
