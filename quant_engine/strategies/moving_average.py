"""
Moving Average Momentum Strategy
==================================
Trend-following strategy using fast/slow Simple Moving Average crossovers.

Signal logic:
  - LONG when fast SMA crosses above slow SMA (golden cross)
  - FLAT when fast SMA crosses below slow SMA (death cross)
  - No short positions (long-only by default)

Parameters:
  fast_window:  Short lookback period (e.g. 20)
  slow_window:  Long lookback period (e.g. 100)
  price_col:    Price series to use: "close" or "open" (default: "close")

Temporal safety:
  - Rolling windows are computed from a deque of past closes.
  - The deque never contains the NEXT bar's data.
  - Warm-up period = slow_window bars (no signals during warmup).

Known limitations:
  - SMA crossovers can whipsaw in sideways markets.
  - No confirmation signal — pure mechanical entry/exit.
"""

from __future__ import annotations

from collections import deque
from typing import Any

from quant_engine.domain import Direction, MarketBar, Portfolio, Signal
from quant_engine.strategies.base import Strategy, StrategyConfigError


class MovingAverageMomentumStrategy(Strategy):
    """
    Fast/slow SMA crossover — goes long on golden cross, flat on death cross.

    Warm-up: Requires slow_window bars before generating any signal.
    """

    @property
    def name(self) -> str:
        return "moving_average_momentum"

    @property
    def parameter_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "fast_window": {
                    "type": "integer",
                    "minimum": 2,
                    "maximum": 200,
                    "description": "Fast SMA window (e.g. 20)",
                },
                "slow_window": {
                    "type": "integer",
                    "minimum": 5,
                    "maximum": 500,
                    "description": "Slow SMA window (e.g. 100)",
                },
            },
            "required": ["fast_window", "slow_window"],
        }

    def initialize(self, config: dict[str, Any]) -> None:
        self.fast_window: int = int(config["fast_window"])
        self.slow_window: int = int(config["slow_window"])

        if self.fast_window >= self.slow_window:
            raise StrategyConfigError(
                f"fast_window ({self.fast_window}) must be < slow_window ({self.slow_window})"
            )

        self._prices: deque[float] = deque(maxlen=self.slow_window)
        self._prev_fast_above: bool | None = None
        self._bar_count: int = 0

    def on_bar(self, bar: MarketBar, portfolio: Portfolio) -> list[Signal]:
        """
        Update price history and generate crossover signal.

        LOOK-AHEAD SAFETY: Uses bar.close — the last known price.
        The signal will only be acted upon at the NEXT bar's open.
        """
        self._prices.append(bar.close)
        self._bar_count += 1

        # Not enough data for warm-up yet
        if len(self._prices) < self.slow_window:
            return []

        prices_list = list(self._prices)
        fast_sma = sum(prices_list[-self.fast_window:]) / self.fast_window
        slow_sma = sum(prices_list) / self.slow_window

        fast_above = fast_sma > slow_sma

        # No crossover on first qualifying bar
        if self._prev_fast_above is None:
            self._prev_fast_above = fast_above
            return []

        signals: list[Signal] = []

        if fast_above and not self._prev_fast_above:
            # Golden cross — enter long
            signals.append(Signal(
                symbol=bar.symbol,
                timestamp=bar.timestamp,
                direction=Direction.LONG,
                strength=min(1.0, abs(fast_sma - slow_sma) / slow_sma * 100),
                strategy_id=self.name,
                metadata={"fast_sma": round(fast_sma, 4), "slow_sma": round(slow_sma, 4)},
            ))
        elif not fast_above and self._prev_fast_above:
            # Death cross — exit long
            signals.append(Signal(
                symbol=bar.symbol,
                timestamp=bar.timestamp,
                direction=Direction.FLAT,
                strength=1.0,
                strategy_id=self.name,
                metadata={"fast_sma": round(fast_sma, 4), "slow_sma": round(slow_sma, 4)},
            ))

        self._prev_fast_above = fast_above
        return signals

    def reset(self) -> None:
        self._prices = deque(maxlen=getattr(self, "slow_window", 100))
        self._prev_fast_above = None
        self._bar_count = 0
