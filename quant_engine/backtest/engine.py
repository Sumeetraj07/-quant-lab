"""
Event-Driven Backtesting Engine
=================================
The core engine that orchestrates the full backtest pipeline.

Pipeline (per bar):
  1. ExecutionSimulator processes pending orders → FillEvents
  2. PortfolioManager processes fills
  3. Strategy receives bar → generates Signals
  4. RiskChecker filters signals
  5. OrderRouter converts approved signals → Orders
  6. ExecutionSimulator queues orders for NEXT bar

Temporal causality guarantee:
  - Orders generated at bar T can only fill at bar T+1 or later.
  - The strategy sees bar T's data AFTER fills from T-1 are processed.
  - The strategy CANNOT see bar T+1's open or close.

This is the primary mechanism preventing look-ahead bias.
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

import pandas as pd

from quant_engine.backtest.data_feed import HistoricalDataFeed
from quant_engine.backtest.events import (
    EndOfDataEvent,
    FillEvent,
    MarketBarEvent,
    OrderEvent,
    SignalEvent,
)
from quant_engine.backtest.risk_checker import RiskChecker
from quant_engine.costs.models import CostModel, FixedCostModel, cost_model_from_config
from quant_engine.domain import (
    BacktestConfig,
    BacktestResult,
    Direction,
    MarketBar,
    Order,
    OrderSide,
    OrderType,
    PerformanceMetrics,
    PositionSizingMethod,
)
from quant_engine.execution.simulator import ExecutionSimulator
from quant_engine.metrics.performance import calculate_performance_metrics
from quant_engine.portfolio.manager import PortfolioManager
from quant_engine.strategies.base import Strategy

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# 252 trading days per year — standard quant assumption
TRADING_DAYS_PER_YEAR = 252


class BacktestEngine:
    """
    Event-driven backtesting engine.

    Usage:
        engine = BacktestEngine()
        result = engine.run(
            config=config,
            strategy=strategy,
            bars=bars,            # list[MarketBar] for the symbol(s)
        )
        print(result.summary())

    The engine enforces:
      - Strict temporal ordering of events
      - No look-ahead bias (orders execute at next bar open)
      - Full cost accounting (commission + slippage + spread)
      - Complete trade and portfolio recording
    """

    def run(
        self,
        config: BacktestConfig,
        strategy: Strategy,
        bars: list[MarketBar],
        benchmark_bars: list[MarketBar] | None = None,
        progress_callback: Any | None = None,
    ) -> BacktestResult:
        """
        Run a complete backtest.

        Args:
            config:             Complete backtest configuration
            strategy:           Initialized strategy instance
            bars:               Historical bars sorted by timestamp ascending
            benchmark_bars:     Optional benchmark bars (e.g. SPY for Buy & Hold)
            progress_callback:  Optional callable(progress: float) for async jobs

        Returns:
            BacktestResult with equity curve, trades, and all performance metrics.
        """
        start_time = time.perf_counter()
        run_id = str(uuid.uuid4())[:8]
        logger.info(
            "Backtest[%s] starting: strategy=%s symbols=%s period=%s→%s capital=%.0f",
            run_id,
            config.strategy_id,
            config.symbols,
            config.start_date,
            config.end_date,
            config.initial_capital,
        )

        # 1. Initialize components
        cost_model = cost_model_from_config(
            commission_rate=config.commission_rate,
            slippage_bps=config.slippage_bps,
            spread_bps=config.spread_bps,
        )
        portfolio_manager = PortfolioManager(config.initial_capital)
        execution_simulator = ExecutionSimulator(cost_model)
        risk_checker = RiskChecker(
            max_position_pct=0.50,  # Max 50% of equity in any single position
            max_drawdown_halt=0.40,  # Halt if drawdown exceeds 40%
        )

        # 2. Reset and initialize strategy
        strategy.reset()
        strategy.initialize_from_config(config.parameters)

        # 3. Create data feed (enforces chronological order)
        feed = HistoricalDataFeed(bars)

        # 4. State tracking
        portfolio_snapshots: list[dict[str, Any]] = []
        warnings: list[str] = []
        bar_count = 0
        last_bar: MarketBar | None = None

        # Multi-bar tracking: current prices dict for multi-symbol
        current_prices: dict[str, float] = {}

        # 5. Main event loop
        for event in feed:
            if isinstance(event, EndOfDataEvent):
                logger.info("Backtest[%s]: data feed exhausted after %d bars.", run_id, bar_count)
                break

            if not isinstance(event, MarketBarEvent):
                continue

            bar = event.bar
            last_bar = bar
            bar_count += 1

            # Update current prices (for multi-symbol portfolios)
            current_prices[bar.symbol] = bar.close

            # STEP A: Process pending orders from PREVIOUS bar at THIS bar's open
            # This is the temporal causality enforcement point.
            fills = execution_simulator.process_bar(bar)
            for fill_event in fills:
                portfolio_manager.process_fill(fill_event.fill)

            # STEP B: Check if we should halt due to drawdown
            current_equity = portfolio_manager.equity(current_prices)
            drawdown = (current_equity - config.initial_capital) / config.initial_capital
            if risk_checker.should_halt(current_equity, config.initial_capital):
                warnings.append(
                    f"Backtest halted at {bar.timestamp.date()}: "
                    f"drawdown limit exceeded ({drawdown:.1%})"
                )
                logger.warning(
                    "Backtest[%s] halted at %s: drawdown=%.1%",
                    run_id, bar.timestamp.date(), drawdown,
                )
                break

            # STEP C: Strategy generates signals from THIS bar's data
            # Strategy sees bar.open, bar.high, bar.low, bar.close — ALL of bar T.
            # But fills won't happen until bar T+1.
            signals = strategy.on_bar(bar, portfolio_manager.portfolio)

            # STEP D: Risk checker filters signals
            approved_signals = risk_checker.filter_signals(
                signals, portfolio_manager, current_prices
            )

            # STEP E: Convert approved signals to orders
            # Orders are queued — NOT executed yet (will execute at next bar's open)
            for signal in approved_signals:
                order = self._signal_to_order(
                    signal=signal,
                    bar=bar,
                    portfolio_manager=portfolio_manager,
                    current_prices=current_prices,
                    config=config,
                )
                if order is not None:
                    execution_simulator.submit_order(order)

            # STEP F: Snapshot portfolio after all processing
            snap = portfolio_manager.snapshot(bar, current_prices)
            portfolio_snapshots.append(snap)

            # Progress reporting (for async job updates)
            if progress_callback is not None and bar_count % 50 == 0:
                progress = feed.progress_pct
                progress_callback(progress)

        # 6. Close any remaining open positions at last bar's close
        if last_bar is not None and execution_simulator.has_pending_orders:
            warnings.append(
                f"Cancelled {execution_simulator.pending_order_count} pending orders at end of data."
            )
            execution_simulator.cancel_all_orders()

        # 7. Build equity curve as a pandas Series
        equity_series = portfolio_manager.get_equity_series()
        if not equity_series:
            raise BacktestError("Backtest produced no equity curve — no bars were processed.")

        timestamps, equities = zip(*equity_series)
        equity_curve = pd.Series(
            data=list(equities),
            index=pd.DatetimeIndex(list(timestamps), tz="UTC"),
            name="equity",
        )

        # 8. Calculate drawdown series
        running_max = equity_curve.cummax()
        drawdown_series = (equity_curve - running_max) / running_max
        drawdown_series.name = "drawdown"

        # 9. Calculate performance metrics
        trades = portfolio_manager.trades
        metrics = calculate_performance_metrics(
            equity_curve=equity_curve,
            trades=trades,
            initial_capital=config.initial_capital,
            risk_free_rate=config.risk_free_rate,
        )

        # 10. Run benchmark if provided
        benchmark_metrics: PerformanceMetrics | None = None
        benchmark_equity_curve: pd.Series | None = None
        if benchmark_bars:
            try:
                benchmark_result = self._run_benchmark(
                    benchmark_bars=benchmark_bars,
                    initial_capital=config.initial_capital,
                    cost_model=cost_model,
                )
                benchmark_metrics = benchmark_result[0]
                benchmark_equity_curve = benchmark_result[1]
            except Exception as exc:
                warnings.append(f"Benchmark calculation failed: {exc}")
                logger.warning("Benchmark failed: %s", exc)

        elapsed = time.perf_counter() - start_time
        logger.info(
            "Backtest[%s] complete: %d bars in %.2fs | "
            "return=%.2f%% sharpe=%.2f max_dd=%.2f%%",
            run_id, bar_count, elapsed,
            metrics.total_return * 100,
            metrics.sharpe_ratio,
            metrics.max_drawdown * 100,
        )

        return BacktestResult(
            config=config,
            metrics=metrics,
            equity_curve=equity_curve,
            drawdown_series=drawdown_series,
            trades=trades,
            portfolio_snapshots=portfolio_snapshots,
            benchmark_metrics=benchmark_metrics,
            benchmark_equity_curve=benchmark_equity_curve,
            warnings=warnings,
            run_duration_seconds=elapsed,
        )

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _signal_to_order(
        self,
        signal: Any,
        bar: MarketBar,
        portfolio_manager: PortfolioManager,
        current_prices: dict[str, float],
        config: BacktestConfig,
    ) -> Order | None:
        """
        Convert a signal into an order with appropriate sizing.

        Returns None if no order should be placed (e.g. already in position).
        """
        symbol = signal.symbol
        current_position_qty = portfolio_manager.position_quantity(symbol)
        current_price = current_prices.get(symbol, bar.close)

        if signal.direction == Direction.FLAT:
            # Exit signal — close position if we have one
            if current_position_qty == 0:
                return None
            side = OrderSide.SELL if current_position_qty > 0 else OrderSide.BUY
            quantity = abs(current_position_qty)
        elif signal.direction == Direction.LONG:
            if current_position_qty > 0:
                return None  # Already long — no action
            if current_position_qty < 0:
                # Close short first
                return Order(
                    symbol=symbol,
                    timestamp=bar.timestamp,
                    side=OrderSide.BUY,
                    order_type=OrderType.MARKET,
                    quantity=abs(current_position_qty),
                    strategy_id=config.strategy_id,
                )
            side = OrderSide.BUY
            quantity = self._calculate_quantity(
                config=config,
                portfolio_manager=portfolio_manager,
                current_prices=current_prices,
                symbol=symbol,
                price=current_price,
            )
        elif signal.direction == Direction.SHORT:
            if current_position_qty < 0:
                return None  # Already short — no action
            if current_position_qty > 0:
                # Close long first
                return Order(
                    symbol=symbol,
                    timestamp=bar.timestamp,
                    side=OrderSide.SELL,
                    order_type=OrderType.MARKET,
                    quantity=abs(current_position_qty),
                    strategy_id=config.strategy_id,
                )
            side = OrderSide.SELL
            quantity = self._calculate_quantity(
                config=config,
                portfolio_manager=portfolio_manager,
                current_prices=current_prices,
                symbol=symbol,
                price=current_price,
            )
        else:
            return None

        if quantity <= 0:
            return None

        return Order(
            symbol=symbol,
            timestamp=bar.timestamp,
            side=side,
            order_type=OrderType.MARKET,
            quantity=quantity,
            strategy_id=config.strategy_id,
        )

    def _calculate_quantity(
        self,
        config: BacktestConfig,
        portfolio_manager: PortfolioManager,
        current_prices: dict[str, float],
        symbol: str,
        price: float,
    ) -> float:
        """Calculate order quantity based on position sizing method."""
        price = float(price)
        equity = portfolio_manager.equity(current_prices)
        sizing = config.position_sizing
        param = config.sizing_parameter

        if sizing == PositionSizingMethod.FIXED_QUANTITY:
            return max(1.0, float(param))

        elif sizing == PositionSizingMethod.FIXED_CAPITAL:
            if price > 0:
                capital_to_deploy = min(float(param), portfolio_manager.cash * 0.99)
                return max(1.0, capital_to_deploy / price)
            return 0.0

        elif sizing == PositionSizingMethod.PERCENTAGE_ALLOCATION:
            pct = min(max(float(param), 0.0), 1.0)  # Clamp to [0, 1]
            capital_to_deploy = equity * pct
            available_cash = portfolio_manager.cash * 0.99  # Safety margin
            capital_to_deploy = min(capital_to_deploy, available_cash)
            if price > 0 and capital_to_deploy > 0:
                return max(1.0, capital_to_deploy / price)
            return 0.0

        elif sizing in (PositionSizingMethod.RISK_BASED, PositionSizingMethod.VOLATILITY_TARGET):
            # Simplified: use 10% allocation as fallback until volatility targeting is wired
            pct = 0.10
            capital_to_deploy = min(equity * pct, portfolio_manager.cash * 0.99)
            if price > 0 and capital_to_deploy > 0:
                return max(1.0, capital_to_deploy / price)
            return 0.0

        return 0.0

    def _run_benchmark(
        self,
        benchmark_bars: list[MarketBar],
        initial_capital: float,
        cost_model: CostModel,
    ) -> tuple[PerformanceMetrics, pd.Series]:
        """
        Run a buy-and-hold benchmark on the provided bars.
        Buys on first bar open, holds until last bar close.
        """
        from quant_engine.strategies.buy_and_hold import BuyAndHoldStrategy
        from quant_engine.domain import BacktestConfig, PositionSizingMethod
        from datetime import date

        if not benchmark_bars:
            raise ValueError("No benchmark bars provided.")

        bm_config = BacktestConfig(
            strategy_id="buy_and_hold_benchmark",
            parameters={},
            symbols=[benchmark_bars[0].symbol],
            start_date=benchmark_bars[0].timestamp.date(),
            end_date=benchmark_bars[-1].timestamp.date(),
            timeframe="1d",
            initial_capital=initial_capital,
            commission_rate=0.0,     # Zero cost benchmark
            slippage_bps=0.0,
            spread_bps=0.0,
            position_sizing=PositionSizingMethod.PERCENTAGE_ALLOCATION,
            sizing_parameter=0.99,
        )

        bm_strategy = BuyAndHoldStrategy()
        bm_result = self.run(
            config=bm_config,
            strategy=bm_strategy,
            bars=benchmark_bars,
        )
        return bm_result.metrics, bm_result.equity_curve


class BacktestError(Exception):
    """Raised when the backtest engine encounters a fatal error."""
