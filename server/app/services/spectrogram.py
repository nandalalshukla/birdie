"""Render a mel spectrogram of the recording, annotated with BirdNET's windows.

BirdNET itself turns each 3 s window into mel spectrograms (roughly 0–15 kHz),
so this is a fair picture of what the model "sees".
"""

from pathlib import Path

import librosa
import matplotlib

matplotlib.use("Agg")  # headless, thread-safe backend

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from app.services.audio import Audio  # noqa: E402

FMIN = 150
FMAX = 15_000


def mel_spectrogram_db(audio: Audio, n_mels: int = 128, hop_length: int = 512) -> np.ndarray:
    S = librosa.feature.melspectrogram(
        y=audio.samples, sr=audio.sample_rate, n_fft=2048, hop_length=hop_length, n_mels=n_mels, fmin=FMIN, fmax=FMAX
    )
    return librosa.power_to_db(S, ref=np.max, top_db=80)


def render_spectrogram(
    audio: Audio,
    out_path: str | Path,
    windows: list[dict] | None = None,
    window_seconds: float = 3.0,
    dark: bool = False,
) -> Path:
    """Save a PNG. `windows` are per-window detections ({start, common_name, confidence})."""
    import librosa.display

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    hop = 512
    S_db = mel_spectrogram_db(audio, hop_length=hop)

    width = max(8.0, audio.duration * 0.9)
    fig, ax = plt.subplots(figsize=(width, 3.6), dpi=110)
    try:
        bg = "#0E110F" if dark else "#FFFFFF"
        fg = "#EEF1EE" if dark else "#2B302C"
        fig.patch.set_facecolor(bg)
        ax.set_facecolor(bg)

        librosa.display.specshow(
            S_db, sr=audio.sample_rate, hop_length=hop, x_axis="time", y_axis="mel",
            fmin=FMIN, fmax=FMAX, cmap="magma", ax=ax,
        )

        # Mark each 3 s window and label it with the top detection.
        best: dict[float, dict] = {}
        for w in windows or []:
            if w["start"] not in best or w["confidence"] > best[w["start"]]["confidence"]:
                best[w["start"]] = w
        n_windows = int(np.ceil(audio.duration / window_seconds))
        for i in range(n_windows + 1):
            ax.axvline(i * window_seconds, color="white", alpha=0.35, linewidth=0.8, linestyle="--")
        for start, w in best.items():
            ax.text(
                start + 0.08, FMAX * 0.92, f"{w['common_name']}\n{w['confidence']:.0%}",
                color="white", fontsize=8, va="top", ha="left",
                bbox={"facecolor": "black", "alpha": 0.45, "pad": 2, "edgecolor": "none"},
            )

        ax.set_xlim(0, audio.duration)
        ax.set_xlabel("Time (s)", color=fg)
        ax.set_ylabel("Frequency (Hz)", color=fg)
        ax.tick_params(colors=fg, labelsize=8)
        for spine in ax.spines.values():
            spine.set_color(fg)
        fig.tight_layout()
        fig.savefig(out_path, format="png", facecolor=bg)
    finally:
        plt.close(fig)
    return out_path
