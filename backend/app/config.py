from functools import lru_cache
from pathlib import Path
from typing import Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Application ───────────────────────────────────────────────
    APP_NAME: str = "Aviation Failure Intelligence System"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # ── Server ────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 10000
    WORKERS: int = 1

    # ── Paths ─────────────────────────────────────────────────────
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = Path("/app/data")
    UPLOADS_DIR: Path = Path("/app/data/uploads")
    MODELS_DIR: Path = Path("/app/data/models")
    REPORTS_DIR: Path = Path("/app/data/reports")
    LOGS_DIR: Path = Path("/app/logs")

    # ── Database ──────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:////app/data/aviation.db"

    # ── LLM ───────────────────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "mistral"
    OLLAMA_TIMEOUT: int = 120
    GROQ_API_KEY: str = ""

    # ── ML Pipeline ───────────────────────────────────────────────
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    HDBSCAN_MIN_CLUSTER_SIZE: int = 15
    HDBSCAN_MIN_SAMPLES: int = 5
    RF_N_ESTIMATORS: int = 200
    RF_RANDOM_STATE: int = 42
    TEST_SIZE: float = 0.2

    # ── CORS ──────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "*",
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            # Handle plain wildcard or comma-separated
            if v == "*":
                return ["*"]
            # Try JSON array first
            try:
                import json
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
            # Fall back to comma-separated
            return [o.strip() for o in v.split(",") if o.strip()]
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
