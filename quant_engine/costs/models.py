"""
Transaction Cost Models
========================
Models for computing the full cost of executing a trade.

All costs are computed explicitly and stored with each fill so that
results always distinguish gross PnL from net PnL.

Cost components:
  1. Commission  — broker fee as a fraction of trade value
  2. Slippage    — adverse price movement from signal to execution
  3. Spread cost — bid-ask spread cost (half-spread per side)

Never report only gross performance when costs are available.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from quant_engine.domain import OrderSide


@dataclass(frozen=True)
class CostBreakdown:
    """
    Itemized transaction cost breakdown for a single fill.

    Always stored with fills so performance reports can show:
      Net PnL = Gross PnL - Total Costs
      Total Costs = Commission + Slippage + Spread
    """

    commission: float      # Brokerage commission ($)
    slippage: float        # Slippage cost ($) — always positive
    spread: float          # Spread cost ($) — always positive
    fill_price: float      # Actual fill price after slippage (not signal price)

    @property
    def total(self) -> float:
        return self.commission + self.slippage + self.spread

    def __repr__(self) -> str:
        return (
            f"CostBreakdown("
            f"commission={self.commission:.4f} "
            f"slippage={self.slippage:.4f} "
            f"spread={self.spread:.4f} "
            f"total={self.total:.4f} "
            f"fill_price={self.fill_price:.4f})"
        )


class CostModel(ABC):
    """Abstract base class for transaction cost models."""

    @abstractmethod
    def calculate(
        self,
        symbol: str,
        side: OrderSide,
        quantity: float,
        reference_price: float,   # Price at signal generation time
    ) -> CostBreakdown:
        """
        Calculate transaction costs for a hypothetical fill.

        Args:
            symbol:          Trading symbol
            side:            BUY or SELL
            quantity:        Number of shares/units
            reference_price: Bar open or close price before slippage

        Returns:
            CostBreakdown with itemized costs and actual fill price.
        """
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable description of this cost model."""
        ...


class FixedCostModel(CostModel):
    """
    Simple fixed-rate cost model.

    Slippage and spread are modeled as fixed basis points applied
    to the reference price. Commission is a fixed fraction of trade value.

    This is the default model for all V1 backtests.

    Example:
        commission_rate = 0.001 → 0.1% per trade (both sides)
        slippage_bps    = 5     → 5 bps fill price adverse movement
        spread_bps      = 2     → 2 bps per side (4 bps round trip)

    Slippage direction:
        BUY orders fill at reference_price * (1 + slippage_bps/10000)
        SELL orders fill at reference_price * (1 - slippage_bps/10000)

    Cost formula:
        trade_value = quantity * fill_price
        commission  = trade_value * commission_rate
        spread_cost = trade_value * (spread_bps / 10000)
        slippage_cost = quantity * abs(fill_price - reference_price)
    """

    def __init__(
        self,
        commission_rate: float = 0.001,   # 0.1% per trade
        slippage_bps: float = 5.0,        # 5 basis points
        spread_bps: float = 2.0,          # 2 basis points per side
    ) -> None:
        """
        Args:
            commission_rate: Fractional commission per trade (e.g. 0.001 = 0.1%)
            slippage_bps:    Fixed slippage in basis points (e.g. 5 = 5 bps)
            spread_bps:      Half-spread per side in basis points (e.g. 2 = 2 bps)
        """
        if commission_rate < 0:
            raise ValueError(f"commission_rate must be >= 0, got {commission_rate}")
        if slippage_bps < 0:
            raise ValueError(f"slippage_bps must be >= 0, got {slippage_bps}")
        if spread_bps < 0:
            raise ValueError(f"spread_bps must be >= 0, got {spread_bps}")

        self.commission_rate = commission_rate
        self.slippage_bps = slippage_bps
        self.spread_bps = spread_bps

    def calculate(
        self,
        symbol: str,
        side: OrderSide,
        quantity: float,
        reference_price: float,
    ) -> CostBreakdown:
        """
        Calculate costs for a market order fill.

        Slippage moves the fill price away from the reference price:
          BUY:  fill at reference_price * (1 + slippage_bps/10000)
          SELL: fill at reference_price * (1 - slippage_bps/10000)
        """
        slippage_factor = self.slippage_bps / 10_000

        if side == OrderSide.BUY:
            fill_price = reference_price * (1.0 + slippage_factor)
        else:
            fill_price = reference_price * (1.0 - slippage_factor)

        trade_value = quantity * fill_price
        commission = trade_value * self.commission_rate
        slippage_cost = quantity * abs(fill_price - reference_price)
        spread_cost = trade_value * (self.spread_bps / 10_000)

        return CostBreakdown(
            commission=commission,
            slippage=slippage_cost,
            spread=spread_cost,
            fill_price=fill_price,
        )

    @property
    def description(self) -> str:
        return (
            f"FixedCostModel("
            f"commission={self.commission_rate:.4%} "
            f"slippage={self.slippage_bps:.1f}bps "
            f"spread={self.spread_bps:.1f}bps)"
        )

    def __repr__(self) -> str:
        return self.description


class ZeroCostModel(CostModel):
    """
    No transaction costs.
    Use ONLY for theoretical analysis — never for realistic backtests.
    Gross PnL == Net PnL when using this model.
    """

    def calculate(
        self,
        symbol: str,
        side: OrderSide,
        quantity: float,
        reference_price: float,
    ) -> CostBreakdown:
        return CostBreakdown(
            commission=0.0,
            slippage=0.0,
            spread=0.0,
            fill_price=reference_price,
        )

    @property
    def description(self) -> str:
        return "ZeroCostModel (theoretical — no transaction costs)"


def cost_model_from_config(
    commission_rate: float,
    slippage_bps: float,
    spread_bps: float,
) -> CostModel:
    """
    Factory function to create a CostModel from BacktestConfig parameters.
    If all costs are zero, returns ZeroCostModel for clarity.
    """
    if commission_rate == 0 and slippage_bps == 0 and spread_bps == 0:
        return ZeroCostModel()
    return FixedCostModel(
        commission_rate=commission_rate,
        slippage_bps=slippage_bps,
        spread_bps=spread_bps,
    )
