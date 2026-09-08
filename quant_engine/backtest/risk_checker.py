"""
Risk Checker
=============
Filters strategy signals through basic risk rules before
they are converted to orders.

This is the safety layer between strategy signals and actual orders.
Strategies generate intentions; the risk checker approves or rejects them.

V1 rules:
  1. Maximum position concentration (% of equity per single position)
  2. Maximum drawdown halt (stop trading if drawdown is too severe)
  3. Cash availability check (can't buy more than available cash)

Future rules:
  - Sector concentration limits
  - Gross/net exposure limits
  - Correlation-based position limits
  - VaR budget enforcement
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from quant_engine.domain import Direction, Signal

if TYPE_CHECKING:
    from quant_engine.portfolio.manager import PortfolioManager

logger = logging.getLogger(__name__)

_HALT_TRIGGERED = False  # Module-level flag for test access


class RiskChecker:
    """
    Applies pre-trade risk rules to filter signals.

    Args:
        max_position_pct:   Maximum single position as % of equity (e.g. 0.5 = 50%)
        max_drawdown_halt:  Halt all trading if portfolio drawdown exceeds this
    """

    def __init__(
        self,
        max_position_pct: float = 0.50,
        max_drawdown_halt: float = 0.40,
    ) -> None:
        self.max_position_pct = max_position_pct
        self.max_drawdown_halt = max_drawdown_halt
        self._halted = False
        self._rejection_log: list[str] = []

    def should_halt(self, current_equity: float, initial_capital: float) -> bool:
        """
        Check if trading should be halted due to excessive drawdown.

        Args:
            current_equity:  Current portfolio equity
            initial_capital: Starting capital

        Returns:
            True if trading should stop entirely.
        """
        if initial_capital <= 0:
            return False

        drawdown = (current_equity - initial_capital) / initial_capital

        if drawdown < -self.max_drawdown_halt:
            if not self._halted:
                logger.warning(
                    "RiskChecker: HALT triggered. Drawdown=%.1f%% exceeds limit=%.1f%%",
                    drawdown * 100,
                    self.max_drawdown_halt * 100,
                )
                self._halted = True
            return True

        return False

    def filter_signals(
        self,
        signals: list[Signal],
        portfolio_manager: "PortfolioManager",
        current_prices: dict[str, float],
    ) -> list[Signal]:
        """
        Filter a list of signals through all risk rules.

        Args:
            signals:           Signals from the strategy
            portfolio_manager: Current portfolio state
            current_prices:    Current market prices

        Returns:
            Approved signals (may be empty if all rejected).
        """
        if self._halted:
            logger.debug("RiskChecker: halted — rejecting all signals.")
            return []

        approved: list[Signal] = []

        for signal in signals:
            if self._approve_signal(signal, portfolio_manager, current_prices):
                approved.append(signal)

        return approved

    def reset(self) -> None:
        """Reset risk checker state (called between backtest runs)."""
        self._halted = False
        self._rejection_log.clear()

    @property
    def rejection_log(self) -> list[str]:
        return list(self._rejection_log)

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _approve_signal(
        self,
        signal: Signal,
        portfolio_manager: "PortfolioManager",
        current_prices: dict[str, float],
    ) -> bool:
        """
        Run all risk checks for a single signal.

        Returns True if approved, False if rejected.
        """
        # EXIT signals always pass (never block exits)
        if signal.direction == Direction.FLAT:
            return True

        price = current_prices.get(signal.symbol, 0.0)
        if price <= 0:
            reason = f"Rejected {signal.symbol}: invalid price {price}"
            self._rejection_log.append(reason)
            logger.debug("RiskChecker: %s", reason)
            return False

        equity = portfolio_manager.equity(current_prices)
        if equity <= 0:
            reason = f"Rejected {signal.symbol}: zero or negative equity"
            self._rejection_log.append(reason)
            return False

        # Check available cash for entries
        if portfolio_manager.cash <= 0:
            reason = f"Rejected {signal.symbol} ENTRY: no cash available"
            self._rejection_log.append(reason)
            logger.debug("RiskChecker: %s", reason)
            return False

        # Position concentration check
        # (pre-fill — we check if the resulting position would be too large)
        # This is a simplified check; exact quantity is determined by sizing
        # We only reject if the symbol is already at/above the limit
        existing_value = abs(
            portfolio_manager.get_position(signal.symbol).market_value(price)
        )
        max_allowed_value = equity * self.max_position_pct

        if existing_value >= max_allowed_value * 0.99:  # 1% tolerance
            reason = (
                f"Rejected {signal.symbol}: position concentration "
                f"{existing_value/equity:.1%} >= limit {self.max_position_pct:.1%}"
            )
            self._rejection_log.append(reason)
            logger.debug("RiskChecker: %s", reason)
            return False

        return True
