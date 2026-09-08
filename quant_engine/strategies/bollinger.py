"""
Bollinger Band Mean Reversion Strategy
=========================================
Counter-trend strategy that sells overbought conditions and buys oversold.

Signal logic:
  - LONG when price crosses BELOW the lower Bollinger Band (oversold)
  - FLAT when price returns to the middle band (mean)
  - No shorting (long-only, mean-reverting positions)

Parameters:
  window:    Rolling window for mean and std calculation (e.g. 20)
  num_std:   Number of standard deviations for band width (e.g. 2.0)

Temporal safety:
  - All computations use only past prices stored in a deque.
  - Signal generated on bar T executes on bar T+1 open.
"""

from __future__ import annotations

import statistics
from collections import deque
from typing import Any

from quant_engine.domain import Direction, MarketBar, Portfolio, Signal
from quant_engine.strategies.base import Strategy


class BollingerMeanReversionStrategy(Strategy):
    """
    Mean reversion using Bollinger Bands.
    Buys when price breaks below lower band, exits when price returns to mid.
    """

    @property
    def name(self) -> str:
        return "bollinger_mean_reversion"

    @property
    def parameter_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "window": {
                    "type": "integer",
                    "minimum": 5,
                    "maximum": 200,
                    "description": "Rolling window for Bollinger Band calculation (e.g. 20)",
                },
                "num_std": {
                    "type": "number",
                    "minimum": 0.5,
                    "maximum": 5.0,
                    "description": "Standard deviations for band width (e.g. 2.0)",
                },
            },
            "required": ["window", "num_std"],
        }

    def initialize(self, config: dict[str, Any]) -> None:
        self.window: int = int(config["window"])
        self.num_std: float = float(config["num_std"])
        self._prices: deque[float] = deque(maxlen=self.window)
        self._in_position: bool = False
        self._bar_count: int = 0

    def on_bar(self, bar: MarketBar, portfolio: Portfolio) -> list[Signal]:
        self._prices.append(bar.close)
        self._bar_count += 1

        if len(self._prices) < self.window:
            return []

        prices_list = list(self._prices)
        mean = statistics.mean(prices_list)

        # Need at least 2 points for stdev
        if len(prices_list) < 2:
            return []

        std = statistics.stdev(prices_list)
        upper_band = mean + self.num_std * std
        lower_band = mean - self.num_std * std

        signals: list[Signal] = []

        if not self._in_position and bar.close < lower_band:
            # Price crossed below lower band — oversold — enter long
            signals.append(Signal(
                symbol=bar.symbol,
                timestamp=bar.timestamp,
                direction=Direction.LONG,
                strength=min(1.0, (lower_band - bar.close) / (std + 1e-9)),
                strategy_id=self.name,
                metadata={
                    "mean": round(mean, 4),
                    "upper_band": round(upper_band, 4),
                    "lower_band": round(lower_band, 4),
                },
            ))
            self._in_position = True

        elif self._in_position and bar.close >= mean:
            # Price returned to mean — exit
            signals.append(Signal(
                symbol=bar.symbol,
                timestamp=bar.timestamp,
                direction=Direction.FLAT,
                strength=1.0,
                strategy_id=self.name,
                metadata={"mean": round(mean, 4), "exit_reason": "mean_reversion"},
            ))
            self._in_position = False

        return signals

    def reset(self) -> None:
        self._prices = deque(maxlen=getattr(self, "window", 20))
        self._in_position = False
        self._bar_count = 0
