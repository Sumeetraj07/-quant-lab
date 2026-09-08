"""
Breakout Strategy
==================
Trend-following strategy that enters on N-day price channel breakouts.

Signal logic:
  - LONG when close breaks above the highest high of the past N bars
  - FLAT when close breaks below the lowest low of the past N bars
  - No shorting by default

Parameters:
  window: Channel lookback period (e.g. 20 for 20-day Donchian channel)

This is related to the Donchian Channel / Turtle Trading system.
"""

from __future__ import annotations

from collections import deque
from typing import Any

from quant_engine.domain import Direction, MarketBar, Portfolio, Signal
from quant_engine.strategies.base import Strategy


class BreakoutStrategy(Strategy):
    """
    N-day price channel breakout (Donchian Channel style).
    Enters long on N-day high breakout, exits on N-day low breakdown.
    """

    @property
    def name(self) -> str:
        return "breakout"

    @property
    def parameter_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "window": {
                    "type": "integer",
                    "minimum": 5,
                    "maximum": 252,
                    "description": "Channel lookback in bars (e.g. 20)",
                },
            },
            "required": ["window"],
        }

    def initialize(self, config: dict[str, Any]) -> None:
        self.window: int = int(config["window"])
        self._highs: deque[float] = deque(maxlen=self.window)
        self._lows: deque[float] = deque(maxlen=self.window)
        self._in_position: bool = False
        self._bar_count: int = 0

    def on_bar(self, bar: MarketBar, portfolio: Portfolio) -> list[Signal]:
        """
        TEMPORAL SAFETY: We add the CURRENT bar to the deque AFTER computing
        the signal, so we're always comparing against PAST N bars only.

        Specifically:
          1. Compute channel from past bars (deque)
          2. Check if today's close breaks the channel
          3. THEN add today's data to the deque for future comparisons
        """
        # Step 1: Compute channel from PAST bars (not including current)
        if len(self._highs) < self.window:
            # Not enough history yet — add current bar and continue
            self._highs.append(bar.high)
            self._lows.append(bar.low)
            self._bar_count += 1
            return []

        channel_high = max(self._highs)
        channel_low = min(self._lows)

        signals: list[Signal] = []

        if not self._in_position and bar.close > channel_high:
            # Breakout to the upside — enter long
            signals.append(Signal(
                symbol=bar.symbol,
                timestamp=bar.timestamp,
                direction=Direction.LONG,
                strength=min(1.0, (bar.close - channel_high) / channel_high),
                strategy_id=self.name,
                metadata={
                    "channel_high": round(channel_high, 4),
                    "channel_low": round(channel_low, 4),
                    "window": self.window,
                },
            ))
            self._in_position = True

        elif self._in_position and bar.close < channel_low:
            # Breakdown — exit long
            signals.append(Signal(
                symbol=bar.symbol,
                timestamp=bar.timestamp,
                direction=Direction.FLAT,
                strength=1.0,
                strategy_id=self.name,
                metadata={"exit_reason": "channel_breakdown", "channel_low": round(channel_low, 4)},
            ))
            self._in_position = False

        # Step 2: Add current bar AFTER computing signal (temporal safety)
        self._highs.append(bar.high)
        self._lows.append(bar.low)
        self._bar_count += 1

        return signals

    def reset(self) -> None:
        window = getattr(self, "window", 20)
        self._highs = deque(maxlen=window)
        self._lows = deque(maxlen=window)
        self._in_position = False
        self._bar_count = 0
