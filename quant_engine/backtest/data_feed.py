"""
Historical Data Feed
=====================
Yields MarketBarEvent objects in strict chronological order from
a pre-loaded DataFrame or list of MarketBar objects.

Temporal causality guarantee:
  - Bars are always yielded in ascending timestamp order.
  - No random access to future bars is possible.
  - The strategy can only see bars up to and including the current one.

This is the first line of defense against look-ahead bias.
"""

from __future__ import annotations

import logging
from collections.abc import Iterator
from datetime import datetime
from typing import Sequence

import pandas as pd

from quant_engine.backtest.events import EndOfDataEvent, MarketBarEvent
from quant_engine.domain import MarketBar

logger = logging.getLogger(__name__)


class HistoricalDataFeed:
    """
    Feeds historical bars one at a time in chronological order.

    The feed is a one-shot iterator — once exhausted, it emits
    EndOfDataEvent and stops.

    Look-ahead bias protection:
      - Uses a sorted list internally
      - Yields bars sequentially — no index jumping
      - No method exists to "peek ahead"

    Usage:
        feed = HistoricalDataFeed(bars)
        for event in feed:
            if isinstance(event, EndOfDataEvent):
                break
            process(event.bar)
    """

    def __init__(self, bars: Sequence[MarketBar]) -> None:
        """
        Args:
            bars: Pre-loaded MarketBar objects.
                  Will be sorted by timestamp ascending.
        """
        if not bars:
            raise ValueError("HistoricalDataFeed requires at least one bar.")

        # Sort by (timestamp, symbol) to ensure deterministic ordering
        self._bars: list[MarketBar] = sorted(
            bars, key=lambda b: (b.timestamp, b.symbol)
        )
        self._index = 0
        self._exhausted = False

        logger.info(
            "HistoricalDataFeed: %d bars [%s → %s]",
            len(self._bars),
            self._bars[0].timestamp.date(),
            self._bars[-1].timestamp.date(),
        )

    @property
    def total_bars(self) -> int:
        return len(self._bars)

    @property
    def current_index(self) -> int:
        return self._index

    @property
    def progress_pct(self) -> float:
        """How far through the data we are (0.0 → 1.0)."""
        if self.total_bars == 0:
            return 1.0
        return self._index / self.total_bars

    def __iter__(self) -> "HistoricalDataFeed":
        return self

    def __next__(self) -> MarketBarEvent | EndOfDataEvent:
        if self._index >= len(self._bars):
            if not self._exhausted:
                self._exhausted = True
                return EndOfDataEvent()
            raise StopIteration
        bar = self._bars[self._index]
        self._index += 1
        return MarketBarEvent(bar=bar)

    def reset(self) -> None:
        """Reset the feed to the beginning (e.g. for parameter search)."""
        self._index = 0
        self._exhausted = False

    @classmethod
    def from_dataframe(
        cls,
        df: pd.DataFrame,
        symbol: str | None = None,
    ) -> "HistoricalDataFeed":
        """
        Create a feed from a normalized OHLCV DataFrame.

        Args:
            df:     DataFrame with columns: symbol, timestamp, open, high,
                    low, close, volume (at minimum)
            symbol: Optional override for the symbol column value.
        """
        required = {"timestamp", "open", "high", "low", "close", "volume"}
        missing = required - set(df.columns)
        if missing:
            raise ValueError(
                f"DataFrame missing required columns for DataFeed: {missing}"
            )

        if df.empty:
            raise ValueError("Cannot create HistoricalDataFeed from empty DataFrame.")

        bars: list[MarketBar] = []
        for _, row in df.iterrows():
            ts = row["timestamp"]
            if not hasattr(ts, "tzinfo") or ts.tzinfo is None:
                ts = pd.Timestamp(ts).tz_localize("UTC")

            bars.append(
                MarketBar(
                    symbol=symbol or str(row.get("symbol", "UNKNOWN")),
                    timestamp=ts.to_pydatetime(),
                    open=float(row["open"]),
                    high=float(row["high"]),
                    low=float(row["low"]),
                    close=float(row["close"]),
                    volume=int(row.get("volume", 0)),
                    timeframe=str(row.get("timeframe", "1d")),
                    adjusted=bool(row.get("adjusted", True)),
                    source=str(row.get("source", "unknown")),
                )
            )

        return cls(bars)

    @classmethod
    def from_multi_symbol_dataframe(
        cls,
        df: pd.DataFrame,
    ) -> dict[str, "HistoricalDataFeed"]:
        """
        Create one feed per symbol from a multi-symbol DataFrame.
        Used for multi-asset backtests.
        """
        if "symbol" not in df.columns:
            raise ValueError("DataFrame must have a 'symbol' column for multi-feed creation.")

        feeds: dict[str, "HistoricalDataFeed"] = {}
        for symbol, group in df.groupby("symbol"):
            feeds[str(symbol)] = cls.from_dataframe(group, symbol=str(symbol))
        return feeds
