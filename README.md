# QuantLab — AI Quant Research & Backtesting Platform

> **Note**: This is a research and backtesting platform. All results are simulated historical performance. Past performance does not guarantee future results. QuantLab does not execute real-money trades.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running Tests](#running-tests)
- [API Usage](#api-usage)
- [Backtesting Methodology](#backtesting-methodology)
- [Quant Assumptions & Limitations](#quant-assumptions--limitations)
- [Known Limitations](#known-limitations)
- [Deployment](#deployment)
- [Roadmap](#roadmap)

---

## Overview

QuantLab is a production-grade quantitative research and backtesting platform. It enables users to:

- Retrieve and manage historical market data from multiple providers.
- Configure and backtest quantitative trading strategies.
- Simulate realistic execution with commissions, spread, and slippage.
- Track portfolio value, positions, and PnL.
- Calculate professional performance and risk metrics.
- Compare strategies against benchmarks.
- Run parameter sweeps and walk-forward validation.
- Execute backtests asynchronously via a Celery/Redis task queue.
- Visualize results in a modern React dashboard.
- Run ML-based strategy experiments.
- Use an AI research assistant to translate natural-language research ideas into validated backtest configurations.

---

## Features

| Feature | Status |
|---|---|
| Market data ingestion (Alpha Vantage) | ✅ |
| Data validation pipeline | ✅ |
| Event-driven backtesting engine | ✅ |
| Transaction costs (commission, slippage, spread) | ✅ |
| Portfolio accounting | ✅ |
| Performance metrics (Sharpe, CAGR, drawdown, …) | ✅ |
| Risk metrics (VaR, CVaR, beta, exposure) | ✅ |
| 5 built-in strategies | ✅ |
| Benchmark comparison | ✅ |
| Parameter search | ✅ |
| Walk-forward validation | ✅ |
| Monte Carlo simulation | ✅ |
| Feature engineering library | ✅ |
| Async backtest jobs (Celery + Redis) | ✅ |
| REST API (FastAPI) | ✅ |
| Experiment tracking & reproduction | ✅ |
| React dashboard with charts | ✅ |
| ML strategy module | ✅ |
| AI research assistant | ✅ |
| Authentication & authorization | ✅ |
| Docker Compose development environment | ✅ |
| GitHub Actions CI | ✅ |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│              React + Vite + TanStack Query              │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│                   FastAPI (Uvicorn)                      │
│  /api/v1/auth  /backtests  /jobs  /experiments  /ai     │
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Services  │  │ Repositories │  │  Quant Engine   │ │
│  └────────────┘  └──────┬───────┘  └────────┬────────┘ │
└─────────────────────────┼──────────────────┼────────────┘
                          │                  │
          ┌───────────────▼───┐    ┌─────────▼──────────┐
          │   PostgreSQL 16   │    │   Celery Workers   │
          │   (TimescaleDB)   │    │  (Redis broker)    │
          └───────────────────┘    └────────────────────┘
```

### Data Flow — Backtest Request

```
User (UI)
  → POST /api/v1/backtests
  → FastAPI creates Job (QUEUED)
  → Celery task dispatched to Redis
  → Worker: fetch data → validate → run BacktestEngine
  → BacktestEngine: DataFeed → Strategy → Signal → Risk Check
                    → Order → ExecutionSimulator → Fill
                    → PortfolioManager → PnL → Metrics
  → Worker saves BacktestResult to PostgreSQL
  → Job status → COMPLETED
  → Frontend polls /api/v1/jobs/{id} → redirects to results
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Charting | Apache ECharts |
| Data Fetching | TanStack Query v5 |
| Routing | React Router v6 |
| Backend | FastAPI, Uvicorn |
| Validation | Pydantic v2 |
| ORM | SQLAlchemy 2 (async) |
| Migrations | Alembic |
| Task Queue | Celery 5 |
| Broker/Cache | Redis 7 |
| Database | PostgreSQL 16 |
| Quant | NumPy, Pandas, SciPy, scikit-learn, statsmodels |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Testing | pytest, pytest-asyncio, HTTPX |
| Linting | ruff |
| Type Checking | mypy |
| Infrastructure | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Cloud | AWS (ECS Fargate, RDS, ElastiCache) |

---

## Repository Structure

```
quantlab/
├── backend/               FastAPI application
│   └── app/
│       ├── api/routes/    Route handlers
│       ├── core/          Config, DB, security
│       ├── models/        SQLAlchemy ORM models
│       ├── schemas/       Pydantic request/response schemas
│       ├── services/      Business logic
│       ├── repositories/  Data access layer
│       ├── workers/       Celery tasks
│       └── main.py        Application entrypoint
│
├── quant_engine/          Pure quantitative engine (no FastAPI dependency)
│   ├── data/              Data ingestion, validation, normalization
│   ├── backtest/          Event-driven backtesting engine
│   ├── strategies/        Strategy base class + implementations
│   ├── portfolio/         Portfolio accounting + position sizing
│   ├── execution/         Order execution simulation
│   ├── risk/              Risk engine
│   ├── metrics/           Performance analytics
│   ├── costs/             Transaction cost models
│   ├── features/          Feature engineering library
│   └── domain.py          Core domain dataclasses
│
├── ml/                    ML research module
│   ├── datasets/
│   ├── features/
│   ├── models/
│   ├── training/
│   ├── evaluation/
│   └── pipelines/
│
├── frontend/              React + Vite frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/      Typed API client
│       ├── hooks/         TanStack Query hooks
│       ├── types/         TypeScript interfaces
│       └── layouts/
│
├── tests/                 All tests
│   ├── quant/             Quant correctness tests
│   ├── api/               API tests
│   └── integration/       Integration tests
│
├── migrations/            Alembic migrations
├── notebooks/             Jupyter research notebooks
├── scripts/               CLI utility scripts
├── docs/                  Architecture and methodology docs
├── docker/                Dockerfiles and init scripts
├── .github/workflows/     GitHub Actions CI
├── docker-compose.yml
├── pyproject.toml
├── .env.example
└── README.md
```

---

## Prerequisites

| Tool | Minimum Version |
|---|---|
| Python | 3.12 |
| Node.js | 22 |
| npm | 10 |
| Docker | 24 |
| Docker Compose | v2 |
| Git | 2.40 |

---

## Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/quantlab.git
cd quantlab

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — set ALPHA_VANTAGE_API_KEY and SECRET_KEY at minimum

# 3. Start infrastructure services
docker compose up -d

# 4. Check services are healthy
docker compose ps

# 5. Run database migrations
docker compose exec backend alembic upgrade head

# 6. Open the application
# Frontend: http://localhost:5173
# API docs: http://localhost:8000/docs
# Health:   http://localhost:8000/health
```

---

## Local Development Setup

### Python Backend + Quant Engine

```bash
# Create virtual environment (stays on your local drive)
python -m venv .venv

# Activate (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate (macOS/Linux)
source .venv/bin/activate

# Install all dependencies including dev tools
pip install -e ".[dev]"

# Copy environment
cp .env.example .env
# Edit .env with your values

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# Run migrations
alembic upgrade head

# Start backend
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

# Start Celery worker (separate terminal)
celery -A backend.app.workers.celery_app worker --loglevel=info
```

### Frontend

```bash
cd frontend
npm install

# Create frontend env
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local

# Start dev server
npm run dev
# → http://localhost:5173
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Async PostgreSQL connection string |
| `DATABASE_SYNC_URL` | ✅ | Sync PostgreSQL connection (Alembic) |
| `REDIS_URL` | ✅ | Redis connection string |
| `SECRET_KEY` | ✅ | JWT signing key (256-bit hex) |
| `ALPHA_VANTAGE_API_KEY` | ✅ (Phase 3+) | Market data provider key |
| `CELERY_BROKER_URL` | ✅ | Celery broker (Redis) |
| `CELERY_RESULT_BACKEND` | ✅ | Celery result storage (Redis) |
| `CORS_ORIGINS` | ✅ | Allowed frontend origins |
| `AI_PROVIDER` | Phase 19 | `gemini` or `openai` |
| `GOOGLE_API_KEY` | Phase 19 | If using Gemini AI assistant |

---

## Database Setup

```bash
# Apply all migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "describe_your_change"

# Rollback one version
alembic downgrade -1

# View migration history
alembic history
```

---

## Running Tests

```bash
# Activate virtual environment first
.\.venv\Scripts\Activate.ps1   # Windows

# Run all unit tests (no external services needed)
pytest tests/ -m "unit" -v

# Run quant correctness tests
pytest tests/quant/ -v

# Run integration tests (requires Docker services running)
pytest tests/ -m "integration" -v

# Run all tests with coverage
pytest tests/ --cov=quant_engine --cov=backend --cov-report=html

# Open coverage report
start htmlcov/index.html     # Windows
open htmlcov/index.html      # macOS
```

---

## API Usage

Interactive API documentation is available at `http://localhost:8000/docs` (Swagger UI) or `http://localhost:8000/redoc`.

### Key Endpoints

```
POST   /api/v1/auth/register        Register a new user
POST   /api/v1/auth/login           Obtain access token
GET    /api/v1/assets               List available assets
POST   /api/v1/market-data/fetch    Trigger data download
GET    /api/v1/strategies           List user strategies
POST   /api/v1/strategies           Create a strategy
POST   /api/v1/backtests            Submit a backtest (returns job)
GET    /api/v1/jobs/{id}            Poll job status + progress
GET    /api/v1/results/{id}         Retrieve full backtest results
GET    /api/v1/experiments          List experiments
POST   /api/v1/experiments          Create/save experiment
POST   /api/v1/ai/research          AI research assistant
GET    /health                      Health check
GET    /ready                       Readiness check
```

### Example: Submit a Backtest

```bash
curl -X POST http://localhost:8000/api/v1/backtests \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy_id": "moving_average_momentum",
    "parameters": {"fast_window": 20, "slow_window": 100},
    "symbols": ["AAPL"],
    "start_date": "2020-01-01",
    "end_date": "2024-12-31",
    "timeframe": "1d",
    "initial_capital": 100000,
    "commission_rate": 0.001,
    "slippage_bps": 5,
    "spread_bps": 2,
    "position_sizing": "percentage_allocation"
  }'
```

---

## Backtesting Methodology

### Temporal Causality

All backtests enforce strict temporal ordering:
- A signal generated using data at bar `t` can only be executed at the **open price of bar `t+1`**.
- Features and indicators are computed using only data available at the time of the signal.
- Rolling window calculations always use only past data.

### Execution Simulation

- **Market orders** fill at the next bar's open price.
- **Slippage** is modeled as a fixed basis-point penalty applied to the fill price.
- **Commission** is charged as a percentage of trade value.
- **Spread cost** is modeled as half-spread on each side of a round trip.

### Cost Model

```
Net PnL = Gross PnL − Commission − Slippage − Spread Cost
```

Results always report both gross and net PnL.

### Look-Ahead Bias Prevention

- The `DataFeed` yields bars in chronological order and does not allow random access.
- The `Strategy.on_bar()` method receives only the current bar and portfolio state.
- Feature engineering functions include explicit `min_periods` guards.
- Automated tests verify that no future data is accessible at decision time.

---

## Quant Assumptions & Limitations

1. **Data source**: Alpha Vantage free tier provides adjusted daily OHLCV data. Intraday data may be rate-limited.
2. **Execution model**: Orders fill at next-bar open. This is optimistic vs. real-world execution.
3. **Slippage**: Fixed-bps model. Does not account for market impact or volume.
4. **Survivorship bias**: The current data provider does not provide historical universe membership. Backtests are subject to survivorship bias.
5. **Adjusted prices**: Adjusted close prices are used where available. Raw prices are preserved separately.
6. **Dividends**: Dividend reinvestment is not explicitly modeled unless data is already split/dividend-adjusted.
7. **Short selling**: Short positions are supported in the engine but margin costs and borrow fees are not currently modeled.
8. **Taxes**: No tax treatment is modeled.
9. **Transaction costs**: Commission rates and slippage are user-configurable. The defaults are illustrative only.
10. **Monte Carlo**: Simulations assume i.i.d. resampling of trade returns, which may underestimate tail risk in trending markets.

---

## Known Limitations

- No live trading execution.
- No order book simulation.
- No intraday strategy tick-by-tick data.
- No multi-leg options strategies.
- Survivorship bias not eliminated without a historical universe dataset.
- Parameter optimization results are in-sample and should not be taken as evidence of future profitability.
- Walk-forward results can still be overfit if too many parameters are optimized.

---

## Deployment

### AWS (Target Architecture)

```
Internet → ALB (HTTPS) → ECS Fargate
                         ├── backend (FastAPI)
                         ├── worker (Celery)
                         └── frontend (Nginx)
                       → RDS PostgreSQL
                       → ElastiCache Redis
                       → ECR (container images)
                       → Secrets Manager (env vars)
```

See `docs/deployment.md` for step-by-step instructions.

---

## Roadmap

### Project 1 — QuantLab Core (Complete)
- [x] Repository structure & CI pipeline
- [x] Docker + PostgreSQL + Redis setup
- [x] Event-driven Quant Engine with zero look-ahead bias
- [x] Data pipeline (Alpha Vantage + synthetic fallback + validator)
- [x] 5 Built-in quantitative trading strategies
- [x] Risk & performance metrics library (CAGR, Sharpe, Sortino, Calmar, Max DD)
- [x] FastAPI REST API (Auth, Data, Strategies, Experiments)
- [x] React + Vite modern quant dashboard with Recharts analytics
- [x] AI Research Copilot strategy spec generator
- [x] 64/64 Unit & Integration tests passing

### Project 2 — Market Regime Detection
- Hidden Markov Models for regime detection
- Regime-aware adaptive strategies
- Regime-conditioned portfolio allocation

### Project 3 — DeFi Quant Risk Engine
- On-chain data integration
- DeFi protocol risk scoring
- Wallet graph analytics

### Monster Project — Unified Platform
- All of the above, unified
- Multi-asset, multi-regime, multi-strategy
- Full production-grade infrastructure

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Write tests for your changes.
4. Ensure all tests pass: `pytest tests/`.
5. Ensure linting passes: `ruff check .`.
6. Submit a pull request.

---

## License

[MIT](LICENSE) © 2026 QuantLab Contributors
