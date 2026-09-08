"""
Strategy Registry
==================
Central registry mapping strategy names to strategy classes.

Usage:
    from quant_engine.strategies.registry import StrategyRegistry

    # List all strategies
    names = StrategyRegistry.list()

    # Create an instance
    strategy = StrategyRegistry.create("moving_average_momentum")

    # Get the class
    klass = StrategyRegistry.get("buy_and_hold")

Adding new strategies:
    Import the class and add it to _REGISTRY below.
    No other changes needed.
"""

from __future__ import annotations

from typing import Any

from quant_engine.strategies.base import Strategy
from quant_engine.strategies.bollinger import BollingerMeanReversionStrategy
from quant_engine.strategies.breakout import BreakoutStrategy
from quant_engine.strategies.buy_and_hold import BuyAndHoldStrategy
from quant_engine.strategies.moving_average import MovingAverageMomentumStrategy
from quant_engine.strategies.volatility_targeting import VolatilityTargetingStrategy

_REGISTRY: dict[str, type[Strategy]] = {
    "buy_and_hold": BuyAndHoldStrategy,
    "moving_average_momentum": MovingAverageMomentumStrategy,
    "bollinger_mean_reversion": BollingerMeanReversionStrategy,
    "breakout": BreakoutStrategy,
    "volatility_targeting": VolatilityTargetingStrategy,
}


class StrategyRegistry:
    """Static registry for all available strategies."""

    @staticmethod
    def list() -> list[str]:
        """Return a sorted list of all registered strategy names."""
        return sorted(_REGISTRY.keys())

    @staticmethod
    def list_names() -> list[str]:
        """Alias for list()."""
        return StrategyRegistry.list()

    @classmethod
    def list_strategies(cls) -> list[dict[str, Any]]:
        """Return detailed info (id, name, description, parameter_schema) for all registered strategies."""
        result = []
        for name in cls.list():
            klass = cls.get(name)
            instance = klass()
            result.append({
                "id": name,
                "name": getattr(instance, "name", name),
                "description": getattr(instance, "description", instance.__doc__ or ""),
                "parameter_schema": getattr(instance, "parameter_schema", {}),
            })
        return result

    @classmethod
    def __contains__(cls, name: object) -> bool:
        return name in _REGISTRY

    @staticmethod
    def get(name: str) -> type[Strategy]:
        """
        Get the strategy class by name.

        Raises:
            KeyError: If strategy name is not registered.
        """
        if name not in _REGISTRY:
            available = ", ".join(sorted(_REGISTRY.keys()))
            raise KeyError(
                f"Strategy '{name}' is not registered. "
                f"Available strategies: {available}"
            )
        return _REGISTRY[name]

    @staticmethod
    def create(name: str) -> Strategy:
        """
        Create a new (uninitialized) strategy instance.
        Call strategy.initialize_from_config(params) before use.

        Raises:
            KeyError: If strategy name is not registered.
        """
        klass = StrategyRegistry.get(name)
        return klass()

    @staticmethod
    def register(name: str, klass: type[Strategy]) -> None:
        """
        Register a new strategy class at runtime.
        Useful for plugins and ML strategies.
        """
        if not issubclass(klass, Strategy):
            raise TypeError(
                f"'{klass.__name__}' must be a subclass of Strategy"
            )
        _REGISTRY[name] = klass

    @staticmethod
    def schemas() -> dict[str, dict]:
        """Return parameter schemas for all registered strategies."""
        result = {}
        for name, klass in _REGISTRY.items():
            instance = klass()
            result[name] = instance.parameter_schema
        return result
