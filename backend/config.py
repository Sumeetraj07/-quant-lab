"""
QuantLab Application Configuration
=====================================
All settings are read from environment variables (12-factor app).
Never hardcode secrets — read from .env or shell environment.

Pydantic-settings automatically loads from:
  1. Shell environment variables (highest priority)
  2. .env file in the project root

Usage:
    from backend.config import settings
    db_url = settings.database_url
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application-wide settings.
    All values can be overridden by environment variables.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore unknown env vars
    )

    # -------------------------------------------------------------------------
    # App metadata
    # -------------------------------------------------------------------------
    app_name: str = Field(default="QuantLab", description="Application name")
    app_version: str = Field(default="0.1.0")
    environment: Literal["development", "production", "test"] = Field(
        default="development"
    )
    debug: bool = Field(default=True)
    log_level: str = Field(default="INFO")

    # -------------------------------------------------------------------------
    # API
    # -------------------------------------------------------------------------
    api_prefix: str = Field(default="/api/v1")
    allowed_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"]
    )

    # -------------------------------------------------------------------------
    # Security / Auth
    # -------------------------------------------------------------------------
    secret_key: str = Field(
        default="CHANGE-ME-IN-PRODUCTION-use-openssl-rand-hex-32",
        description="JWT signing secret — MUST be overridden in production",
    )
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60 * 8)  # 8 hours

    # -------------------------------------------------------------------------
    # Database
    # -------------------------------------------------------------------------
    postgres_user: str = Field(default="quantlab")
    postgres_password: str = Field(default="quantlab_dev_password")
    postgres_host: str = Field(default="localhost")
    postgres_port: int = Field(default=5432)
    postgres_db: str = Field(default="quantlab")

    @property
    def database_url(self) -> str:
        """Synchronous SQLAlchemy URL (for Alembic migrations)."""
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def async_database_url(self) -> str:
        """Async SQLAlchemy URL (for FastAPI/asyncpg)."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # -------------------------------------------------------------------------
    # Redis / Celery
    # -------------------------------------------------------------------------
    redis_host: str = Field(default="localhost")
    redis_port: int = Field(default=6379)
    redis_db: int = Field(default=0)

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @property
    def celery_broker_url(self) -> str:
        return self.redis_url

    @property
    def celery_result_backend(self) -> str:
        return self.redis_url

    # -------------------------------------------------------------------------
    # Data Providers
    # -------------------------------------------------------------------------
    alpha_vantage_api_key: str = Field(
        default="",
        description="Alpha Vantage API key — never hardcode",
    )

    # -------------------------------------------------------------------------
    # Rate Limiting
    # -------------------------------------------------------------------------
    rate_limit_per_minute: int = Field(default=60)
    alpha_vantage_calls_per_day: int = Field(default=25)  # Free tier limit

    # -------------------------------------------------------------------------
    # Backtest constraints
    # -------------------------------------------------------------------------
    max_backtest_symbols: int = Field(default=10)
    max_backtest_years: int = Field(default=20)
    max_concurrent_backtests: int = Field(default=4)

    # -------------------------------------------------------------------------
    # Validators
    # -------------------------------------------------------------------------
    @field_validator("environment", mode="before")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        allowed = {"development", "production", "test"}
        if v.lower() not in allowed:
            raise ValueError(f"environment must be one of {allowed}")
        return v.lower()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return cached Settings instance.
    Use this everywhere instead of constructing Settings() directly.

    The @lru_cache ensures we only read the .env file once.
    In tests, call get_settings.cache_clear() to reset.
    """
    return Settings()


# Module-level singleton for import convenience
settings = get_settings()
