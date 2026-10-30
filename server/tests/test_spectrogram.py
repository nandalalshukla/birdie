import numpy as np

from app.services.audio import Audio
from app.services.spectrogram import mel_spectrogram_db, render_spectrogram


def tone(seconds=6, sr=48_000, hz=4000):
    t = np.arange(sr * seconds) / sr
    return Audio((0.3 * np.sin(2 * np.pi * hz * t)).astype(np.float32), sr)


def test_mel_spectrogram_peaks_near_tone():
    import librosa

    S = mel_spectrogram_db(tone(hz=4000))
    mels = librosa.mel_frequencies(n_mels=128, fmin=150, fmax=15_000)
    peak = mels[int(np.argmax(S.mean(axis=1)))]
    assert 3500 < peak < 4600


def test_render_writes_png(tmp_path):
    out = render_spectrogram(
        tone(), tmp_path / "s.png", [{"start": 0.0, "common_name": "Test Bird", "confidence": 0.9}]
    )
    assert out.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"
