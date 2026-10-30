import shutil
import uuid
from pathlib import Path
from typing import BinaryIO

ALLOWED_EXTENSIONS = {".m4a", ".mp4", ".aac", ".wav", ".webm", ".ogg", ".mp3", ".3gp", ".caf", ".flac"}


class UploadTooLarge(Exception):
    pass


def save_upload(src: BinaryIO, filename: str | None, dest_dir: Path, max_bytes: int) -> Path:
    """Stream an uploaded file to disk under a random name, enforcing a size cap."""
    ext = Path(filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".bin"  # let the decoder sniff the container
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{uuid.uuid4().hex}{ext}"

    written = 0
    with dest.open("wb") as out:
        while chunk := src.read(1024 * 256):
            written += len(chunk)
            if written > max_bytes:
                out.close()
                dest.unlink(missing_ok=True)
                raise UploadTooLarge
            out.write(chunk)
    return dest


def remove_quietly(path: str | Path | None) -> None:
    if path:
        p = Path(path)
        if p.is_dir():
            shutil.rmtree(p, ignore_errors=True)
        else:
            p.unlink(missing_ok=True)
