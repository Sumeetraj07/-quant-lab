"""
Performance Metrics Tests
==========================
Verifies that all performance metrics are computed correctly
against known synthetic data.

Reference calculations are manual — every expected value
is derived independently to catch bugs in the metric engine.
"""

from __future__ import annotations

import math
import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta

from quant_engine.domain import OrderSide, Trade
from quant_engine.metrics.performance import calculate_performance_metrics


def make_trade(
    net_pnl: float,
    gross_pnl: float | None = None,
    entry_price: float = 100.0,
    exit_price: float | None = None,
    quantity: float = 100.0,
    symbol: str = "TEST",
) -> Trade:
    import uuid
    if gross_pnl is None:
        gross_pnl = net_pnl
    if exit_price is None:
        exit_price = entry_price + (net_pnl / quantity) if quantity > 0 else entry_price
    return Trade(
        trade_id=str(uuid.uuid4()),
        symbol=symbol,
        side=OrderSide.BUY,
        entry_time=datetime(2020, 1, 1, tzinfo=timezone.utc),
        exit_time=datetime(2020, 6, 1, tzinfo=timezone.utc),
        quantity=quantity,
        entry_price=entry_price,
        exit_price=exit_price,
        gross_pnl=gross_pnl,
        costs=abs(gross_pnl - net_pnl),
    )


def flat_equity_curve(start_value: float = 100_000, n: int = 252) -> pd.Series:
    """Equity curve that never moves — all metrics should be near zero."""
    ts = pd.date_range("2020-01-01", periods=n, freq="B", tz="UTC")
    return pd.Series([start_value] * n, index=ts, name="equity")


def linear_equity_curve(
    start: float = 100_000,
    end: float = 120_000,
    n: int = 252,
) -> pd.Series:
    """Steadily growing equity curve with no drawdown."""
    ts = pd.date_range("2020-01-01", periods=n, freq="B", tz="UTC")
    values = np.linspace(start, end, n)
    return pd.Series(values, index=ts, name="equity")


def declining_then_recovering(n: int = 252) -> pd.Series:
    """Equity that drops 50% then recovers."""
    ts = pd.date_range("2020-01-01", periods=n, freq="B", tz="UTC")
    peak = n // 3
    trough = n // 2
    values = np.concatenate([
        np.linspace(100_000, 100_000, peak),         # flat
        np.linspace(100_000, 50_000, trough - peak),  # drop
        np.linspace(50_000, 110_000, n - trough),     # recovery
    ])
    return pd.Series(values, index=ts, name="equity")


class TestTotalReturn:

    def test_positive_return(self):
        curve = linear_equity_curve(start=100_000, end=120_000)
        metrics = calculate_performance_metrics(curve, [], 100_000)
        assert metrics.total_return == pytest.approx(0.20, rel=0.01)

    def test_zero_return_flat_curve(self):
        curve = flat_equity_curve(100_000)
        metrics = calculate_performance_metrics(curve, [], 100_000)
        assert abs(metrics.total_return) < 0.01  # Near zero


class TestCAGR:

    def test_cagr_one_year_20pct(self):
        """20% return over exactly 252 trading days ≈ 20% CAGR."""
        curve = linear_equity_curve(start=100_000, end=120_000, n=252)
        metrics = calculate_performance_metrics(curve, [], 100_000)
        # CAGR should be approximately 20% (the number of calendar days ≈ 1 year)
        assert metrics.cagr == pytest.approx(0.20, abs=0.02)

    def test_cagr_positive_for_growing_curve(self):
        curve = linear_equity_curve(100_000, 200_000)
        metrics = calculate_performance_metrics(curve, [], 100_000)
        assert metrics.cagr > 0


class TestMaxDrawdown:

    def test_max_drawdown_detected(self):
        """Equity that drops 50% should report -50% max drawdown."""
        curve = declining_then_recovering()
        metrics = calculate_performance_metrics(curve, [], 100_000)
        # Should detect the ~50% drop
        assert metrics.max_drawdown < -0.45, \
            f"Expected max_drawdown < -0.45, got {metrics.max_drawdown:.2%}"

    def test_no_drawdown_for_always_growing(self):
        curve = linear_equity_curve(100_000, 200_000)
        metrics = calculate_performance_metrics(curve, [], 100_000)
        assert metrics.max_drawdown >= -0.05, \
            "Monotonically growing curve should have near-zero max drawdown"


class TestSharpeRatio:

    def test_sharpe_zero_for_flat_curve(self):
        """No returns → Sharpe ≈ 0."""
        curve = flat_equity_curve(100_000)
        metrics = calculate_performance_metrics(curve, [], 100_000)
        assert abs(metrics.sharpe_ratio) < 0.1

    def test_sharpe_positive_for_consistent_gains(self):
        """Consistent positive returns should have positive Sharpe."""
        curve = linear_equity_curve(100_000, 120_000)
        metrics = calculate_performance_metrics(curve, [], 100_000)
        assert metrics.sharpe_ratio > 0


class TestTradeStatistics:

    def test_win_rate_calculation(self):
        """Win rate = winning trades / total trades."""
        trades = [
            make_trade(net_pnl=+100.0),
            make_trade(net_pnl=+200.0),
            make_trade(net_pnl=-50.0),
            make_trade(net_pnl=-75.0),
        ]
        curve = linear_equity_curve()
        metrics = calculate_performance_metrics(curve, trades, 100_000)

        assert metrics.total_trades == 4
        assert metrics.winning_trades == 2
        assert metrics.losing_trades == 2
        assert metrics.win_rate == pytest.approx(0.5, rel=1e-6)

    def test_profit_factor_greater_than_1_for_profitable(self):
        """Profitable strategy should have profit_factor > 1."""
        trades = [
            make_trade(net_pnl=+300.0),
            make_trade(net_pnl=-100.0),
        ]
        curve = linear_equity_curve()
        metrics = calculate_performance_metrics(curve, trades, 100_000)

        assert metrics.profit_factor > 1.0

    def test_best_and_worst_trade(self):
        """Best trade and worst trade must match the actual best/worst."""
        trades = [
            make_trade(net_pnl=+1000.0),
            make_trade(net_pnl=+200.0),
            make_trade(net_pnl=-500.0),
        ]
        curve = linear_equity_curve()
        metrics = calculate_performance_metrics(curve, trades, 100_000)

        assert metrics.best_trade == pytest.approx(1000.0, rel=1e-6)
        assert metrics.worst_trade == pytest.approx(-500.0, rel=1e-6)

    def test_no_trades_zero_metrics(self):
        """Zero trades should result in zero trade statistics."""
        curve = flat_equity_curve()
        metrics = calculate_performance_metrics(curve, [], 100_000)

        assert metrics.total_trades == 0
        assert metrics.win_rate == 0.0
        assert metrics.profit_factor == 0.0

    def test_calmar_ratio_formula(self):
        """Calmar = CAGR / abs(max_drawdown)."""
        curve = declining_then_recovering()
        metrics = calculate_performance_metrics(curve, [], 100_000)

        if abs(metrics.max_drawdown) > 1e-9:
            expected_calmar = metrics.cagr / abs(metrics.max_drawdown)
            assert metrics.calmar_ratio == pytest.approx(expected_calmar, rel=0.01)
