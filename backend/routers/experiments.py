"""
Experiments Router
==================
Endpoints for creating, running, and inspecting backtest experiments.
"""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.auth import get_current_user
from backend.config import settings
from backend.database import get_db
from backend.models import BacktestResult as DBBacktestResult, Experiment, User
from backend.schemas import (
    BacktestResultResponse,
    CreateExperimentRequest,
    EquityCurvePoint,
    ExperimentDetailResponse,
    ExperimentsListResponse,
    ExperimentSummary,
    PerformanceMetricsResponse,
    TradeResponse,
)
from quant_engine.backtest.engine import BacktestEngine
from quant_engine.data.loaders import DataLoader
from quant_engine.data.providers.alpha_vantage import AlphaVantageProvider
from quant_engine.domain import BacktestConfig, PositionSizingMethod
from quant_engine.strategies.registry import StrategyRegistry

router = APIRouter(prefix="/experiments", tags=["Experiments"])


@router.post("", response_model=ExperimentDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_experiment(
    req: CreateExperimentRequest,
    run_immediately: bool = Query(True, description="Run backtest synchronously"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new backtest experiment and optionally execute it immediately.
    """
    # 1. Validate strategy exists
    if req.strategy_id not in StrategyRegistry.list_names():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown strategy '{req.strategy_id}'. Available: {StrategyRegistry.list_names()}",
        )

    # 2. Build config dictionary for JSON storage
    config_dict = req.model_dump(mode="json")

    # 3. Create experiment ORM record
    experiment = Experiment(
        user_id=current_user.id,
        name=req.name,
        description=req.description,
        strategy_id=req.strategy_id,
        config=config_dict,
        status="pending",
        tags=req.tags,
    )
    db.add(experiment)
    await db.flush()
    await db.refresh(experiment)

    if run_immediately:
        await _execute_experiment(experiment, db)

    return experiment


@router.post("/{experiment_id}/run", response_model=ExperimentDetailResponse)
async def run_experiment(
    experiment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger execution of an existing experiment."""
    stmt = select(Experiment).where(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    experiment = result.scalar_one_or_none()

    if not experiment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")

    await _execute_experiment(experiment, db)
    return experiment


@router.get("", response_model=ExperimentsListResponse)
async def list_experiments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List experiments belonging to the current user."""
    offset = (page - 1) * per_page
    base_stmt = select(Experiment).where(Experiment.user_id == current_user.id)

    # Count total
    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    # Query items
    items_stmt = base_stmt.order_by(Experiment.created_at.desc()).offset(offset).limit(per_page)
    result = await db.execute(items_stmt)
    experiments = result.scalars().all()

    summaries = [
        ExperimentSummary(
            id=exp.id,
            name=exp.name,
            strategy_id=exp.strategy_id,
            status=exp.status,
            symbols=exp.config.get("symbols", []),
            start_date=exp.config.get("start_date"),
            end_date=exp.config.get("end_date"),
            initial_capital=exp.config.get("initial_capital", 100000.0),
            created_at=exp.created_at,
            completed_at=exp.completed_at,
        )
        for exp in experiments
    ]

    return ExperimentsListResponse(
        experiments=summaries,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{experiment_id}", response_model=ExperimentDetailResponse)
async def get_experiment(
    experiment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get experiment status and configuration details."""
    stmt = select(Experiment).where(
        Experiment.id == experiment_id,
        Experiment.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    experiment = result.scalar_one_or_none()

    if not experiment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")

    return experiment


@router.get("/{experiment_id}/results", response_model=BacktestResultResponse)
async def get_experiment_results(
    experiment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed backtest results for a completed experiment."""
    stmt = select(DBBacktestResult).join(Experiment).where(
        DBBacktestResult.experiment_id == experiment_id,
        Experiment.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    db_result = result.scalar_one_or_none()

    if not db_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Results not found for this experiment. Experiment may be pending or failed.",
        )

    # Format JSON to schema
    metrics_data = db_result.metrics_json
    metrics_resp = PerformanceMetricsResponse(**metrics_data)

    benchmark_resp = None
    if db_result.benchmark_metrics_json:
        benchmark_resp = PerformanceMetricsResponse(**db_result.benchmark_metrics_json)

    equity_curve = [
        EquityCurvePoint(timestamp=pt[0], equity=pt[1], drawdown=pt[2] if len(pt) > 2 else 0.0)
        for pt in db_result.equity_curve
    ]

    trades = [TradeResponse(**t) for t in db_result.trades]

    return BacktestResultResponse(
        experiment_id=db_result.experiment_id,
        metrics=metrics_resp,
        benchmark_metrics=benchmark_resp,
        equity_curve=equity_curve,
        trades=trades,
        warnings=db_result.warnings,
        run_duration_seconds=db_result.run_duration_seconds or 0.0,
        created_at=db_result.created_at,
    )


# -----------------------------------------------------------------------------
# Internal Helper Functions
# -----------------------------------------------------------------------------

async def _execute_experiment(experiment: Experiment, db: AsyncSession) -> None:
    """Run backtest pipeline for given experiment record and store results."""
    experiment.status = "running"
    experiment.started_at = datetime.now(timezone.utc)
    await db.flush()

    cfg = experiment.config
    try:
        provider = AlphaVantageProvider(api_key=settings.alpha_vantage_api_key)
        loader = DataLoader(provider=provider)
        symbols = cfg.get("symbols", ["AAPL"])
        symbol = symbols[0]  # Primary symbol

        # Parse dates if string
        start_date = cfg.get("start_date")
        if isinstance(start_date, str):
            from datetime import date
            start_date = date.fromisoformat(start_date)

        end_date = cfg.get("end_date")
        if isinstance(end_date, str):
            from datetime import date
            end_date = date.fromisoformat(end_date)

        bars = loader.load_daily(
            symbol=symbol,
            start=start_date,
            end=end_date,
            adjusted=cfg.get("adjusted_prices", True),
        )

        # Build Strategy
        strategy_id = experiment.strategy_id
        parameters = cfg.get("parameters", {})
        strategy = StrategyRegistry.create(strategy_id)

        # Build BacktestConfig domain model
        domain_config = BacktestConfig(
            strategy_id=strategy_id,
            parameters=parameters,
            symbols=symbols,
            start_date=bars[0].timestamp.date() if bars else start_date,
            end_date=bars[-1].timestamp.date() if bars else end_date,
            timeframe=cfg.get("timeframe", "1d"),
            initial_capital=cfg.get("initial_capital", 100000.0),
            commission_rate=cfg.get("commission_rate", 0.001),
            slippage_bps=cfg.get("slippage_bps", 5.0),
            spread_bps=cfg.get("spread_bps", 2.0),
            position_sizing=PositionSizingMethod(cfg.get("position_sizing", "percentage_allocation")),
            sizing_parameter=cfg.get("sizing_parameter", 0.95),
            risk_free_rate=cfg.get("risk_free_rate", 0.0),
        )

        # Run Engine
        engine = BacktestEngine()
        bt_result = engine.run(
            config=domain_config,
            strategy=strategy,
            bars=bars,
        )

        # Format metrics and equity curve
        metrics_dict = bt_result.metrics.to_dict()

        equity_pts = []
        for ts, eq in bt_result.equity_curve.items():
            dd = float(bt_result.drawdown_series.get(ts, 0.0))
            ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
            equity_pts.append([ts_str, float(eq), dd])

        trades_list = [t.to_dict() for t in bt_result.trades]

        # Save Result to DB
        db_result = DBBacktestResult(
            experiment_id=experiment.id,
            total_return=bt_result.metrics.total_return,
            cagr=bt_result.metrics.cagr,
            sharpe_ratio=bt_result.metrics.sharpe_ratio,
            sortino_ratio=bt_result.metrics.sortino_ratio,
            calmar_ratio=bt_result.metrics.calmar_ratio,
            max_drawdown=bt_result.metrics.max_drawdown,
            annualized_volatility=bt_result.metrics.annualized_volatility,
            total_trades=bt_result.metrics.total_trades,
            win_rate=bt_result.metrics.win_rate,
            profit_factor=bt_result.metrics.profit_factor,
            run_duration_seconds=bt_result.run_duration_seconds,
            metrics_json=metrics_dict,
            equity_curve=equity_pts,
            drawdown_series=[[ts.isoformat(), float(v)] for ts, v in bt_result.drawdown_series.items()],
            trades=trades_list,
            warnings=bt_result.warnings,
        )

        # Update experiment status
        experiment.status = "completed"
        experiment.completed_at = datetime.now(timezone.utc)
        db.add(db_result)
        await db.flush()

    except Exception as exc:
        experiment.status = "failed"
        experiment.completed_at = datetime.now(timezone.utc)
        experiment.error_message = str(exc)
        await db.flush()
        raise
