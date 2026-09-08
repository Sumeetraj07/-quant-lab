"""
PnL Accounting Tests
=====================
Verifies that the portfolio manager correctly accounts for:
  - Cash decreases on BUY fills
  - Cash increases on SELL fills
  - Realized PnL calculation on round trips
  - Cost deduction from net PnL
  - Position quantity tracking
"""

from __future__ import annotations

import pytest
from datetime import datetime, timezone

from quant_engine.domain import Fill, Order, OrderSide, OrderType
from quant_engine.portfolio.manager import PortfolioManager
from quant_engine.costs.models import FixedCostModel, ZeroCostModel
from quant_engine.execution.simulator import ExecutionSimulator
from quant_engine.domain import MarketBar


def make_fill(
    symbol: str = "AAPL",
    side: OrderSide = OrderSide.BUY,
    quantity: float = 100.0,
    fill_price: float = 100.0,
    commission: float = 0.0,
    slippage: float = 0.0,
    spread_cost: float = 0.0,
    ts: str = "2020-01-01",
) -> Fill:
    import uuid
    return Fill(
        fill_id=str(uuid.uuid4()),
        order_id=str(uuid.uuid4()),
        symbol=symbol,
        timestamp=datetime.strptime(ts, "%Y-%m-%d").replace(tzinfo=timezone.utc),
        side=side,
        quantity=quantity,
        fill_price=fill_price,
        commission=commission,
        slippage=slippage,
        spread_cost=spread_cost,
    )


class TestCashAccounting:

    def test_buy_decreases_cash(self):
        """BUY fill should reduce cash by quantity × price + costs."""
        pm = PortfolioManager(initial_capital=100_000)
        fill = make_fill(side=OrderSide.BUY, quantity=100, fill_price=50.0)

        pm.process_fill(fill)

        expected_cash = 100_000 - (100 * 50.0)
        assert pm.cash == pytest.approx(expected_cash, rel=1e-6), (
            f"Expected cash={expected_cash}, got {pm.cash}"
        )

    def test_sell_increases_cash(self):
        """SELL fill should increase cash by quantity × price - costs."""
        pm = PortfolioManager(initial_capital=100_000)

        # First buy to establish position
        buy_fill = make_fill(side=OrderSide.BUY, quantity=100, fill_price=50.0, ts="2020-01-01")
        pm.process_fill(buy_fill)

        cash_after_buy = pm.cash

        # Now sell
        sell_fill = make_fill(side=OrderSide.SELL, quantity=100, fill_price=60.0, ts="2020-01-02")
        pm.process_fill(sell_fill)

        expected_cash = cash_after_buy + (100 * 60.0)
        assert pm.cash == pytest.approx(expected_cash, rel=1e-6)

    def test_commission_deducted_from_cash(self):
        """Commission should reduce cash beyond just the trade value."""
        pm = PortfolioManager(initial_capital=100_000)
        commission = 10.0
        fill = make_fill(
            side=OrderSide.BUY,
            quantity=100,
            fill_price=50.0,
            commission=commission,
        )

        pm.process_fill(fill)

        expected_cash = 100_000 - (100 * 50.0) - commission
        assert pm.cash == pytest.approx(expected_cash, rel=1e-6)

    def test_all_costs_deducted(self):
        """All three cost components reduce cash."""
        pm = PortfolioManager(initial_capital=100_000)
        fill = make_fill(
            side=OrderSide.BUY,
            quantity=100,
            fill_price=50.0,
            commission=5.0,
            slippage=3.0,
            spread_cost=2.0,
        )

        pm.process_fill(fill)

        total_costs = 5.0 + 3.0 + 2.0
        expected_cash = 100_000 - (100 * 50.0) - total_costs
        assert pm.cash == pytest.approx(expected_cash, rel=1e-6)


class TestPositionTracking:

    def test_buy_creates_long_position(self):
        """BUY fill should create a long position."""
        pm = PortfolioManager(initial_capital=100_000)
        fill = make_fill(side=OrderSide.BUY, quantity=100, fill_price=50.0)
        pm.process_fill(fill)

        pos = pm.get_position("AAPL")
        assert pos.quantity == pytest.approx(100.0)
        assert pos.avg_entry_price == pytest.approx(50.0)
        assert pos.is_long

    def test_sell_reduces_position(self):
        """Selling half should halve the position quantity."""
        pm = PortfolioManager(initial_capital=100_000)

        pm.process_fill(make_fill(side=OrderSide.BUY, quantity=100, fill_price=50.0, ts="2020-01-01"))
        pm.process_fill(make_fill(side=OrderSide.SELL, quantity=50, fill_price=55.0, ts="2020-01-02"))

        pos = pm.get_position("AAPL")
        assert pos.quantity == pytest.approx(50.0)
        assert pos.is_long

    def test_full_sell_closes_position(self):
        """Selling all shares should result in zero position."""
        pm = PortfolioManager(initial_capital=100_000)

        pm.process_fill(make_fill(side=OrderSide.BUY, quantity=100, fill_price=50.0, ts="2020-01-01"))
        pm.process_fill(make_fill(side=OrderSide.SELL, quantity=100, fill_price=60.0, ts="2020-01-02"))

        pos = pm.get_position("AAPL")
        assert pos.is_flat, "Position should be flat after full sell"


class TestEquityCalculation:

    def test_equity_equals_cash_plus_position_value(self):
        """Equity must always equal cash + (quantity × current_price)."""
        pm = PortfolioManager(initial_capital=100_000)
        fill = make_fill(side=OrderSide.BUY, quantity=100, fill_price=50.0)
        pm.process_fill(fill)

        current_price = 55.0
        current_prices = {"AAPL": current_price}

        expected_equity = pm.cash + (100 * current_price)
        assert pm.equity(current_prices) == pytest.approx(expected_equity, rel=1e-6)

    def test_initial_equity_equals_initial_capital(self):
        """Before any trades, equity should equal initial capital."""
        pm = PortfolioManager(initial_capital=100_000)
        assert pm.equity({}) == pytest.approx(100_000.0)


class TestCostModel:

    def test_fixed_cost_model_buy_slippage(self):
        """BUY should fill at a HIGHER price than reference due to slippage."""
        model = FixedCostModel(commission_rate=0.0, slippage_bps=10.0, spread_bps=0.0)
        breakdown = model.calculate("AAPL", OrderSide.BUY, 100, 100.0)

        assert breakdown.fill_price > 100.0, \
            "BUY slippage should increase fill price above reference"
        assert breakdown.fill_price == pytest.approx(100.0 * (1 + 10/10000))

    def test_fixed_cost_model_sell_slippage(self):
        """SELL should fill at a LOWER price than reference due to slippage."""
        model = FixedCostModel(commission_rate=0.0, slippage_bps=10.0, spread_bps=0.0)
        breakdown = model.calculate("AAPL", OrderSide.SELL, 100, 100.0)

        assert breakdown.fill_price < 100.0, \
            "SELL slippage should reduce fill price below reference"

    def test_zero_cost_model_no_costs(self):
        """ZeroCostModel must produce zero costs and fill at reference price."""
        model = ZeroCostModel()
        breakdown = model.calculate("AAPL", OrderSide.BUY, 100, 100.0)

        assert breakdown.commission == 0.0
        assert breakdown.slippage == 0.0
        assert breakdown.spread == 0.0
        assert breakdown.fill_price == pytest.approx(100.0)

    def test_net_pnl_less_than_gross_with_costs(self):
        """Net PnL must always be <= gross PnL when costs > 0."""
        model = FixedCostModel(commission_rate=0.001, slippage_bps=5.0, spread_bps=2.0)

        buy_cost = model.calculate("AAPL", OrderSide.BUY, 100, 100.0)
        sell_cost = model.calculate("AAPL", OrderSide.SELL, 100, 110.0)

        gross_pnl = 100 * (110.0 - 100.0)
        total_costs = buy_cost.total + sell_cost.total
        net_pnl = gross_pnl - total_costs

        assert net_pnl < gross_pnl, \
            f"Net PnL {net_pnl} must be less than gross PnL {gross_pnl}"
        assert total_costs > 0, "Total costs must be positive"
