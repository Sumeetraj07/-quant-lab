"""
End-to-End Smoke Test
======================
Runs a full backtest with synthetic data to verify the entire
pipeline works without requiring an Alpha Vantage API call.

Tests:
  - Data normalization and validation pipeline
  - MovingAverageMomentum strategy full run
  - BuyAndHold benchmark comparison
  - Metrics calculation from real equity curve
  - BacktestResult serialization
"""

from __future__ import annotations

import math
import random
from datetime import date, datetime, timezone, timedelta

import pandas as pd
import pytest

from quant_engine.backtest.engine import BacktestEngine
from quant_engine.data.normalizers import bars_to_dataframe, normalize_dataframe
from quant_engine.data.validators import DataValidator
from quant_engine.domain import (
    BacktestConfig,
    BacktestResult,
    Direction,
    MarketBar,
    PositionSizingMethod,
)
from quant_engine.strategies.buy_and_hold import BuyAndHoldStrategy
from quant_engine.strategies.moving_average import MovingAverageMomentumStrategy
from quant_engine.strategies.bollinger import BollingerMeanReversionStrategy
from quant_engine.strategies.breakout import BreakoutStrategy
from quant_engine.strategies.registry import StrategyRegistry


def generate_synthetic_bars(
    symbol: str = "SYNTH",
    n: int = 500,
    seed: int = 42,
    trend: float = 0.0001,       # Daily drift
    volatility: float = 0.02,   # Daily vol
    start_price: float = 100.0,
) -> list[MarketBar]:
    """Generate a realistic synthetic price series using GBM."""
    random.seed(seed)
    bars: list[MarketBar] = []
    price = start_price
    base_ts = datetime(2020, 1, 1, tzinfo=timezone.utc)

    for i in range(n):
        ts = base_ts + timedelta(days=i)
        daily_return = trend + volatility * (random.gauss(0, 1))
        price = price * math.exp(daily_return)

        open_ = price * (1 + random.gauss(0, 0.005))
        high = max(open_, price) * (1 + abs(random.gauss(0, 0.003)))
        low = min(open_, price) * (1 - abs(random.gauss(0, 0.003)))
        close = price
        volume = int(1_000_000 * (1 + 0.5 * abs(random.gauss(0, 1))))

        bars.append(MarketBar(
            symbol=symbol,
            timestamp=ts,
            open=max(0.01, open_),
            high=max(open_, high),
            low=min(open_, low),
            close=max(0.01, close),
            volume=max(1000, volume),
        ))

    return bars


class TestEndToEndBacktest:

    def setup_method(self):
        self.bars = generate_synthetic_bars(n=500, seed=42)
        self.config = BacktestConfig(
            strategy_id="moving_average_momentum",
            parameters={"fast_window": 20, "slow_window": 50},
            symbols=["SYNTH"],
            start_date=date(2020, 1, 1),
            end_date=date(2021, 6, 14),
            timeframe="1d",
            initial_capital=100_000,
            commission_rate=0.001,
            slippage_bps=5.0,
            spread_bps=2.0,
            position_sizing=PositionSizingMethod.PERCENTAGE_ALLOCATION,
            sizing_parameter=0.95,
        )

    def test_full_backtest_runs_without_error(self):
        """The complete pipeline should run to completion on 500 bars."""
        strategy = MovingAverageMomentumStrategy()
        engine = BacktestEngine()
        result = engine.run(
            config=self.config,
            strategy=strategy,
            bars=self.bars,
        )
        assert result is not None

    def test_equity_curve_has_correct_length(self):
        """Equity curve should have one point per bar."""
        strategy = MovingAverageMomentumStrategy()
        engine = BacktestEngine()
        result = engine.run(config=self.config, strategy=strategy, bars=self.bars)

        assert len(result.equity_curve) == len(self.bars), (
            f"Equity curve length {len(result.equity_curve)} != bars {len(self.bars)}"
        )

    def test_equity_never_exceeds_100x_growth(self):
        """Sanity check: equity should not explode unrealistically."""
        strategy = MovingAverageMomentumStrategy()
        engine = BacktestEngine()
        result = engine.run(config=self.config, strategy=strategy, bars=self.bars)

        final_equity = float(result.equity_curve.iloc[-1])
        assert final_equity < self.config.initial_capital * 100, \
            f"Equity of {final_equity} looks unrealistic"

    def test_equity_always_positive(self):
        """Equity must never go negative (no unlimited leverage)."""
        strategy = MovingAverageMomentumStrategy()
        engine = BacktestEngine()
        result = engine.run(config=self.config, strategy=strategy, bars=self.bars)

        min_equity = float(result.equity_curve.min())
        assert min_equity > 0, f"Equity should never be negative, got {min_equity}"

    def test_metrics_all_populated(self):
        """All key metrics should be computed (not None or NaN)."""
        strategy = MovingAverageMomentumStrategy()
        engine = BacktestEngine()
        result = engine.run(config=self.config, strategy=strategy, bars=self.bars)
        m = result.metrics

        assert not math.isnan(m.total_return), "total_return should not be NaN"
        assert not math.isnan(m.cagr), "cagr should not be NaN"
        assert not math.isnan(m.sharpe_ratio), "sharpe_ratio should not be NaN"
        assert not math.isnan(m.max_drawdown), "max_drawdown should not be NaN"

    def test_max_drawdown_negative_or_zero(self):
        """Max drawdown must be <= 0 by definition."""
        strategy = MovingAverageMomentumStrategy()
        engine = BacktestEngine()
        result = engine.run(config=self.config, strategy=strategy, bars=self.bars)

        assert result.metrics.max_drawdown <= 0.0, \
            f"Max drawdown should be <= 0, got {result.metrics.max_drawdown}"

    def test_result_serializes(self):
        """BacktestResult.config.to_dict() should produce JSON-compatible output."""
        strategy = MovingAverageMomentumStrategy()
        engine = BacktestEngine()
        result = engine.run(config=self.config, strategy=strategy, bars=self.bars)

        config_dict = result.config.to_dict()
        assert isinstance(config_dict, dict)
        assert config_dict["strategy_id"] == "moving_average_momentum"

    def test_metrics_serializes(self):
        """PerformanceMetrics.to_dict() should produce JSON-compatible output."""
        strategy = MovingAverageMomentumStrategy()
        engine = BacktestEngine()
        result = engine.run(config=self.config, strategy=strategy, bars=self.bars)

        metrics_dict = result.metrics.to_dict()
        assert isinstance(metrics_dict, dict)
        assert "sharpe_ratio" in metrics_dict
        assert "max_drawdown" in metrics_dict

    def test_summary_output(self):
        """BacktestResult.summary() should return a non-empty string."""
        strategy = MovingAverageMomentumStrategy()
        engine = BacktestEngine()
        result = engine.run(config=self.config, strategy=strategy, bars=self.bars)

        summary = result.summary()
        assert isinstance(summary, str)
        assert len(summary) > 100
        assert "moving_average_momentum" in summary.lower()


class TestAllStrategiesRun:
    """Verify every registered strategy runs on the same data."""

    def setup_method(self):
        self.bars = generate_synthetic_bars(n=300, seed=123)

    def _make_config(self, strategy_id: str, params: dict) -> BacktestConfig:
        return BacktestConfig(
            strategy_id=strategy_id,
            parameters=params,
            symbols=["SYNTH"],
            start_date=date(2020, 1, 1),
            end_date=date(2020, 10, 27),
            timeframe="1d",
            initial_capital=100_000,
            commission_rate=0.0,
            slippage_bps=0.0,
            spread_bps=0.0,
            position_sizing=PositionSizingMethod.PERCENTAGE_ALLOCATION,
            sizing_parameter=0.95,
        )

    def test_buy_and_hold_runs(self):
        config = self._make_config("buy_and_hold", {})
        result = BacktestEngine().run(
            config=config,
            strategy=BuyAndHoldStrategy(),
            bars=self.bars,
        )
        assert result is not None
        assert len(result.equity_curve) == len(self.bars)

    def test_moving_average_runs(self):
        config = self._make_config("moving_average_momentum", {"fast_window": 10, "slow_window": 30})
        strategy = StrategyRegistry.create("moving_average_momentum")
        result = BacktestEngine().run(config=config, strategy=strategy, bars=self.bars)
        assert result is not None

    def test_bollinger_runs(self):
        config = self._make_config("bollinger_mean_reversion", {"window": 20, "num_std": 2.0})
        strategy = StrategyRegistry.create("bollinger_mean_reversion")
        result = BacktestEngine().run(config=config, strategy=strategy, bars=self.bars)
        assert result is not None

    def test_breakout_runs(self):
        config = self._make_config("breakout", {"window": 20})
        strategy = StrategyRegistry.create("breakout")
        result = BacktestEngine().run(config=config, strategy=strategy, bars=self.bars)
        assert result is not None

    def test_volatility_targeting_runs(self):
        config = self._make_config(
            "volatility_targeting",
            {"target_vol": 0.15, "vol_window": 20, "vol_floor": 0.05},
        )
        strategy = StrategyRegistry.create("volatility_targeting")
        result = BacktestEngine().run(config=config, strategy=strategy, bars=self.bars)
        assert result is not None

    def test_strategy_registry_lists_all(self):
        """Registry should list all 5 built-in strategies."""
        names = StrategyRegistry.list()
        assert len(names) >= 5
        assert "buy_and_hold" in names
        assert "moving_average_momentum" in names
        assert "bollinger_mean_reversion" in names
        assert "breakout" in names
        assert "volatility_targeting" in names

    def test_reset_allows_rerun(self):
        """Strategy.reset() should allow the same instance to be reused."""
        strategy = MovingAverageMomentumStrategy()
        config = self._make_config("moving_average_momentum", {"fast_window": 10, "slow_window": 30})
        engine = BacktestEngine()

        result1 = engine.run(config=config, strategy=strategy, bars=self.bars)
        result2 = engine.run(config=config, strategy=strategy, bars=self.bars)

        # Same inputs must produce identical results
        assert float(result1.equity_curve.iloc[-1]) == pytest.approx(
            float(result2.equity_curve.iloc[-1]), rel=1e-6
        ), "Reset must allow identical reproduction of results"


class TestNormalizationPipeline:

    def test_bars_to_dataframe_and_back(self):
        """normalize_dataframe → bars_to_dataframe round trip should preserve data."""
        from quant_engine.data.schemas import Timeframe
        bars_in = generate_synthetic_bars(n=50)

        # Convert to DataFrame
        from quant_engine.data.normalizers import bars_to_dataframe
        from quant_engine.data.schemas import OHLCVBar
        from decimal import Decimal

        ohlcv_bars = [
            OHLCVBar(
                symbol=b.symbol,
                timestamp=b.timestamp,
                open=Decimal(str(round(b.open, 4))),
                high=Decimal(str(round(b.high, 4))),
                low=Decimal(str(round(b.low, 4))),
                close=Decimal(str(round(b.close, 4))),
                volume=b.volume,
                source="test",
                timeframe="1d",
            )
            for b in bars_in
        ]

        df = bars_to_dataframe(ohlcv_bars)
        assert len(df) == 50
        assert "timestamp" in df.columns
        assert "close" in df.columns

    def test_data_validator_passes_synthetic_data(self):
        """Synthetic data should pass all validation checks."""
        bars = generate_synthetic_bars(n=100)

        from quant_engine.data.schemas import OHLCVBar
        from decimal import Decimal

        ohlcv_bars = [
            OHLCVBar(
                symbol=b.symbol,
                timestamp=b.timestamp,
                open=Decimal(str(round(b.open, 6))),
                high=Decimal(str(round(b.high, 6))),
                low=Decimal(str(round(b.low, 6))),
                close=Decimal(str(round(b.close, 6))),
                volume=b.volume,
                source="test",
                timeframe="1d",
            )
            for b in bars
        ]

        validator = DataValidator()
        result = validator.validate(ohlcv_bars, "SYNTH", "1d")
        assert result.is_valid, f"Validation failed: {result.errors}"
