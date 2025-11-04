-- =============================================================================
-- Search Optimization Migration
-- =============================================================================
-- This migration adds PostgreSQL extensions and indexes for optimized search
-- Run this BEFORE running `prisma migrate dev` or `prisma db push`
-- =============================================================================

-- Enable pg_trgm extension for trigram similarity search
-- This allows fuzzy text matching and improves full-text search performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extension is enabled
-- Run: SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';

-- Note: The GIN indexes for full-text search are defined in schema.prisma
-- and will be created automatically by Prisma when you run migrations

-- =============================================================================
-- Performance Monitoring Queries (Optional - for admins)
-- =============================================================================

-- Check if indexes are being used:
-- EXPLAIN ANALYZE SELECT * FROM modules WHERE title ILIKE '%ventilación%';

-- View all indexes on modules table:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'modules';

-- View index usage statistics:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes WHERE tablename IN ('modules', 'lessons');

