"""
Strategies Router
=================
Endpoints for discovering and inspecting available trading strategies.
"""

from fastapi import APIRouter
from backend.schemas import StrategiesListResponse, StrategyInfo
from quant_engine.strategies.registry import StrategyRegistry

router = APIRouter(prefix="/strategies", tags=["Strategies"])


@router.get("", response_model=StrategiesListResponse)
async def list_strategies():
    """List all available strategy classes registered in QuantEngine."""
    strategies_data = StrategyRegistry.list_strategies()
    result = [
        StrategyInfo(
            id=item["id"],
            name=item["name"],
            description=item["description"],
            parameter_schema=item["parameter_schema"],
        )
        for item in strategies_data
    ]
    return StrategiesListResponse(strategies=result, count=len(result))
