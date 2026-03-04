import logging
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = uuid.uuid4().hex[:8].upper()
        logger.info(f"[{request_id}] → {request.method} {request.url.path}")
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(f"[{request_id}] ← {response.status_code} {request.url.path} ({elapsed:.1f}ms)")
        return response
