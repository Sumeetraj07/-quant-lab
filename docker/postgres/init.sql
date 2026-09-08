-- =============================================================================
-- QuantLab PostgreSQL Initialization Script
-- Runs automatically on first container startup
-- =============================================================================

-- Ensure we're using the quantlab database
\connect quantlab;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- UUID generation support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgcrypto for additional hashing utilities
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Notes on TimescaleDB
-- ---------------------------------------------------------------------------
-- TimescaleDB is NOT installed by default in the postgres:16 image.
-- To enable it, switch to the timescale/timescaledb image and add:
--   CREATE EXTENSION IF NOT EXISTS timescaledb;
-- This will be done in a future migration when time-series hypertables
-- are warranted for the market_data table.
-- ---------------------------------------------------------------------------

-- Print confirmation
DO $$
BEGIN
  RAISE NOTICE 'QuantLab database initialized successfully.';
  RAISE NOTICE 'Extensions: uuid-ossp, pgcrypto';
END $$;
