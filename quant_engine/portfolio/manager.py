"""
Portfolio Manager
==================
Maintains portfolio state and updates it on each Fill.

Responsibilities:
  - Track cash balance
  - Track positions (quantity, avg_entry_price)
  - Calculate realized and unrealized PnL
  - Calculate exposure and leverage metrics
  - Snapshot equity curve at each bar
  - Record closed trades

Design:
  - Single source of truth for portfolio state during a backtest
  - Updated by FillEvents only (never directly by strategies)
  - Snapshots are taken after each bar for the equity curve

PnL Accounting Rules:
  - Gross PnL: price change × quantity (before costs)
  - Net PnL:   Gross PnL − Commission − Slippage − Spread
  - Cash changes on fills, not on unrealized moves
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any

from quant_engine.domain import (
    Fill,
    MarketBar,
    OrderSide,
    Portfolio,
    Position,
    Trade,
)

logger = logging.getLogger(__name__)


class PortfolioManager:
    """
    Manages portfolio state throughout a backtest.

    Usage:
        manager = PortfolioManager(initial_capital=100_000)
        manager.process_fill(fill)                      # on each fill
        equity = manager.equity(current_prices)         # mark-to-market
        manager.snapshot(bar)                           # record to equity curve
    """

    def __init__(self, initial_capital: float) -> None:
        if initial_capital <= 0:
            raise ValueError(
                f"initial_capital must be positive, got {initial_capital}"
            )
        self.initial_capital = initial_capital
        self._portfolio = Portfolio(
            cash=initial_capital,
            initial_capital=initial_capital,
        )
        self._equity_snapshots: list[tuple[datetime, float]] = []
        self._trades: list[Trade] = []
        self._total_commissions: float = 0.0
        self._total_slippage: float = 0.0
        self._total_spread: float = 0.0
        self._bar_count: int = 0

    # ------------------------------------------------------------------
    # Fill processing
    # ------------------------------------------------------------------

    def process_fill(self, fill: Fill) -> None:
        """
        Update portfolio state after an order fill.

        Cash is adjusted immediately.
        Position is updated (quantity, avg entry price, realized PnL).
        Costs are tracked separately.

        Args:
            fill: The executed fill from ExecutionSimulator.
        """
        position = self._portfolio.get_position(fill.symbol)
        old_quantity = position.quantity

        # Record pre-fill state for trade tracking
        was_open = not position.is_flat

        # Update position
        position.apply_fill(fill)

        # Update cash
        # BUY: cash decreases by (quantity × fill_price + all costs)
        # SELL: cash increases by (quantity × fill_price − all costs)
        if fill.side == OrderSide.BUY:
            cash_change = -(fill.quantity * fill.fill_price) - fill.total_cost
        else:  # SELL
            cash_change = (fill.quantity * fill.fill_price) - fill.total_cost

        self._portfolio.cash += cash_change

        # Track costs
        self._total_commissions += fill.commission
        self._total_slippage += fill.slippage
        self._total_spread += fill.spread_cost

        # Record closed trade
        if was_open and position.is_flat:
            self._record_closed_trade(fill, old_quantity, position)
        elif was_open and (
            (old_quantity > 0 and position.quantity < 0) or
            (old_quantity < 0 and position.quantity > 0)
        ):
            # Reversal — record the closing leg
            self._record_closed_trade(fill, old_quantity, position)

        logger.debug(
            "Fill processed: %s %s %.2f @ %.4f | cash=%.2f",
            fill.side.value, fill.symbol, fill.quantity,
            fill.fill_price, self._portfolio.cash,
        )

    def mark_to_market(self, current_prices: dict[str, float]) -> float:
        """
        Mark portfolio to market prices.

        Args:
            current_prices: Dict of symbol → current price

        Returns:
            Total portfolio equity.
        """
        equity = self._portfolio.equity(current_prices)
        return equity

    def snapshot(self, bar: MarketBar, current_prices: dict[str, float]) -> dict[str, Any]:
        """
        Record a point-in-time snapshot of the portfolio.
        Called once per bar after all fills are processed.

        Args:
            bar:            Current bar (for timestamp)
            current_prices: Current prices for all symbols

        Returns:
            Snapshot dict (also stored internally for equity curve)
        """
        self._portfolio.timestamp = bar.timestamp
        self._bar_count += 1

        equity = self._portfolio.equity(current_prices)
        self._equity_snapshots.append((bar.timestamp, equity))

        snap = self._portfolio.snapshot(current_prices)
        snap["bar_count"] = self._bar_count
        snap["total_commissions"] = round(self._total_commissions, 4)
        snap["total_slippage"] = round(self._total_slippage, 4)
        snap["total_spread"] = round(self._total_spread, 4)
        return snap

    # ------------------------------------------------------------------
    # Accessors
    # ------------------------------------------------------------------

    @property
    def portfolio(self) -> Portfolio:
        return self._portfolio

    @property
    def cash(self) -> float:
        return self._portfolio.cash

    @property
    def trades(self) -> list[Trade]:
        return list(self._trades)

    @property
    def total_costs(self) -> float:
        return self._total_commissions + self._total_slippage + self._total_spread

    def equity(self, current_prices: dict[str, float]) -> float:
        return self._portfolio.equity(current_prices)

    def get_equity_series(self) -> list[tuple[datetime, float]]:
        """Return the equity curve as a list of (timestamp, equity) tuples."""
        return list(self._equity_snapshots)

    def get_position(self, symbol: str) -> Position:
        return self._portfolio.get_position(symbol)

    def has_position(self, symbol: str) -> bool:
        pos = self._portfolio.positions.get(symbol)
        return pos is not None and not pos.is_flat

    def position_quantity(self, symbol: str) -> float:
        pos = self._portfolio.positions.get(symbol)
        return pos.quantity if pos else 0.0

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _record_closed_trade(
        self,
        fill: Fill,
        old_quantity: float,
        position: Position,
    ) -> None:
        """Create a Trade record when a position is fully or partially closed."""
        # Reconstruct the trade from fill info
        # This is approximate for partial fills; full accounting is in Position
        closed_qty = min(abs(fill.quantity), abs(old_quantity))

        if fill.side == OrderSide.SELL and old_quantity > 0:
            # Closing a long
            gross_pnl = closed_qty * (fill.fill_price - self._portfolio.positions[fill.symbol].avg_entry_price)
            entry_side = OrderSide.BUY
        elif fill.side == OrderSide.BUY and old_quantity < 0:
            # Closing a short
            gross_pnl = closed_qty * (self._portfolio.positions[fill.symbol].avg_entry_price - fill.fill_price)
            entry_side = OrderSide.SELL
        else:
            return  # Adding to position — not a trade close

        trade = Trade(
            trade_id=str(uuid.uuid4()),
            symbol=fill.symbol,
            side=entry_side,
            entry_time=fill.timestamp,  # Approximate — exact entry time tracked in Position history
            exit_time=fill.timestamp,
            quantity=closed_qty,
            entry_price=0.0,  # Will be set more accurately by BacktestEngine
            exit_price=fill.fill_price,
            gross_pnl=gross_pnl,
            costs=fill.total_cost,
            strategy_id=fill.strategy_id,
        )
        self._trades.append(trade)
