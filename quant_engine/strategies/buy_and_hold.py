"""
Buy and Hold Strategy
======================
The simplest possible strategy: buy the full position on the first bar
and hold until the end of the backtest.

Used as:
  - A baseline benchmark for all other strategies
  - A sanity check for the backtesting engine
  - A reference implementation for new strategy authors

Expected behavior:
  - First bar: generate LONG signal
  - All subsequent bars: no signal (already long)
  - The engine holds the position until data ends
"""

from __future__ import annotations

from typing import Any

from quant_engine.domain import Direction, MarketBar, Portfolio, Signal
from quant_engine.strategies.base import Strategy


class BuyAndHoldStrategy(Strategy):
    """
    Buy and hold strategy — enters long on first bar, holds forever.

    This is the primary benchmark. Any strategy that cannot beat
    buy-and-hold on a risk-adjusted basis (Sharpe, Calmar) is
    not adding value.

    Parameters: none
    """

    def __init__(self) -> None:
        super().__init__()
        self._entered = False

    @property
    def name(self) -> str:
        return "buy_and_hold"

    @property
    def parameter_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": [],
            "description": "Buy and Hold has no parameters.",
        }

    def initialize(self, config: dict[str, Any]) -> None:
        self._entered = False

    def on_bar(self, bar: MarketBar, portfolio: Portfolio) -> list[Signal]:
        """
        Generate a LONG signal on the first bar only.
        Subsequent bars return no signal — position is held by the engine.
        """
        if not self._entered:
            self._entered = True
            return [
                Signal(
                    symbol=bar.symbol,
                    timestamp=bar.timestamp,
                    direction=Direction.LONG,
                    strength=1.0,
                    strategy_id=self.name,
                )
            ]
        return []

    def reset(self) -> None:
        self._entered = False
