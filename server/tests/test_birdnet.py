"""Opt-in test against the real BirdNET model.

    BIRDEAR_TEST_AUDIO=/path/to/birdsong.wav pytest tests/test_birdnet.py
"""

import os
from datetime import datetime

import pytest

from app.config import Settings
from app.worker.tasks import AnalysisPipeline

AUDIO = os.environ.get("BIRDEAR_TEST_AUDIO")


@pytest.mark.skipif(not AUDIO, reason="set BIRDEAR_TEST_AUDIO to a bird recording")
def test_real_birdnet_with_location_filter():
    pipeline = AnalysisPipeline(Settings(classifier="birdnet"))
    _, unfiltered = pipeline.run(audio_path=AUDIO, lat=None, lon=None, date=None, min_confidence=0.5)
    _, filtered = pipeline.run(
        audio_path=AUDIO, lat=42.47, lon=-76.45, date=datetime(2026, 5, 15), min_confidence=0.5
    )
    assert unfiltered["windows"]
    assert filtered["location_filtered"] and filtered["candidate_species"] > 0
    assert len(filtered["windows"]) <= len(unfiltered["windows"])
