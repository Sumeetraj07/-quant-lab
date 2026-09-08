"""
Performance Metrics Calculator
================================
Computes all performance statistics from an equity curve and trade list.

All metrics are computed from actual backtest data — never estimated or invented.

Annualization convention: 252 trading days per year.

Metric definitions:
  CAGR            = (ending_value / starting_value) ^ (1/years) - 1
  Sharpe          = (mean_daily_return - risk_free_daily) / std(daily_returns) * sqrt(252)
  Sortino         = (mean_daily_return - risk_free_daily) / std(negative_returns) * sqrt(252)
  Calmar          = CAGR / abs(max_drawdown)
  Max Drawdown    = max( (peak - trough) / peak ) over all periods
  Profit Factor   = sum(winning_trades) / abs(sum(losing_trades))
"""

from __future__ import annotations

import math
import logging
from typing import Sequence

import numpy as np
import pandas as pd

from quant_engine.domain import PerformanceMetrics, Trade

logger = logging.getLogger(__name__)

TRADING_DAYS_PER_YEAR = 252


def calculate_performance_metrics(
    equity_curve: pd.Series,
    trades: list[Trade],
    initial_capital: float,
    risk_free_rate: float = 0.0,
) -> PerformanceMetrics:
    """
    Compute full performance metrics from equity curve and trade list.

    Args:
        equity_curve:    DatetimeIndex → portfolio equity value
        trades:          List of closed Trade objects
        initial_capital: Starting portfolio value
        risk_free_rate:  Annual risk-free rate (e.g. 0.05 = 5%)

    Returns:
        PerformanceMetrics with all computed statistics.
    """
    if equity_curve.empty:
        return _empty_metrics()

    if len(equity_curve) < 2:
        return _empty_metrics()

    # --- Returns ---
    daily_returns = equity_curve.pct_change().dropna()

    # Total return
    start_value = float(equity_curve.iloc[0])
    end_value = float(equity_curve.iloc[-1])
    total_return = (end_value / start_value) - 1.0 if start_value > 0 else 0.0

    # CAGR
    years = _years_from_series(equity_curve)
    if years > 0 and start_value > 0 and end_value > 0:
        cagr = (end_value / start_value) ** (1.0 / years) - 1.0
    else:
        cagr = 0.0

    # Annualized metrics
    mean_daily = float(daily_returns.mean()) if not daily_returns.empty else 0.0
    std_daily = float(daily_returns.std()) if not daily_returns.empty else 0.0
    annualized_vol = std_daily * math.sqrt(TRADING_DAYS_PER_YEAR)

    # Risk-free rate conversion to daily
    daily_rf = (1 + risk_free_rate) ** (1 / TRADING_DAYS_PER_YEAR) - 1

    # Sharpe Ratio
    if std_daily > 0:
        sharpe = (mean_daily - daily_rf) / std_daily * math.sqrt(TRADING_DAYS_PER_YEAR)
    else:
        sharpe = 0.0

    # Sortino Ratio
    negative_returns = daily_returns[daily_returns < daily_rf]
    if len(negative_returns) > 1:
        downside_std = float(negative_returns.std()) * math.sqrt(TRADING_DAYS_PER_YEAR)
        sortino = (cagr - risk_free_rate) / downside_std if downside_std > 0 else 0.0
    else:
        sortino = 0.0

    # --- Drawdown ---
    running_max = equity_curve.cummax()
    drawdown_series = (equity_curve - running_max) / running_max
    max_drawdown = float(drawdown_series.min()) if not drawdown_series.empty else 0.0

    # Drawdown duration and recovery
    dd_duration, recovery_time = _calculate_drawdown_duration(equity_curve, drawdown_series)

    # Calmar Ratio
    if abs(max_drawdown) > 1e-9:
        calmar = cagr / abs(max_drawdown)
    else:
        calmar = 0.0

    # --- Trade statistics ---
    total_trades = len(trades)
    if total_trades > 0:
        winning = [t for t in trades if t.net_pnl > 0]
        losing = [t for t in trades if t.net_pnl <= 0]
        win_rate = len(winning) / total_trades
        avg_trade = sum(t.net_pnl for t in trades) / total_trades
        best_trade = max((t.net_pnl for t in trades), default=0.0)
        worst_trade = min((t.net_pnl for t in trades), default=0.0)
        avg_winning = sum(t.net_pnl for t in winning) / len(winning) if winning else 0.0
        avg_losing = sum(t.net_pnl for t in losing) / len(losing) if losing else 0.0

        gross_profit = sum(t.net_pnl for t in winning)
        gross_loss = abs(sum(t.net_pnl for t in losing))
        profit_factor = gross_profit / gross_loss if gross_loss > 1e-9 else float("inf")
    else:
        win_rate = 0.0
        avg_trade = 0.0
        best_trade = 0.0
        worst_trade = 0.0
        avg_winning = 0.0
        avg_losing = 0.0
        profit_factor = 0.0

    # --- Turnover (simplified) ---
    # Estimated as total trade value / average equity
    if total_trades > 0 and len(equity_curve) > 0:
        avg_equity = float(equity_curve.mean())
        total_trade_value = sum(
            t.quantity * ((t.entry_price + t.exit_price) / 2)
            for t in trades
            if t.entry_price > 0
        )
        turnover = (total_trade_value / avg_equity) / max(years, 1.0) if avg_equity > 0 else 0.0
    else:
        turnover = 0.0

    # --- Time series returns ---
    monthly_returns = _to_monthly_returns(daily_returns)
    yearly_returns = _to_yearly_returns(daily_returns)

    return PerformanceMetrics(
        total_return=total_return,
        cagr=cagr,
        annualized_return=cagr,
        annualized_volatility=annualized_vol,
        sharpe_ratio=sharpe,
        sortino_ratio=sortino,
        calmar_ratio=calmar,
        max_drawdown=max_drawdown,
        max_drawdown_duration=dd_duration,
        recovery_time=recovery_time,
        total_trades=total_trades,
        winning_trades=len([t for t in trades if t.net_pnl > 0]),
        losing_trades=len([t for t in trades if t.net_pnl <= 0]),
        win_rate=win_rate,
        profit_factor=profit_factor,
        avg_trade=avg_trade,
        best_trade=best_trade,
        worst_trade=worst_trade,
        avg_winning_trade=avg_winning,
        avg_losing_trade=avg_losing,
        turnover=turnover,
        daily_returns=daily_returns,
        monthly_returns=monthly_returns,
        yearly_returns=yearly_returns,
    )


def calculate_drawdown_series(equity_curve: pd.Series) -> pd.Series:
    """
    Compute the drawdown series from an equity curve.

    Args:
        equity_curve: DatetimeIndex → portfolio equity

    Returns:
        Series of drawdown fractions (0.0 to -1.0)
    """
    running_max = equity_curve.cummax()
    drawdown = (equity_curve - running_max) / running_max
    drawdown.name = "drawdown"
    return drawdown


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _years_from_series(series: pd.Series) -> float:
    """Calculate the number of years covered by a DatetimeIndex series."""
    if len(series) < 2:
        return 0.0
    start = series.index[0]
    end = series.index[-1]
    delta = end - start
    return delta.days / 365.25


def _calculate_drawdown_duration(
    equity_curve: pd.Series,
    drawdown_series: pd.Series,
) -> tuple[int, int | None]:
    """
    Calculate the duration of the maximum drawdown and recovery time.

    Returns:
        (max_drawdown_duration_days, recovery_days)
        recovery_days is None if the drawdown was never recovered.
    """
    if drawdown_series.empty or drawdown_series.min() >= 0:
        return 0, 0

    # Find peak before max drawdown
    max_dd_idx = drawdown_series.idxmin()
    peak_idx = equity_curve[:max_dd_idx].idxmax()

    # Duration from peak to trough
    duration_days = (max_dd_idx - peak_idx).days

    # Recovery: first time equity exceeds the peak value after trough
    peak_value = float(equity_curve[peak_idx])
    post_trough = equity_curve[max_dd_idx:]
    recovered = post_trough[post_trough >= peak_value]

    if not recovered.empty:
        recovery_date = recovered.index[0]
        recovery_days = (recovery_date - max_dd_idx).days
    else:
        recovery_days = None  # Still in drawdown at end of data

    return duration_days, recovery_days


def _to_monthly_returns(daily_returns: pd.Series) -> pd.Series | None:
    """Resample daily returns to monthly cumulative returns."""
    if daily_returns.empty:
        return None
    try:
        monthly = (1 + daily_returns).resample("ME").prod() - 1
        return monthly
    except Exception:
        return None


def _to_yearly_returns(daily_returns: pd.Series) -> pd.Series | None:
    """Resample daily returns to yearly cumulative returns."""
    if daily_returns.empty:
        return None
    try:
        yearly = (1 + daily_returns).resample("YE").prod() - 1
        return yearly
    except Exception:
        return None


def _empty_metrics() -> PerformanceMetrics:
    """Return zero-value metrics when there's insufficient data."""
    return PerformanceMetrics(
        total_return=0.0,
        cagr=0.0,
        annualized_return=0.0,
        annualized_volatility=0.0,
        sharpe_ratio=0.0,
        sortino_ratio=0.0,
        calmar_ratio=0.0,
        max_drawdown=0.0,
        max_drawdown_duration=0,
        recovery_time=None,
        total_trades=0,
        winning_trades=0,
        losing_trades=0,
        win_rate=0.0,
        profit_factor=0.0,
        avg_trade=0.0,
        best_trade=0.0,
        worst_trade=0.0,
        avg_winning_trade=0.0,
        avg_losing_trade=0.0,
        turnover=0.0,
    )
