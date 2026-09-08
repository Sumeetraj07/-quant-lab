"""
API Request & Response Schemas
================================
Pydantic models for all FastAPI request bodies and response payloads.

These are SEPARATE from both:
  - quant_engine/data/schemas.py (internal data representations)
  - backend/models.py (ORM database models)

They define what the API accepts and returns — the public contract.

Naming convention:
  *Request  — incoming request body
  *Response — outgoing response data
  *Summary  — lightweight list item (fewer fields)
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# =============================================================================
# Common
# =============================================================================

class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    timestamp: datetime


class PaginationMeta(BaseModel):
    total: int
    page: int
    per_page: int
    pages: int


# =============================================================================
# Auth
# =============================================================================

class UserRegisterRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    full_name: str = Field(default="", description="Display name")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid email address")
        return v.lower().strip()


class UserLoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# =============================================================================
# Market Data
# =============================================================================

class FetchDataRequest(BaseModel):
    symbol: str = Field(..., description="Ticker symbol (e.g. AAPL)")
    start_date: date = Field(..., description="Inclusive start date")
    end_date: date = Field(..., description="Inclusive end date")
    timeframe: str = Field(default="1d", description="Bar timeframe: 1d, 1h, 30m, 15m, 5m, 1m")
    adjusted: bool = Field(default=True, description="Use split/dividend adjusted prices")

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        v = v.upper().strip()
        if not v or len(v) > 10:
            raise ValueError("Symbol must be 1-10 characters")
        return v

    @field_validator("timeframe")
    @classmethod
    def validate_timeframe(cls, v: str) -> str:
        allowed = {"1d", "1h", "30m", "15m", "5m", "1m"}
        if v not in allowed:
            raise ValueError(f"timeframe must be one of {allowed}")
        return v


class OHLCVBarResponse(BaseModel):
    symbol: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    adjusted: bool
    timeframe: str


class FetchDataResponse(BaseModel):
    symbol: str
    timeframe: str
    start_date: date
    end_date: date
    bar_count: int
    bars: list[OHLCVBarResponse]
    warnings: list[str] = Field(default_factory=list)
    source: str = "alpha_vantage"
    fetched_at: datetime


class AvailableSymbolsResponse(BaseModel):
    symbols: list[str]
    count: int
    source: str


# =============================================================================
# Strategies
# =============================================================================

class StrategyInfo(BaseModel):
    id: str
    name: str
    description: str
    parameter_schema: dict[str, Any]


class StrategiesListResponse(BaseModel):
    strategies: list[StrategyInfo]
    count: int


# =============================================================================
# Experiments & Backtests
# =============================================================================

class CreateExperimentRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(default="")
    strategy_id: str = Field(..., description="Strategy identifier from /strategies")
    parameters: dict[str, Any] = Field(default_factory=dict)
    symbols: list[str] = Field(..., min_length=1, description="List of ticker symbols")
    start_date: date = Field(..., description="Backtest start date")
    end_date: date = Field(..., description="Backtest end date")
    timeframe: str = Field(default="1d")
    initial_capital: float = Field(default=100_000.0, gt=0)
    commission_rate: float = Field(default=0.001, ge=0, le=0.05)
    slippage_bps: float = Field(default=5.0, ge=0, le=100)
    spread_bps: float = Field(default=2.0, ge=0, le=50)
    position_sizing: str = Field(default="percentage_allocation")
    sizing_parameter: float = Field(default=0.95, gt=0)
    benchmark_symbol: str | None = Field(default=None)
    risk_free_rate: float = Field(default=0.0, ge=0, le=0.2)
    adjusted_prices: bool = Field(default=True)
    tags: list[str] = Field(default_factory=list)

    @field_validator("symbols")
    @classmethod
    def validate_symbols(cls, v: list[str]) -> list[str]:
        return [s.upper().strip() for s in v if s.strip()]

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def parse_date(cls, v: Any) -> date:
        if isinstance(v, str):
            return date.fromisoformat(v)
        return v


class ExperimentSummary(BaseModel):
    id: UUID
    name: str
    strategy_id: str
    status: str
    symbols: list[str]
    start_date: date
    end_date: date
    initial_capital: float
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class ExperimentDetailResponse(BaseModel):
    id: UUID
    name: str
    description: str
    strategy_id: str
    config: dict[str, Any]
    status: str
    tags: list[str]
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    error_message: str | None

    model_config = {"from_attributes": True}


class ExperimentsListResponse(BaseModel):
    experiments: list[ExperimentSummary]
    total: int
    page: int
    per_page: int


# =============================================================================
# Backtest Results
# =============================================================================

class PerformanceMetricsResponse(BaseModel):
    total_return: float
    cagr: float
    annualized_return: float
    annualized_volatility: float
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    max_drawdown: float
    max_drawdown_duration: int
    recovery_time: int | None
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    profit_factor: float
    avg_trade: float
    best_trade: float
    worst_trade: float
    avg_winning_trade: float
    avg_losing_trade: float
    turnover: float


class EquityCurvePoint(BaseModel):
    timestamp: str  # ISO 8601
    equity: float
    drawdown: float


class TradeResponse(BaseModel):
    trade_id: str
    symbol: str
    side: str
    entry_time: str
    exit_time: str
    quantity: float
    entry_price: float
    exit_price: float
    gross_pnl: float
    costs: float
    net_pnl: float
    return_pct: float
    strategy_id: str


class BacktestResultResponse(BaseModel):
    experiment_id: UUID
    metrics: PerformanceMetricsResponse
    benchmark_metrics: PerformanceMetricsResponse | None
    equity_curve: list[EquityCurvePoint]
    trades: list[TradeResponse]
    warnings: list[str]
    run_duration_seconds: float
    created_at: datetime

    model_config = {"from_attributes": True}


class BacktestResultSummary(BaseModel):
    experiment_id: UUID
    experiment_name: str
    strategy_id: str
    total_return: float | None
    cagr: float | None
    sharpe_ratio: float | None
    max_drawdown: float | None
    total_trades: int | None
    win_rate: float | None
    run_duration_seconds: float | None
    created_at: datetime


# =============================================================================
# Error responses
# =============================================================================

class ErrorResponse(BaseModel):
    detail: str
    error_code: str | None = None
    field: str | None = None  # For validation errors


class ValidationErrorResponse(BaseModel):
    detail: list[dict[str, Any]]
