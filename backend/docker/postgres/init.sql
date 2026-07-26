-- PostgreSQL initialization script for Sentinel Platform
-- Runs automatically when the container is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- For fast text search (ILIKE)
CREATE EXTENSION IF NOT EXISTS "unaccent";    -- For accent-insensitive search

-- Create search configuration for Indian names/addresses
-- Uses unaccent + pg_trgm for fuzzy search capability
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS sentinel_search (COPY = english);
ALTER TEXT SEARCH CONFIGURATION sentinel_search
    ALTER MAPPING FOR hword, hword_part, word WITH unaccent, english_stem;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE sentinel_db TO sentinel;

-- Performance tuning comments (apply these in postgresql.conf for production)
-- shared_buffers = 256MB
-- effective_cache_size = 1GB
-- maintenance_work_mem = 128MB
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- default_statistics_target = 100
-- random_page_cost = 1.1
-- effective_io_concurrency = 200
-- work_mem = 4MB
-- min_wal_size = 1GB
-- max_wal_size = 4GB

\echo 'Sentinel database initialized successfully'
