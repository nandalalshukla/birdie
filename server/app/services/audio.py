"""Audio decoding and preprocessing for BirdNET."""

import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np


class AudioError(ValueError):
    """The uploaded file could not be decoded or is unusable."""


@dataclass(frozen=True)
class Audio:
    samples: np.ndarray  # mono float32 in [-1, 1]
    sample_rate: int

    @property
    def duration(self) -> float:
        return len(self.samples) / self.sample_rate


def _decode_with_ffmpeg(path: str | Path, sample_rate: int) -> np.ndarray:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise AudioError("ffmpeg is required to decode compressed audio (m4a/webm/…)")
    proc = subprocess.run(
        [ffmpeg, "-nostdin", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sample_rate), "-f", "f32le", "-"],
        capture_output=True,
        timeout=60,
    )
    if proc.returncode != 0:
        raise AudioError(f"Could not decode audio: {proc.stderr.decode(errors='ignore').strip()[:200]}")
    return np.frombuffer(proc.stdout, dtype=np.float32)


def load_audio(path: str | Path, sample_rate: int = 48_000) -> Audio:
    """Decode any supported container (m4a/webm/wav/…) to mono float32 at `sample_rate`.

    Uncompressed formats go through soundfile + soxr resampling (via librosa);
    compressed formats phones record (AAC in m4a, Opus in webm) through ffmpeg.
    """
    try:
        y, _ = librosa.load(str(path), sr=sample_rate, mono=True, res_type="soxr_hq")
    except Exception:
        y = _decode_with_ffmpeg(path, sample_rate)
    if y.size == 0:
        raise AudioError("Recording is empty")
    y = np.nan_to_num(y.astype(np.float32, copy=False))
    return Audio(samples=y, sample_rate=sample_rate)


def validate_duration(audio: Audio, min_seconds: float, max_seconds: float) -> Audio:
    if audio.duration < min_seconds:
        raise AudioError(f"Recording is too short ({audio.duration:.1f}s); record at least {min_seconds:.0f}s")
    if audio.duration > max_seconds:
        # Keep the first max_seconds rather than failing: a slightly long clip is still useful.
        return Audio(audio.samples[: int(max_seconds * audio.sample_rate)], audio.sample_rate)
    return audio


@dataclass(frozen=True)
class Window:
    start: float
    end: float
    samples: np.ndarray


def split_windows(
    audio: Audio, window_seconds: float = 3.0, overlap_seconds: float = 0.0, min_tail_seconds: float = 1.5
) -> list[Window]:
    """Split into fixed-length windows (BirdNET expects exactly 3 s at 48 kHz).

    A trailing chunk shorter than `min_tail_seconds` is dropped; a longer one is zero-padded.
    """
    if overlap_seconds >= window_seconds:
        raise ValueError("overlap must be smaller than the window length")
    sr = audio.sample_rate
    size = int(window_seconds * sr)
    step = int((window_seconds - overlap_seconds) * sr)
    windows: list[Window] = []
    for offset in range(0, len(audio.samples), step):
        chunk = audio.samples[offset : offset + size]
        if len(chunk) < int(min_tail_seconds * sr):
            break
        if len(chunk) < size:
            chunk = np.pad(chunk, (0, size - len(chunk)))
        start = offset / sr
        windows.append(Window(start=round(start, 3), end=round(start + window_seconds, 3), samples=chunk))
    return windows
