-- =============================================================================
-- Schema for Distributed Traffic Incident Monitoring System
-- Enforces separate zone identity, incident records, referential integrity,
-- and uniqueness constraints for idempotency and durable storage.
-- =============================================================================

CREATE TABLE IF NOT EXISTS zones (
    zone_id VARCHAR(32) PRIMARY KEY,
    zone_name VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(64) PRIMARY KEY,
    zone_id VARCHAR(32) NOT NULL,
    type VARCHAR(32) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    description VARCHAR(500) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_zone_incident FOREIGN KEY (zone_id) REFERENCES zones(zone_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incidents_zone_time ON incidents(zone_id, timestamp DESC);
