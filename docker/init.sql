-- ORACLE Protocol Database Schema
-- TimescaleDB for time-series market data

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Markets table
CREATE TABLE markets (
    id VARCHAR(100) PRIMARY KEY,
    question TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'custom',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolution SMALLINT, -- 0 = NO, 1 = YES, NULL = unresolved
    outcome_asset_id VARCHAR(100), -- HIP-4 asset ID
    resolution_source VARCHAR(200),
    total_volume NUMERIC(20,2) DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    contract_address VARCHAR(66), -- HyperEVM contract
    onchain_market_id VARCHAR(66), -- bytes32 market ID
    CONSTRAINT valid_resolution CHECK (resolution IS NULL OR resolution IN (0, 1))
);

CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_expires ON markets(expires_at);

-- Trades (time-series via TimescaleDB)
CREATE TABLE trades (
    id BIGSERIAL,
    market_id VARCHAR(100) NOT NULL REFERENCES markets(id),
    side VARCHAR(3) NOT NULL, -- 'yes' or 'no'
    price NUMERIC(10,6) NOT NULL,
    size NUMERIC(20,6) NOT NULL,
    maker_address VARCHAR(66),
    taker_address VARCHAR(66),
    tx_hash VARCHAR(130),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
);

SELECT create_hypertable('trades', 'created_at');
CREATE INDEX idx_trades_market ON trades(market_id, created_at DESC);

-- Candles (materialized from trades)
CREATE TABLE candles (
    market_id VARCHAR(100) NOT NULL,
    interval VARCHAR(10) NOT NULL, -- '1m', '5m', '15m', '1h', '4h', '1d'
    bucket TIMESTAMPTZ NOT NULL,
    open_price NUMERIC(10,6),
    high_price NUMERIC(10,6),
    low_price NUMERIC(10,6),
    close_price NUMERIC(10,6),
    volume NUMERIC(20,2),
    trade_count INTEGER DEFAULT 0,
    PRIMARY KEY (market_id, interval, bucket)
);

SELECT create_hypertable('candles', 'bucket');

-- User positions snapshot
CREATE TABLE user_positions (
    id BIGSERIAL PRIMARY KEY,
    user_address VARCHAR(66) NOT NULL,
    market_id VARCHAR(100) NOT NULL REFERENCES markets(id),
    side VARCHAR(3) NOT NULL,
    size NUMERIC(20,6) NOT NULL,
    avg_entry_price NUMERIC(10,6) NOT NULL,
    realized_pnl NUMERIC(20,6) DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_positions_user ON user_positions(user_address);

-- Oracle reports for resolution
CREATE TABLE oracle_reports (
    id BIGSERIAL PRIMARY KEY,
    market_id VARCHAR(100) NOT NULL REFERENCES markets(id),
    reporter_address VARCHAR(66) NOT NULL,
    reporter_name VARCHAR(100),
    outcome SMALLINT NOT NULL,
    confidence NUMERIC(5,2),
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oracle_reports_market ON oracle_reports(market_id);

-- Leaderboard (materialized view)
CREATE MATERIALIZED VIEW leaderboard AS
SELECT 
    user_address,
    COUNT(DISTINCT market_id) as markets_traded,
    SUM(realized_pnl) as total_pnl,
    AVG(realized_pnl) as avg_pnl,
    SUM(CASE WHEN realized_pnl > 0 THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN realized_pnl <= 0 THEN 1 ELSE 0 END) as losses
FROM user_positions
WHERE size > 0
GROUP BY user_address
ORDER BY total_pnl DESC;

-- Seed initial markets
INSERT INTO markets (id, question, description, category, status, expires_at, outcome_asset_id, resolution_source, tags) VALUES
('hl-BTC', 'Will BTC be above $100,000 by March 31?', 'Resolves YES if BTC mark price on HyperCore exceeds $100,000 at 00:00 UTC March 31 2026.', 'crypto', 'active', '2026-03-31T00:00:00Z', 'BTC', 'hypercore_mark_price', ARRAY['btc','bitcoin']),
('hl-ETH', 'Will ETH be above $4,000 by April 30?', 'Resolves YES if ETH mark price exceeds $4,000 at expiry.', 'crypto', 'active', '2026-04-30T00:00:00Z', 'ETH', 'hypercore_mark_price', ARRAY['eth','ethereum']),
('hl-HYPE', 'Will HYPE be above $50 by May 31?', 'Resolves YES if HYPE token exceeds $50.', 'crypto', 'active', '2026-05-31T00:00:00Z', 'HYPE', 'hypercore_mark_price', ARRAY['hype','hyperliquid']),
('oracle-fed-april', 'Will the Fed cut rates at April FOMC?', 'Resolves YES if the Federal Reserve announces a rate cut at the April 2026 FOMC meeting.', 'macro', 'active', '2026-04-30T00:00:00Z', NULL, 'federal_reserve_api', ARRAY['fed','rates','fomc']),
('oracle-ucl-2026', 'Will Real Madrid win Champions League 2026?', 'Resolves YES if Real Madrid wins the 2025-26 UCL final.', 'sports', 'active', '2026-05-31T00:00:00Z', NULL, 'uefa_official', ARRAY['ucl','football']),
('oracle-apple-ai', 'Will Apple announce dedicated AI hardware at WWDC 2026?', 'Resolves YES if Apple announces an AI-focused hardware product at WWDC June 2026.', 'tech', 'active', '2026-06-09T00:00:00Z', NULL, 'apple_press_release', ARRAY['apple','ai','wwdc']),
('oracle-gold-3500', 'Will Gold be above $3,500/oz by June 30?', 'Resolves YES if XAUUSD exceeds 3500 at expiry.', 'macro', 'active', '2026-06-30T00:00:00Z', NULL, 'chainlink_xauusd', ARRAY['gold','commodities']);
