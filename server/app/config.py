from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="BIRDEAR_", env_file=".env", extra="ignore")

    data_dir: Path = Path("./data")
    database_url: str | None = None

    classifier: Literal["birdnet", "mock"] = "birdnet"
    worker_threads: int = 2

    # BirdNET analyses 3 s windows at 48 kHz.
    sample_rate: int = 48_000
    window_seconds: float = 3.0
    window_overlap_seconds: float = 0.0
    min_confidence: float = 0.5
    # Per-window threshold: lower than the final one so aggregation has signal to work with.
    window_min_confidence: float = 0.1
    location_filter_threshold: float = 0.03

    max_upload_mb: int = 15
    min_duration_seconds: float = 3.0
    max_duration_seconds: float = 20.0

    cors_origins: list[str] = ["*"]
    species_info_timeout: float = 6.0
    species_info_ttl_days: int = 30
    # xeno-canto API v3 needs a (free) key. Without it we link to the website instead.
    xeno_canto_api_key: str | None = None
    user_agent: str = "BirdEar/0.1 (https://github.com/nandalalshukla/birdie)"

    @property
    def uploads_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def spectrograms_dir(self) -> Path:
        return self.data_dir / "spectrograms"

    @property
    def resolved_database_url(self) -> str:
        return self.database_url or f"sqlite:///{(self.data_dir / 'birdear.db').as_posix()}"

    def ensure_dirs(self) -> None:
        for d in (self.data_dir, self.uploads_dir, self.spectrograms_dir):
            d.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
