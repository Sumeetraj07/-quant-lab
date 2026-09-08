"""
FastAPI Backend Integration Tests
=================================
Tests for health, auth, strategies, data, and experiment endpoints.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.database import Base, get_db
from backend.main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestingSessionFactory = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def override_get_db():
    async with TestingSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
async def setup_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "version" in data


@pytest.mark.asyncio
async def test_auth_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Register
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={"email": "trader@quantlab.com", "password": "securepassword123", "full_name": "Quant Trader"},
        )
        assert reg_res.status_code == 201
        reg_data = reg_res.json()
        assert reg_data["email"] == "trader@quantlab.com"

        # 2. Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "trader@quantlab.com", "password": "securepassword123"},
        )
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data
        token = token_data["access_token"]

        # 3. Me
        headers = {"Authorization": f"Bearer {token}"}
        me_res = await client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "trader@quantlab.com"


@pytest.mark.asyncio
async def test_list_strategies():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/strategies")
        assert res.status_code == 200
        data = res.json()
        assert data["count"] >= 5
        strategy_ids = [s["id"] for s in data["strategies"]]
        assert "moving_average_momentum" in strategy_ids
        assert "buy_and_hold" in strategy_ids


@pytest.mark.asyncio
async def test_fetch_data_and_create_experiment():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register and Login
        await client.post(
            "/api/v1/auth/register",
            json={"email": "expuser@quantlab.com", "password": "password123", "full_name": "Exp User"},
        )
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "expuser@quantlab.com", "password": "password123"},
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create experiment
        exp_req = {
            "name": "MA Momentum Test",
            "description": "Testing MA momentum on synthetic AAPL",
            "strategy_id": "moving_average_momentum",
            "parameters": {"fast_window": 10, "slow_window": 30},
            "symbols": ["AAPL"],
            "start_date": "2023-01-01",
            "end_date": "2023-12-31",
            "initial_capital": 100000.0,
            "commission_rate": 0.001,
            "slippage_bps": 5.0,
        }
        exp_res = await client.post("/api/v1/experiments", json=exp_req, headers=headers)
        assert exp_res.status_code == 201
        exp_data = exp_res.json()
        exp_id = exp_data["id"]
        assert exp_data["status"] == "completed"

        # Fetch results
        results_res = await client.get(f"/api/v1/experiments/{exp_id}/results", headers=headers)
        assert results_res.status_code == 200
        results_data = results_res.json()
        assert "metrics" in results_data
        assert "equity_curve" in results_data
        assert len(results_data["equity_curve"]) > 0
