import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

logger = logging.getLogger(__name__)

class AFISException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)

async def afis_exception_handler(request: Request, exc: AFISException) -> JSONResponse:
    logger.warning(f"AFISException on {request.url}: {exc.message}")
    return JSONResponse(status_code=exc.status_code,
        content={"success": False, "error": exc.message, "data": None})

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning(f"Validation error on {request.url}: {exc.errors()}")
    return JSONResponse(status_code=422,
        content={"success": False, "error": "Validation error", "data": exc.errors()})

async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Unhandled exception on {request.url}: {exc}")
    return JSONResponse(status_code=500,
        content={"success": False, "error": "Internal server error", "data": None})
