"""
Market Data Router
==================
Endpoints for fetching, caching, and querying OHLCV market datasets.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, distinct

from backend.database import get_db
from backend.models import MarketData
from backend.schemas import (
    AvailableSymbolsResponse,
    FetchDataRequest,
    FetchDataResponse,
    OHLCVBarResponse,
)
from quant_engine.data.loaders import DataLoader
from quant_engine.data.providers.alpha_vantage import AlphaVantageProvider
from backend.config import settings

router = APIRouter(prefix="/data", tags=["Market Data"])


@router.post("/fetch", response_model=FetchDataResponse)
async def fetch_market_data(
    req: FetchDataRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch OHLCV market data for a symbol and date range.
    Uses cached DB bars if available, otherwise queries provider (Alpha Vantage or synthetic fallback).
    """
    provider = AlphaVantageProvider(api_key=settings.alpha_vantage_api_key)
    loader = DataLoader(provider=provider)

    try:
        bars = loader.load_daily(
            symbol=req.symbol,
            start=req.start_date,
            end=req.end_date,
            adjusted=req.adjusted,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch market data: {str(e)}",
        )

    bars_response = [
        OHLCVBarResponse(
            symbol=bar.symbol,
            timestamp=bar.timestamp,
            open=float(bar.open),
            high=float(bar.high),
            low=float(bar.low),
            close=float(bar.close),
            volume=bar.volume,
            adjusted=bar.adjusted,
            timeframe=bar.timeframe,
        )
        for bar in bars
    ]

    # Save to market_data cache
    for bar in bars:
        db_bar = MarketData(
            symbol=bar.symbol,
            timestamp=bar.timestamp,
            timeframe=bar.timeframe,
            open=float(bar.open),
            high=float(bar.high),
            low=float(bar.low),
            close=float(bar.close),
            volume=bar.volume,
            adjusted=bar.adjusted,
            source=provider.metadata.name,
        )
        await db.merge(db_bar)

    return FetchDataResponse(
        symbol=req.symbol,
        timeframe=req.timeframe,
        start_date=req.start_date,
        end_date=req.end_date,
        bar_count=len(bars_response),
        bars=bars_response,
        warnings=[],
        source=provider.metadata.name,
        fetched_at=datetime.now(timezone.utc),
    )


@router.get("/symbols", response_model=AvailableSymbolsResponse)
async def get_available_symbols(db: AsyncSession = Depends(get_db)):
    """List all symbols currently cached in the database."""
    result = await db.execute(select(distinct(MarketData.symbol)))
    symbols = [r[0] for r in result.fetchall() if r[0]]
    if not symbols:
        # Default suggested symbols if DB empty
        symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "SPY"]
    return AvailableSymbolsResponse(
        symbols=symbols,
        count=len(symbols),
        source="database_cache",
    )


@router.get("/bars", response_model=list[OHLCVBarResponse])
async def query_bars(
    symbol: str = Query(..., description="Ticker symbol"),
    timeframe: str = Query("1d", description="Timeframe"),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Query cached OHLCV bars from DB."""
    stmt = select(MarketData).where(
        MarketData.symbol == symbol.upper(),
        MarketData.timeframe == timeframe,
    )
    if start_date:
        stmt = stmt.where(MarketData.timestamp >= start_date)
    if end_date:
        stmt = stmt.where(MarketData.timestamp <= end_date)

    stmt = stmt.order_by(MarketData.timestamp.asc())
    result = await db.execute(stmt)
    bars = result.scalars().all()

    return [
        OHLCVBarResponse(
            symbol=b.symbol,
            timestamp=b.timestamp,
            open=b.open,
            high=b.high,
            low=b.low,
            close=b.close,
            volume=b.volume,
            adjusted=b.adjusted,
            timeframe=b.timeframe,
        )
        for b in bars
    ]
