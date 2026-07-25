"""
Abstract repository interfaces.
All concrete repositories must implement these contracts.
Keeps the application layer decoupled from SQLAlchemy.
"""
from abc import ABC, abstractmethod
from typing import Generic, List, Optional, TypeVar

T = TypeVar("T")


class IRepository(ABC, Generic[T]):
    """Generic CRUD repository interface."""

    @abstractmethod
    async def get_by_id(self, entity_id: int) -> Optional[T]:
        ...

    @abstractmethod
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        ...

    @abstractmethod
    async def create(self, entity: T) -> T:
        ...

    @abstractmethod
    async def update(self, entity: T) -> T:
        ...

    @abstractmethod
    async def delete(self, entity_id: int) -> bool:
        ...
