import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.logging import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

from app.database import engine
from app.database import Base
from app.core.exceptions import (
    AFISException,
    afis_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)
from app.core.middleware import RequestLoggingMiddleware
from app.api.v1.router import api_router


def _bootstrap_directories() -> None:
    for directory in [
        settings.UPLOADS_DIR,
        settings.MODELS_DIR,
        settings.REPORTS_DIR,
        settings.LOGS_DIR,
    ]:
        directory.mkdir(parents=True, exist_ok=True)
    logger.info("Runtime directories verified.")


def _bootstrap_database() -> None:
    import app.models 
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema synchronized.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        f"┌─ Starting {settings.APP_NAME} v{settings.APP_VERSION} "
        f"[{settings.ENVIRONMENT}] ─────────────────────────────"
    )
    _bootstrap_directories()
    _bootstrap_database()
    logger.info("└─ Startup complete. API ready.")
    yield
    logger.info("Application shutdown initiated.")


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "AI-powered aviation incident analysis system. "
            "Accepts CSV uploads, performs ML-driven failure pattern clustering, "
            "severity prediction, and LLM root cause summarization."
        ),
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # ── Middleware (outermost registered = outermost executed) ────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Process-Time"],
    )
    app.add_middleware(RequestLoggingMiddleware)

    # ── Exception handlers ────────────────────────────────────────────
    app.add_exception_handler(AFISException, afis_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # ── Routes ────────────────────────────────────────────────────────
    app.include_router(api_router, prefix=settings.API_PREFIX)

    return app


app = create_application()
