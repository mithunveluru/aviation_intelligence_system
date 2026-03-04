from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")

class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    error: Optional[str] = None

class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: list[T] = []
    total: int = 0
    page: int = 1
    page_size: int = 12
    total_pages: int = 1
