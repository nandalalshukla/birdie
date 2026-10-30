import io
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.worker.queue import SyncQueue
from app.worker.tasks import process_analysis


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(data_dir=tmp_path, classifier="mock", species_info_timeout=0.01)


@pytest.fixture
def client(settings: Settings):
    app = create_app(settings=settings, queue=SyncQueue(process_analysis))
    with TestClient(app) as c:
        yield c


def make_wav(seconds: float = 9.0, sr: int = 44_100) -> bytes:
    t = np.arange(int(sr * seconds)) / sr
    y = 0.2 * np.sin(2 * np.pi * 3500 * t) * (np.sin(2 * np.pi * 3 * t) > 0)
    buf = io.BytesIO()
    sf.write(buf, y.astype(np.float32), sr, format="WAV")
    return buf.getvalue()


@pytest.fixture
def wav_bytes() -> bytes:
    return make_wav()
