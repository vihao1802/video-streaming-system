from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")

class Response(BaseModel, Generic[T]):
    success: bool
    data: Optional[T]
    message: Optional[str]

    @classmethod
    def success(cls, data: Optional[T] = None, message: Optional[str] = None) -> "Response[T]":
        return cls(success=True, data=data, message=message)

    @classmethod
    def error(cls, message: Optional[str] = None) -> "Response[None]":
        return cls(success=False,  message=message)
