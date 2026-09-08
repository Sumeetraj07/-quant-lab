"""
Strategy Base Class
====================
Abstract interface that all trading strategies must implement.

Design principles:
  1. Strategies are stateful — they track indicators between bars.
  2. Strategies can only see the current bar and past state.
  3. Strategies have no knowledge of portfolio state (separation of concerns).
     The engine passes portfolio state when needed (e.g. for position sizing hints).
  4. Strategies must be resettable (for parameter search, walk-forward).
  5. Strategies declare their parameter schema (for validation).

Adding a new strategy:
  1. Subclass Strategy
  2. Implement: name, parameter_schema, initialize(), on_bar(), reset()
  3. Register it in strategies/registry.py
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

from quant_engine.domain import MarketBar, Portfolio, Signal

logger = logging.getLogger(__name__)


class Strategy(ABC):
    """
    Abstract base class for all QuantLab trading strategies.

    Lifecycle:
        1. strategy.initialize(config)   — called once before backtest
        2. strategy.on_bar(bar, portfolio) — called on every bar
        3. strategy.reset()              — called before re-run (param search)

    The on_bar method must only use data from the current bar and internal state
    accumulated from past bars. It must NOT access future bar data.

    Returns from on_bar:
        - Empty list → no action this bar
        - [Signal(LONG)]  → enter or maintain long position
        - [Signal(FLAT)]  → exit current position
        - [Signal(SHORT)] → enter or maintain short (if supported)
    """

    def __init__(self) -> None:
        self._config: dict[str, Any] = {}
        self._initialized = False

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique strategy identifier. Used for logging and registration."""
        ...

    @property
    @abstractmethod
    def parameter_schema(self) -> dict[str, Any]:
        """
        JSON Schema defining valid parameters for this strategy.
        Used to validate user input before running a backtest.

        Example:
            {
                "type": "object",
                "properties": {
                    "fast_window": {"type": "integer", "minimum": 2, "maximum": 50},
                    "slow_window": {"type": "integer", "minimum": 10, "maximum": 500},
                },
                "required": ["fast_window", "slow_window"]
            }
        """
        ...

    @abstractmethod
    def initialize(self, config: dict[str, Any]) -> None:
        """
        Initialize strategy state from config parameters.
        Called once before the backtest starts.

        Args:
            config: Dict of strategy-specific parameters matching parameter_schema.
        """
        ...

    @abstractmethod
    def on_bar(self, bar: MarketBar, portfolio: "Portfolio") -> list[Signal]:
        """
        Process a new market bar and return signals.

        TEMPORAL CONSTRAINT: This method may only use:
          - bar (current bar data)
          - Internal state accumulated from previous on_bar() calls
          - portfolio (current portfolio state)

        It must NOT access:
          - Future bar prices
          - Any bar data beyond the current one

        Args:
            bar:       Current market bar (the strategy can see this bar's OHLCV)
            portfolio: Current portfolio state (read-only in this context)

        Returns:
            List of Signal objects. Empty list = no trade recommendation.
        """
        ...

    @abstractmethod
    def reset(self) -> None:
        """
        Reset all internal state to initial values.
        Called between backtest runs (parameter search, walk-forward).
        After reset, the strategy behaves as if newly instantiated.
        """
        ...

    def initialize_from_config(self, config: dict[str, Any]) -> None:
        """
        Validate config against parameter_schema, then call initialize().
        This is the preferred entry point — always validates before initializing.
        """
        self._validate_config(config)
        self._config = config.copy()
        self.initialize(config)
        self._initialized = True
        logger.info(
            "Strategy '%s' initialized with config: %s", self.name, config
        )

    def _validate_config(self, config: dict[str, Any]) -> None:
        """
        Basic parameter validation against parameter_schema.
        Subclasses can override for more specific validation.
        """
        schema = self.parameter_schema
        required = schema.get("required", [])
        for key in required:
            if key not in config:
                raise StrategyConfigError(
                    f"Strategy '{self.name}' requires parameter '{key}' "
                    f"but it was not provided."
                )
        props = schema.get("properties", {})
        for key, value in config.items():
            if key in props:
                prop_schema = props[key]
                # Type check
                expected_type = prop_schema.get("type")
                if expected_type == "integer" and not isinstance(value, int):
                    raise StrategyConfigError(
                        f"Parameter '{key}' must be an integer, got {type(value).__name__}"
                    )
                if expected_type == "number" and not isinstance(value, (int, float)):
                    raise StrategyConfigError(
                        f"Parameter '{key}' must be a number, got {type(value).__name__}"
                    )
                # Range check
                if "minimum" in prop_schema and value < prop_schema["minimum"]:
                    raise StrategyConfigError(
                        f"Parameter '{key}' = {value} is below minimum {prop_schema['minimum']}"
                    )
                if "maximum" in prop_schema and value > prop_schema["maximum"]:
                    raise StrategyConfigError(
                        f"Parameter '{key}' = {value} exceeds maximum {prop_schema['maximum']}"
                    )

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(config={self._config})"


class StrategyConfigError(Exception):
    """Raised when a strategy receives invalid configuration."""
