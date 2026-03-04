from functools import lru_cache
from pathlib import Path
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
    PORT: int = 8000
    # SQLite does not support concurrent writes.
    # Keep workers=1 unless migrating to PostgreSQL.
    WORKERS: int = 1

    # ── Paths ─────────────────────────────────────────────────────
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOADS_DIR: Path = BASE_DIR / "data" / "uploads"
    MODELS_DIR: Path = BASE_DIR / "data" / "models"
    REPORTS_DIR: Path = BASE_DIR / "data" / "reports"
    LOGS_DIR: Path = BASE_DIR / "logs"

    # ── Database ──────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./data/aviation.db"

    # ── LLM (Ollama) ──────────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "mistral"
    OLLAMA_TIMEOUT: int = 120          # LLM calls are slow; be generous
    GOOGLE_API_KEY: str = "AIzaSyB7wPF-hLbv2ZLHZBLXeqVvG18dFxDNFMU"
    GROQ_API_KEY: str = "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"


    # ── ML Pipeline ───────────────────────────────────────────────
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    HDBSCAN_MIN_CLUSTER_SIZE: int = 15
    HDBSCAN_MIN_SAMPLES: int = 5
    RF_N_ESTIMATORS: int = 200
    RF_RANDOM_STATE: int = 42
    TEST_SIZE: float = 0.2

    # ── CORS ──────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",
    ]

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
