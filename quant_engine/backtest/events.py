"""
Backtest Events
================
Event hierarchy for the event-driven backtesting engine.

The backtester uses an event queue (FIFO) to process events in order:
  1. MarketBarEvent  — new price data available
  2. SignalEvent     — strategy generated a signal
  3. OrderEvent      — risk-checked signal converted to order
  4. FillEvent       — order executed by execution simulator

All events are immutable dataclasses.

Temporal causality rule:
  An event at timestamp T can ONLY produce downstream events
  that execute at timestamp T+1 or later.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum, auto

from quant_engine.domain import Fill, MarketBar, Order, Signal


class EventType(Enum):
    """Discriminator for events in the queue."""
    MARKET_BAR = auto()
    SIGNAL = auto()
    ORDER = auto()
    FILL = auto()
    END_OF_DATA = auto()


@dataclass(frozen=True)
class MarketBarEvent:
    """New market bar available — triggers strategy evaluation."""
    type: EventType = EventType.MARKET_BAR
    bar: MarketBar = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        object.__setattr__(self, "type", EventType.MARKET_BAR)


@dataclass(frozen=True)
class SignalEvent:
    """Strategy generated a signal — triggers risk check and order routing."""
    type: EventType = EventType.SIGNAL
    signal: Signal = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        object.__setattr__(self, "type", EventType.SIGNAL)


@dataclass(frozen=True)
class OrderEvent:
    """Risk-approved order — triggers execution simulation."""
    type: EventType = EventType.ORDER
    order: Order = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        object.__setattr__(self, "type", EventType.ORDER)


@dataclass(frozen=True)
class FillEvent:
    """Execution simulator generated a fill — triggers portfolio update."""
    type: EventType = EventType.FILL
    fill: Fill = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        object.__setattr__(self, "type", EventType.FILL)


@dataclass(frozen=True)
class EndOfDataEvent:
    """Signals that the historical data feed is exhausted."""
    type: EventType = EventType.END_OF_DATA

    def __post_init__(self) -> None:
        object.__setattr__(self, "type", EventType.END_OF_DATA)


# Union type for type hints
BacktestEvent = (
    MarketBarEvent | SignalEvent | OrderEvent | FillEvent | EndOfDataEvent
)
