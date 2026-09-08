"""
Volatility Targeting Strategy
================================
Positions sizing strategy that targets a fixed annualized volatility
by scaling exposure up/down based on realized volatility.

Signal logic:
  - Always long (momentum bias), but adjusts size signal strength
    to reflect the target volatility allocation.
  - Entry: first bar after warm-up
  - Scale: position size = target_vol / realized_vol (capped at 1.0)

This strategy focuses on SIZING rather than timing.
The signal always returns LONG, but the strength (0–1) is used by the
portfolio manager to scale position size.

Parameters:
  target_vol:   Annual target volatility (e.g. 0.15 = 15%)
  vol_window:   Rolling window for realized vol estimation (e.g. 20)
  vol_floor:    Minimum vol to avoid infinite leverage (e.g. 0.05 = 5%)

Reference: Hurst, Ooi & Pedersen (2012) — "A Century of Evidence on
Trend-Following Investing"
"""

from __future__ import annotations

import math
from collections import deque
from typing import Any

from quant_engine.domain import Direction, MarketBar, Portfolio, Signal
from quant_engine.strategies.base import Strategy

# Annualization factor for daily returns
_TRADING_DAYS = 252


class VolatilityTargetingStrategy(Strategy):
    """
    Targets a fixed annualized volatility by scaling position size.
    Always long; adjusts signal strength to represent position scale.
    """

    @property
    def name(self) -> str:
        return "volatility_targeting"

    @property
    def parameter_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "target_vol": {
                    "type": "number",
                    "minimum": 0.01,
                    "maximum": 1.0,
                    "description": "Target annualized volatility (e.g. 0.15 = 15%)",
                },
                "vol_window": {
                    "type": "integer",
                    "minimum": 5,
                    "maximum": 252,
                    "description": "Lookback for realized volatility (e.g. 20)",
                },
                "vol_floor": {
                    "type": "number",
                    "minimum": 0.001,
                    "maximum": 0.5,
                    "description": "Minimum volatility to prevent infinite leverage (e.g. 0.05)",
                },
            },
            "required": ["target_vol", "vol_window"],
        }

    def initialize(self, config: dict[str, Any]) -> None:
        self.target_vol: float = float(config["target_vol"])
        self.vol_window: int = int(config["vol_window"])
        self.vol_floor: float = float(config.get("vol_floor", 0.05))
        self._returns: deque[float] = deque(maxlen=self.vol_window)
        self._prev_close: float | None = None
        self._entered: bool = False
        self._bar_count: int = 0

    def on_bar(self, bar: MarketBar, portfolio: Portfolio) -> list[Signal]:
        """
        Compute realized volatility and target the configured level.
        Returns LONG signal with strength = position scale (0–1).
        """
        # Compute daily return
        if self._prev_close is not None and self._prev_close > 0:
            daily_return = math.log(bar.close / self._prev_close)
            self._returns.append(daily_return)
        self._prev_close = bar.close
        self._bar_count += 1

        if len(self._returns) < self.vol_window:
            return []

        # Annualized realized volatility from daily returns
        returns_list = list(self._returns)
        n = len(returns_list)
        mean = sum(returns_list) / n
        variance = sum((r - mean) ** 2 for r in returns_list) / (n - 1)
        realized_vol = math.sqrt(variance * _TRADING_DAYS)

        # Apply vol floor to prevent excessive leverage
        effective_vol = max(realized_vol, self.vol_floor)

        # Target scale: how much of full position to hold
        scale = min(1.0, self.target_vol / effective_vol)

        # Always long — emit signal with scale as strength
        if not self._entered:
            self._entered = True

        return [Signal(
            symbol=bar.symbol,
            timestamp=bar.timestamp,
            direction=Direction.LONG,
            strength=scale,
            strategy_id=self.name,
            metadata={
                "realized_vol_annual": round(realized_vol, 4),
                "target_vol": self.target_vol,
                "scale": round(scale, 4),
            },
        )]

    def reset(self) -> None:
        window = getattr(self, "vol_window", 20)
        self._returns = deque(maxlen=window)
        self._prev_close = None
        self._entered = False
        self._bar_count = 0
