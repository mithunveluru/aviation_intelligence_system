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
    # ABSOLUTE path — relative paths break on Render
    DATABASE_URL: str = "sqlite:////app/data/aviation.db"

    # ── LLM (Ollama) ──────────────────────────────────────────────
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
        "*",                        # allow all — tighten after deployment works
        "http://localhost:5173",
        "http://localhost:3000",
        "https://aviation-intelligence-system.vercel.app",
        "https://aviation-intelligence-system.onrender.com",
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
