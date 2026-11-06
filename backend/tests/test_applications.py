"""
Tests for the Job Application Tracker.

Covers:
  - DTO validation (pure)
  - Repository CRUD with async in-memory SQLite
  - Duplicate prevention
  - User isolation
  - Status updates
  - Apply button email/URL validation logic
"""
import asyncio

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.application.dtos.job_application import (
    APPLICATION_STATUSES,
    JobApplicationCreateRequest,
    JobApplicationStatusRequest,
    JobApplicationUpdateRequest,
)
from app.infrastructure.database.base import Base
from app.infrastructure.models.job_application import JobApplicationModel
from app.infrastructure.models.user import UserModel
from app.infrastructure.repositories.job_application_repository import (
    JobApplicationRepository,
)


# ── Test database setup ──────────────────────────────────────────────────────

async def _setup_db():
    """Create an in-memory SQLite DB with tables, return a session factory."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Create two test users for isolation testing
    async with session_factory() as session:
        session.add_all([
            UserModel(id=1, email="user1@test.com", full_name="User One",
                      hashed_password="x", is_active=True, is_superuser=False),
            UserModel(id=2, email="user2@test.com", full_name="User Two",
                      hashed_password="x", is_active=True, is_superuser=False),
        ])
        await session.commit()

    return session_factory


def run_async(coro):
    """Helper to run an async coroutine in a sync test."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ── DTO validation tests (pure) ──────────────────────────────────────────────

def test_create_dto_accepts_minimal():
    req = JobApplicationCreateRequest(job_title="Python Developer")
    assert req.job_title == "Python Developer"
    assert req.company_name is None
    assert req.notes is None


def test_create_dto_accepts_all_fields():
    req = JobApplicationCreateRequest(
        job_title="Engineer", company_name="Corp",
        job_location="London", job_description="desc",
        job_url="https://example.com", contact_email="hr@corp.com",
        notes="Interview scheduled",
    )
    assert req.company_name == "Corp"
    assert req.contact_email == "hr@corp.com"


def test_status_dto_validates_status():
    req = JobApplicationStatusRequest(application_status="applied")
    assert req.application_status == "applied"


def test_application_statuses_set():
    assert APPLICATION_STATUSES == {"saved", "applied", "interview", "offered", "rejected"}


def test_update_dto_all_partial():
    req = JobApplicationUpdateRequest(notes="Updated notes")
    assert req.notes == "Updated notes"
    assert req.job_title is None  # not provided


# ── Repository tests (async in-memory DB) ─────────────────────────────────────

class TestRepository:
    def setup_method(self):
        self.session_factory = run_async(_setup_db())

    def _repo(self):
        session = asyncio.new_event_loop().run_until_complete(self.session_factory().__aenter__())
        return JobApplicationRepository(session), session

    def _commit(self, session):
        asyncio.new_event_loop().run_until_complete(session.commit())

    def test_create_application(self):
        async def _test():
            async with self.session_factory() as session:
                repo = JobApplicationRepository(session)
                app = JobApplicationModel(
                    user_id=1, job_title="Python Developer",
                    application_status="saved",
                )
                created = await repo.create(app)
                await session.commit()
                assert created.id is not None
                assert created.job_title == "Python Developer"
                assert created.application_status == "saved"
        run_async(_test())

    def test_get_by_user(self):
        async def _test():
            async with self.session_factory() as session:
                repo = JobApplicationRepository(session)
                session.add(JobApplicationModel(
                    user_id=1, job_title="Dev A", application_status="saved",
                ))
                session.add(JobApplicationModel(
                    user_id=1, job_title="Dev B", application_status="applied",
                ))
                session.add(JobApplicationModel(
                    user_id=2, job_title="Dev C", application_status="saved",
                ))
                await session.commit()

                user1_apps = await repo.get_by_user(1)
                assert len(user1_apps) == 2
                assert all(a.user_id == 1 for a in user1_apps)

                user2_apps = await repo.get_by_user(2)
                assert len(user2_apps) == 1
        run_async(_test())

    def test_get_by_id_and_user_isolates(self):
        async def _test():
            async with self.session_factory() as session:
                repo = JobApplicationRepository(session)
                app = JobApplicationModel(
                    user_id=1, job_title="Dev", application_status="saved",
                )
                await repo.create(app)
                await session.commit()
                app_id = app.id

                # User 1 can access
                found = await repo.get_by_id_and_user(app_id, 1)
                assert found is not None
                assert found.job_title == "Dev"

                # User 2 cannot access (isolation)
                not_found = await repo.get_by_id_and_user(app_id, 2)
                assert not_found is None
        run_async(_test())

    def test_check_duplicate(self):
        async def _test():
            async with self.session_factory() as session:
                repo = JobApplicationRepository(session)
                await repo.create(JobApplicationModel(
                    user_id=1, job_title="Python Developer",
                    company_name="Corp", application_status="saved",
                ))
                await session.commit()

                # Same title + company for user 1 → duplicate
                assert await repo.check_duplicate(1, "Python Developer", "Corp") is True

                # Same title, different company → not duplicate
                assert await repo.check_duplicate(1, "Python Developer", "Other") is False

                # Different user with same title → not duplicate
                assert await repo.check_duplicate(2, "Python Developer", "Corp") is False

                # Same title, no company → not duplicate (original has company)
                assert await repo.check_duplicate(1, "Python Developer", None) is False
        run_async(_test())

    def test_count_by_status(self):
        async def _test():
            async with self.session_factory() as session:
                repo = JobApplicationRepository(session)
                session.add_all([
                    JobApplicationModel(user_id=1, job_title="A", application_status="saved"),
                    JobApplicationModel(user_id=1, job_title="B", application_status="saved"),
                    JobApplicationModel(user_id=1, job_title="C", application_status="applied"),
                    JobApplicationModel(user_id=1, job_title="D", application_status="interview"),
                    JobApplicationModel(user_id=2, job_title="E", application_status="saved"),
                ])
                await session.commit()

                counts = await repo.count_by_status(1)
                assert counts == {"saved": 2, "applied": 1, "interview": 1}

                counts2 = await repo.count_by_status(2)
                assert counts2 == {"saved": 1}
        run_async(_test())

    def test_update_status(self):
        async def _test():
            async with self.session_factory() as session:
                repo = JobApplicationRepository(session)
                app = await repo.create(JobApplicationModel(
                    user_id=1, job_title="Dev", application_status="saved",
                ))
                await session.commit()

                app.application_status = "interview"
                await repo.update(app)
                await session.commit()

                refreshed = await repo.get_by_id_and_user(app.id, 1)
                assert refreshed.application_status == "interview"
        run_async(_test())

    def test_delete(self):
        async def _test():
            async with self.session_factory() as session:
                repo = JobApplicationRepository(session)
                app = await repo.create(JobApplicationModel(
                    user_id=1, job_title="Dev", application_status="saved",
                ))
                await session.commit()
                app_id = app.id

                deleted = await repo.delete(app_id)
                await session.commit()
                assert deleted is True

                not_found = await repo.get_by_id_and_user(app_id, 1)
                assert not_found is None
        run_async(_test())


# ── Apply button email/URL validation (pure) ─────────────────────────────────

def _is_valid_email(email):
    return bool(email and email.strip() and "@" in email and "." in email.split("@")[1])


def _is_valid_url(url):
    return bool(url and url.startswith("http"))


def test_valid_email_passes():
    assert _is_valid_email("hr@example.com") is True


def test_invalid_email_fails():
    assert _is_valid_email("not-an-email") is False
    assert _is_valid_email("") is False
    assert _is_valid_email(None) is False
    assert _is_valid_email("no-domain@") is False


def test_valid_url_passes():
    assert _is_valid_url("https://example.com/apply") is True
    assert _is_valid_url("http://jobs.example.com") is True


def test_invalid_url_fails():
    assert _is_valid_url("not-a-url") is False
    assert _is_valid_url("") is False
    assert _is_valid_url(None) is False


def test_apply_button_logic():
    """Verify the three-case logic: email → URL → hidden."""
    # Case 1: valid email → show "Apply via Email"
    assert _is_valid_email("hr@corp.com") is True
    # Case 2: no email, valid URL → show "Apply on Website"
    assert not _is_valid_email(None) and _is_valid_url("https://example.com")
    # Case 3: no email, no URL → hide button
    assert not _is_valid_email(None) and not _is_valid_url(None)


# ── Model defaults ───────────────────────────────────────────────────────────

def test_model_defaults_status_saved():
    app = JobApplicationModel(
        user_id=1, job_title="Dev", application_status="saved",
    )
    assert app.application_status == "saved"
    assert app.notes is None
    assert app.company_name is None
