-- =============================================================================
-- Install PostgreSQL Extension: pg_trgm
-- =============================================================================
-- This script must be run BEFORE any migrations that use gin_trgm_ops indexes
-- Run this manually: psql -U postgres -d ventilab_dev -f 00_install_pg_trgm.sql
-- Or execute: CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- =============================================================================

-- Enable pg_trgm extension for trigram similarity search
-- This allows fuzzy text matching and improves full-text search performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extension is enabled
-- SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';

