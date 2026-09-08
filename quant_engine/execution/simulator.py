"""
Execution Simulator
====================
Simulates order execution by converting Orders into Fills.

Execution rules:
  1. Market orders fill at the NEXT bar's open price (not current bar's close).
     This is the primary look-ahead bias protection at the execution level.
  2. Slippage is applied as per the configured CostModel.
  3. All fills record full cost breakdown (commission, slippage, spread).
  4. Partial fills are not supported in V1 (orders fill completely or not at all).

This models a realistic "end of day signal → next open execution" workflow
which is the standard assumption for daily backtesting.

Future extensions:
  - Volume-based slippage (market impact proportional to daily volume)
  - Limit order simulation
  - Latency modeling
  - Queue position
"""

from __future__ import annotations

import logging
import uuid
from collections import deque
from datetime import datetime
from typing import TYPE_CHECKING

from quant_engine.backtest.events import FillEvent, OrderEvent
from quant_engine.costs.models import CostModel, FixedCostModel
from quant_engine.domain import Fill, MarketBar, Order, OrderSide, OrderStatus, OrderType

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class ExecutionSimulator:
    """
    Simulates market order execution with configurable costs.

    Temporal rule enforced here:
      - Orders submitted during bar T are only executed at bar T+1's open.
      - This prevents using the same bar's close price for both signal and fill.

    The simulator maintains a queue of pending orders that are processed
    at the start of each new bar.

    Usage:
        simulator = ExecutionSimulator(cost_model)
        simulator.submit_order(order_event)
        fills = simulator.process_bar(next_bar)  # executes pending orders
    """

    def __init__(self, cost_model: CostModel | None = None) -> None:
        self.cost_model = cost_model or FixedCostModel()
        self._pending_orders: deque[Order] = deque()
        self._filled_orders: list[Fill] = []
        self._rejected_orders: list[Order] = []

    def submit_order(self, order: Order) -> None:
        """
        Queue an order for execution at the next bar's open.

        Args:
            order: Order to be executed.
        """
        logger.debug(
            "Order submitted: %s %s %s @ %s",
            order.side.value, order.quantity, order.symbol, order.order_type.value,
        )
        self._pending_orders.append(order)

    def process_bar(self, bar: MarketBar) -> list[FillEvent]:
        """
        Process all pending orders against a new bar.

        Market orders fill at bar.open with slippage applied.
        Limit orders (V1: simplified) fill at bar.open if limit is met.

        This method is called at the START of processing each bar,
        before the strategy sees the bar data. This ensures:
          - Signal generated on bar T uses bar T's data
          - Fill happens at bar T+1's open
          - No look-ahead bias

        Args:
            bar: The current bar to fill against.

        Returns:
            List of FillEvent objects (one per filled order).
        """
        fills: list[FillEvent] = []

        # Process all orders queued from the PREVIOUS bar
        while self._pending_orders:
            order = self._pending_orders.popleft()

            try:
                fill_event = self._execute_order(order, bar)
                if fill_event is not None:
                    fills.append(fill_event)
                    self._filled_orders.append(fill_event.fill)
            except Exception as exc:
                logger.error(
                    "Order execution failed: %s — rejecting order. Error: %s",
                    order, exc,
                )
                order.status = OrderStatus.REJECTED
                self._rejected_orders.append(order)

        return fills

    def cancel_all_orders(self) -> int:
        """
        Cancel all pending orders.
        Used when the strategy wants to clear the order book.

        Returns:
            Number of orders cancelled.
        """
        count = len(self._pending_orders)
        while self._pending_orders:
            order = self._pending_orders.popleft()
            order.cancel()
            self._rejected_orders.append(order)
        logger.info("Cancelled %d pending orders.", count)
        return count

    def cancel_orders_for_symbol(self, symbol: str) -> int:
        """Cancel all pending orders for a specific symbol."""
        remaining: deque[Order] = deque()
        cancelled = 0
        for order in self._pending_orders:
            if order.symbol == symbol:
                order.cancel()
                self._rejected_orders.append(order)
                cancelled += 1
            else:
                remaining.append(order)
        self._pending_orders = remaining
        return cancelled

    @property
    def has_pending_orders(self) -> bool:
        return len(self._pending_orders) > 0

    @property
    def pending_order_count(self) -> int:
        return len(self._pending_orders)

    @property
    def all_fills(self) -> list[Fill]:
        return list(self._filled_orders)

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _execute_order(self, order: Order, bar: MarketBar) -> FillEvent | None:
        """
        Execute a single order against the given bar.

        Market orders: fill at bar.open + slippage
        Limit orders: fill at bar.open if open <= limit (BUY) or >= limit (SELL)

        Returns None if the order cannot be filled (e.g. limit not met).
        """
        if order.symbol != bar.symbol:
            # Order is for a different symbol — put it back in the queue
            self._pending_orders.appendleft(order)
            return None

        reference_price = bar.open  # Fill at next bar open

        # Limit order check
        if order.order_type == OrderType.LIMIT:
            if order.side == OrderSide.BUY:
                if reference_price > order.limit_price:  # type: ignore[operator]
                    # Limit not met — requeue for next bar
                    # (simplified: only re-queue once, then expire)
                    logger.debug(
                        "Limit BUY not filled: open=%f > limit=%f for %s",
                        reference_price, order.limit_price, order.symbol,
                    )
                    return None
            else:  # SELL
                if reference_price < order.limit_price:  # type: ignore[operator]
                    logger.debug(
                        "Limit SELL not filled: open=%f < limit=%f for %s",
                        reference_price, order.limit_price, order.symbol,
                    )
                    return None

        # Calculate costs and actual fill price
        costs = self.cost_model.calculate(
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            reference_price=reference_price,
        )

        fill = Fill(
            fill_id=str(uuid.uuid4()),
            order_id=order.order_id,
            symbol=order.symbol,
            timestamp=bar.timestamp,  # Fill time = bar timestamp
            side=order.side,
            quantity=order.quantity,
            fill_price=costs.fill_price,
            commission=costs.commission,
            slippage=costs.slippage,
            spread_cost=costs.spread,
            strategy_id=order.strategy_id,
        )

        order.status = OrderStatus.FILLED

        logger.debug(
            "Filled: %s %s %.2f @ %.4f (ref=%.4f) costs=%.4f",
            order.side.value, order.symbol, order.quantity,
            fill.fill_price, reference_price, fill.total_cost,
        )

        return FillEvent(fill=fill)
