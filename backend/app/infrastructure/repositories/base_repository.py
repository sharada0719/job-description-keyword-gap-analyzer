"""
Generic async SQLAlchemy repository.
Concrete repositories extend this and add domain-specific queries.
"""
from typing import Generic, List, Optional, Type, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Provides standard CRUD operations for any SQLAlchemy model."""

    def __init__(self, model: Type[ModelType], db: AsyncSession) -> None:
        self.model = model
        self.db = db

    async def get_by_id(self, entity_id: int) -> Optional[ModelType]:
        result = await self.db.execute(
            select(self.model).where(self.model.id == entity_id)
        )
        return result.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        result = await self.db.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, instance: ModelType) -> ModelType:
        self.db.add(instance)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def update(self, instance: ModelType) -> ModelType:
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def delete(self, entity_id: int) -> bool:
        instance = await self.get_by_id(entity_id)
        if instance is None:
            return False
        await self.db.delete(instance)
        await self.db.flush()
        return True

    async def count(self) -> int:
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count()).select_from(self.model)
        )
        return result.scalar_one()
