"""
Application configuration using Pydantic BaseSettings.
All values are read from environment variables / .env file.
"""
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Application ──────────────────────────────────────────────
    APP_NAME: str = "Job Gap Analyzer"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # ── API ──────────────────────────────────────────────────────
    API_V1_PREFIX: str = "/api/v1"

    # ── Security ─────────────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database (SQLite) ─────────────────────────────────────────
    # Path to the SQLite file relative to the backend working directory.
    SQLITE_PATH: str = "./jobgap.db"

    @property
    def DATABASE_URL(self) -> str:
        """Async URL used by SQLAlchemy at runtime (aiosqlite driver)."""
        return f"sqlite+aiosqlite:///{self.SQLITE_PATH}"

    @property
    def SYNC_DATABASE_URL(self) -> str:
        """Sync URL used by Alembic migrations (built-in sqlite3 driver)."""
        return f"sqlite:///{self.SQLITE_PATH}"

    # ── CORS ─────────────────────────────────────────────────────
    # Accepts comma-separated string from .env: "http://a.com,http://b.com"
    # or a JSON array string: '["http://a.com"]'
    # Declared as str here; converted to List[str] by the validator below.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                import json
                parsed = json.loads(v)
                return ",".join(parsed)   # store back as CSV string
            return v
        return v

    @property
    def CORS_ORIGINS_LIST(self) -> list:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # ── File Upload ───────────────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = 5
    # Comma-separated string: "pdf,docx,doc"
    ALLOWED_EXTENSIONS: str = "pdf,docx,doc"

    @field_validator("ALLOWED_EXTENSIONS", mode="before")
    @classmethod
    def parse_extensions(cls, v):
        if isinstance(v, list):
            return ",".join(v)
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                import json
                return ",".join(json.loads(v))
            return v
        return v

    @property
    def ALLOWED_EXTENSIONS_LIST(self) -> list:
        return [e.strip() for e in self.ALLOWED_EXTENSIONS.split(",") if e.strip()]

    # ── NLP / AI ─────────────────────────────────────────────────
    SPACY_MODEL: str = "en_core_web_sm"
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"
    KEYBERT_TOP_N: int = 20
    # Min embedding similarity to count a keyword as a strong (semantic) match.
    SIMILARITY_THRESHOLD: float = 0.75
    # Min embedding similarity for the "uncertain" match band. Matches at or
    # above this value but below SIMILARITY_THRESHOLD are reported as uncertain
    # (half weight in the coverage score) rather than missing.
    UNCERTAIN_MATCH_MIN: float = 0.60
    # ATS compatibility threshold (0–1). The "ATS-friendly" success popup is
    # shown only when the ATS score meets or exceeds this value AND the
    # required parsing/compatibility checks pass. Single source of truth —
    # surfaced to the frontend via the analysis report, not hard-coded there.
    ATS_COMPATIBILITY_THRESHOLD: float = 0.80

    # ── Gemini AI (Cover Letter Generator) ────────────────────────────────
    # Required for the cover letter feature. Get a key at
    # https://aistudio.google.com/apikey
    GEMINI_API_KEY: str = ""
    # Gemini Flash model for fast, cost-effective text generation.
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # ── Email / SMTP (Forgot Password) ───────────────────────────────────
    # Set these to enable the Forgot Password email feature.
    # If SMTP_HOST is empty, the backend returns 503 instead of sending email.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Job Description Keyword Gap Analyzer"
    SMTP_TLS: bool = True
    # How long (minutes) a password-reset token is valid.
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30
    # Frontend base URL — used to build the reset link in the email.
    FRONTEND_BASE_URL: str = "http://localhost:5173"

    # ── Logging ───────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_DIR: str = "logs"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
