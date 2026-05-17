from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")

class Response(BaseModel, Generic[T]):
    success: bool
    data: Optional[T]
    message: Optional[str]

    @classmethod
    def success(cls, message: Optional[str] = None, data: Optional[T] = None) -> "Response[T]":
        return cls(success=True, data=data, message=message)

    @classmethod
    def error(cls, message: Optional[str] = None) -> "Response[None]":
        return cls(success=False, data=None, message=message)
