"""A tiny in-process job queue.

Inference is CPU-bound and the model is loaded once per process, so a handful of
worker threads sharing one interpreter-per-thread is plenty for a single node.
The `JobQueue` protocol keeps the API decoupled so this can be swapped for
RQ/Celery/arq when scaling out to dedicated worker machines.
"""

import logging
import queue
import threading
from collections.abc import Callable
from typing import Protocol

log = logging.getLogger(__name__)


class JobQueue(Protocol):
    def enqueue(self, job_id: str) -> None: ...
    def start(self) -> None: ...
    def stop(self) -> None: ...
    def pending(self) -> int: ...


class InProcessQueue:
    def __init__(self, handler: Callable[[str], None], workers: int = 2) -> None:
        self._handler = handler
        self._workers = max(1, workers)
        self._q: queue.Queue[str | None] = queue.Queue()
        self._threads: list[threading.Thread] = []

    def enqueue(self, job_id: str) -> None:
        self._q.put(job_id)

    def pending(self) -> int:
        return self._q.qsize()

    def start(self) -> None:
        for i in range(self._workers):
            t = threading.Thread(target=self._run, name=f"birdear-worker-{i}", daemon=True)
            t.start()
            self._threads.append(t)

    def stop(self) -> None:
        for _ in self._threads:
            self._q.put(None)
        for t in self._threads:
            t.join(timeout=5)
        self._threads.clear()

    def join(self) -> None:
        """Block until all queued jobs are processed (used by tests)."""
        self._q.join()

    def _run(self) -> None:
        while True:
            job_id = self._q.get()
            try:
                if job_id is None:
                    return
                self._handler(job_id)
            except Exception:  # the handler records failures itself; never kill the worker
                log.exception("Unhandled error while processing job %s", job_id)
            finally:
                self._q.task_done()


class SyncQueue:
    """Runs jobs inline. Useful for tests and scripts."""

    def __init__(self, handler: Callable[[str], None]) -> None:
        self._handler = handler

    def enqueue(self, job_id: str) -> None:
        self._handler(job_id)

    def start(self) -> None: ...
    def stop(self) -> None: ...
    def pending(self) -> int:
        return 0
