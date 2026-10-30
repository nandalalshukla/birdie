import numpy as np
import pytest

from app.services.audio import Audio, AudioError, load_audio, split_windows, validate_duration
from tests.conftest import make_wav


def test_load_resamples_to_48k(tmp_path):
    p = tmp_path / "a.wav"
    p.write_bytes(make_wav(seconds=4, sr=22_050))
    audio = load_audio(p)
    assert audio.sample_rate == 48_000
    assert audio.duration == pytest.approx(4, abs=0.01)
    assert audio.samples.dtype == np.float32


def test_load_rejects_garbage(tmp_path):
    p = tmp_path / "a.m4a"
    p.write_bytes(b"not audio at all")
    with pytest.raises(AudioError):
        load_audio(p)


def test_split_windows_pads_tail_and_drops_short_tail():
    sr = 48_000
    audio = Audio(np.ones(int(sr * 10), dtype=np.float32), sr)  # 10 s → 3+3+3 + 1 s tail (dropped)
    w = split_windows(audio)
    assert [x.start for x in w] == [0, 3, 6]
    assert all(len(x.samples) == 3 * sr for x in w)

    audio = Audio(np.ones(int(sr * 11), dtype=np.float32), sr)  # 2 s tail → padded
    w = split_windows(audio)
    assert len(w) == 4 and w[-1].samples[-1] == 0


def test_split_windows_with_overlap():
    sr = 48_000
    audio = Audio(np.ones(sr * 6, dtype=np.float32), sr)
    assert [x.start for x in split_windows(audio, overlap_seconds=1.5)] == [0, 1.5, 3, 4.5]


def test_validate_duration():
    sr = 48_000
    with pytest.raises(AudioError):
        validate_duration(Audio(np.ones(sr, dtype=np.float32), sr), 3, 20)
    trimmed = validate_duration(Audio(np.ones(sr * 30, dtype=np.float32), sr), 3, 20)
    assert trimmed.duration == 20
