"""
ORM Models
===========
SQLAlchemy models for all QuantLab database tables.

Tables:
  users              — Registered user accounts
  api_keys           — Alpha Vantage and other API keys per user
  market_data        — Cached OHLCV bars (to avoid re-fetching)
  datasets           — Dataset metadata records (for reproducibility)
  strategies         — Saved strategy configurations
  experiments        — Backtest experiment records
  backtest_results   — Results of completed backtest runs
  portfolio_snapshots — Per-bar portfolio equity snapshots
  trades             — Closed round-trip trade records

Design conventions:
  - All IDs are UUIDs (uuid_generate_v4())
  - All timestamps are UTC
  - Soft-delete on users (is_active flag)
  - Results stored as JSONB for flexibility
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UUID,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB

JSON_TYPE = JSON().with_variant(JSONB, "postgresql")
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# =============================================================================
# Users
# =============================================================================
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    # Relationships
    experiments: Mapped[list["Experiment"]] = relationship(
        "Experiment", back_populates="user", cascade="all, delete-orphan"
    )
    api_keys: Mapped[list["ApiKey"]] = relationship(
        "ApiKey", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User email={self.email} active={self.is_active}>"


# =============================================================================
# API Keys (per user, encrypted at rest in production)
# =============================================================================
class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g. "alpha_vantage"
    key_hint: Mapped[str] = mapped_column(String(8), nullable=False)   # Last 4 chars of key
    encrypted_key: Mapped[str] = mapped_column(Text, nullable=False)   # Encrypted value
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    user: Mapped["User"] = relationship("User", back_populates="api_keys")

    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_provider_key"),
    )


# =============================================================================
# Market Data (cached OHLCV bars)
# =============================================================================
class MarketData(Base):
    """
    Cached OHLCV bars to avoid re-fetching from providers.
    Index on (symbol, timeframe, timestamp) for fast range queries.
    """

    __tablename__ = "market_data"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    timeframe: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    open: Mapped[float] = mapped_column(Float, nullable=False)
    high: Mapped[float] = mapped_column(Float, nullable=False)
    low: Mapped[float] = mapped_column(Float, nullable=False)
    close: Mapped[float] = mapped_column(Float, nullable=False)
    volume: Mapped[int] = mapped_column(BigInteger, nullable=False)
    adjusted: Mapped[bool] = mapped_column(Boolean, default=True)
    source: Mapped[str] = mapped_column(String(64), nullable=False, default="alpha_vantage")
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    __table_args__ = (
        UniqueConstraint(
            "symbol", "timestamp", "timeframe", "adjusted",
            name="uq_market_data_symbol_ts_tf_adj"
        ),
    )

    def __repr__(self) -> str:
        return f"<MarketData {self.symbol} {self.timeframe} {self.timestamp.date()}>"


# =============================================================================
# Experiments
# =============================================================================
class Experiment(Base):
    """
    A single backtest experiment record.
    Contains the full config (as JSONB) for reproducibility.
    """

    __tablename__ = "experiments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    strategy_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    config: Mapped[dict] = mapped_column(JSON_TYPE, nullable=False)  # BacktestConfig.to_dict()
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending", index=True
    )
    # status: pending | running | completed | failed | cancelled
    tags: Mapped[list] = mapped_column(JSON_TYPE, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="experiments")
    result: Mapped["BacktestResult | None"] = relationship(
        "BacktestResult", back_populates="experiment", uselist=False,
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Experiment {self.name} strategy={self.strategy_id} status={self.status}>"


# =============================================================================
# Backtest Results
# =============================================================================
class BacktestResult(Base):
    """
    Stores the performance metrics and equity curve of a completed backtest.
    Linked 1-to-1 with an Experiment.
    """

    __tablename__ = "backtest_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    experiment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("experiments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Summary metrics (stored flat for fast querying)
    total_return: Mapped[float | None] = mapped_column(Float, nullable=True)
    cagr: Mapped[float | None] = mapped_column(Float, nullable=True)
    sharpe_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    sortino_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    calmar_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_drawdown: Mapped[float | None] = mapped_column(Float, nullable=True)
    annualized_volatility: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_trades: Mapped[int | None] = mapped_column(Integer, nullable=True)
    win_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    profit_factor: Mapped[float | None] = mapped_column(Float, nullable=True)
    run_duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Full metrics JSON (for dashboard charts)
    metrics_json: Mapped[dict] = mapped_column(JSON_TYPE, nullable=False, default=dict)

    # Equity curve as JSON list of [timestamp_iso, equity_value] pairs
    equity_curve: Mapped[list] = mapped_column(JSON_TYPE, nullable=False, default=list)
    drawdown_series: Mapped[list] = mapped_column(JSON_TYPE, nullable=False, default=list)

    # Portfolio snapshots (sampled, not all bars)
    portfolio_snapshots: Mapped[list] = mapped_column(JSON_TYPE, nullable=False, default=list)

    # Trade list
    trades: Mapped[list] = mapped_column(JSON_TYPE, nullable=False, default=list)

    # Benchmark comparison
    benchmark_metrics_json: Mapped[dict | None] = mapped_column(JSON_TYPE, nullable=True)
    benchmark_equity_curve: Mapped[list | None] = mapped_column(JSON_TYPE, nullable=True)

    # Warnings
    warnings: Mapped[list] = mapped_column(JSON_TYPE, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    experiment: Mapped["Experiment"] = relationship(
        "Experiment", back_populates="result"
    )

    def __repr__(self) -> str:
        return (
            f"<BacktestResult exp={self.experiment_id} "
            f"return={self.total_return:.2%} sharpe={self.sharpe_ratio:.2f}>"
        )
