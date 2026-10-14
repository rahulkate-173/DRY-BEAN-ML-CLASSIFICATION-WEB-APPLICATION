"""
Application configuration — reads from environment variables or .env file.
"""
from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # CORS
    # CORS
    frontend_origins: str = "http://localhost:5173,http://localhost:3000,https://dry-bean-ml-classification-web-appl.vercel.app"

    # Paths (relative to backend/ working directory)
    dataset_path: str = "../dataset/Dry_Bean_Dataset.xlsx"
    artifacts_dir: str = "artifacts"

    # Model metadata
    model_version: str = "1.0.0"

    @property
    def artifacts_path(self) -> Path:
        return Path(self.artifacts_dir)

    @property
    def dataset_file_path(self) -> Path:
        return Path(self.dataset_path)

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]


settings = Settings()
