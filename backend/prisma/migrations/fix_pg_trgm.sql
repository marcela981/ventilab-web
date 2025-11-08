-- =============================================================================
-- Fix: Install pg_trgm extension
-- =============================================================================
-- Execute this script to install the required PostgreSQL extension
-- Run: psql -U postgres -d ventilab_dev -f fix_pg_trgm.sql
-- Or connect to your database and run: CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- =============================================================================

-- Install pg_trgm extension (required for GIN indexes with gin_trgm_ops)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extension is installed
SELECT 
    extname as "Extension Name",
    extversion as "Version"
FROM pg_extension 
WHERE extname = 'pg_trgm';

-- If the query above returns a row, the extension is installed successfully

