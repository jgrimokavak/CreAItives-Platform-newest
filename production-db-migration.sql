-- Production Database Migration Script
-- This script adds missing columns to the videos table that are causing 500 errors
-- Run this in the production database to fix the video gallery

-- Step 1: Add missing columns to the videos table
-- Each ALTER TABLE is wrapped in a DO block to handle existing columns gracefully

-- Add environment column (required for multi-environment isolation)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'videos' AND column_name = 'environment') THEN
        ALTER TABLE videos ADD COLUMN environment text DEFAULT 'prod' NOT NULL;
        RAISE NOTICE 'Added environment column to videos table';
    ELSE
        RAISE NOTICE 'environment column already exists';
    END IF;
END $$;

-- Add referenceImageUrl column (for storing reference images)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'videos' AND column_name = 'reference_image_url') THEN
        ALTER TABLE videos ADD COLUMN reference_image_url text;
        RAISE NOTICE 'Added reference_image_url column to videos table';
    ELSE
        RAISE NOTICE 'reference_image_url column already exists';
    END IF;
END $$;

-- Add thumbUrl column (for video thumbnails)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'videos' AND column_name = 'thumb_url') THEN
        ALTER TABLE videos ADD COLUMN thumb_url text;
        RAISE NOTICE 'Added thumb_url column to videos table';
    ELSE
        RAISE NOTICE 'thumb_url column already exists';
    END IF;
END $$;

-- Add fullUrl column (for full resolution videos)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'videos' AND column_name = 'full_url') THEN
        ALTER TABLE videos ADD COLUMN full_url text;
        RAISE NOTICE 'Added full_url column to videos table';
    ELSE
        RAISE NOTICE 'full_url column already exists';
    END IF;
END $$;

-- Add size column (file size in bytes)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'videos' AND column_name = 'size') THEN
        ALTER TABLE videos ADD COLUMN size integer DEFAULT 0;
        RAISE NOTICE 'Added size column to videos table';
    ELSE
        RAISE NOTICE 'size column already exists';
    END IF;
END $$;

-- Add job management columns for reliability
-- attemptCount column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'videos' AND column_name = 'attempt_count') THEN
        ALTER TABLE videos ADD COLUMN attempt_count integer DEFAULT 0 NOT NULL;
        RAISE NOTICE 'Added attempt_count column to videos table';
    ELSE
        RAISE NOTICE 'attempt_count column already exists';
    END IF;
END $$;

-- nextPollAt column (when to poll job status next)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'videos' AND column_name = 'next_poll_at') THEN
        ALTER TABLE videos ADD COLUMN next_poll_at timestamp;
        RAISE NOTICE 'Added next_poll_at column to videos table';
    ELSE
        RAISE NOTICE 'next_poll_at column already exists';
    END IF;
END $$;

-- lastError column (latest error message for debugging)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'videos' AND column_name = 'last_error') THEN
        ALTER TABLE videos ADD COLUMN last_error text;
        RAISE NOTICE 'Added last_error column to videos table';
    ELSE
        RAISE NOTICE 'last_error column already exists';
    END IF;
END $$;

-- queuedAt column (when job was queued)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'videos' AND column_name = 'queued_at') THEN
        ALTER TABLE videos ADD COLUMN queued_at timestamp;
        RAISE NOTICE 'Added queued_at column to videos table';
    ELSE
        RAISE NOTICE 'queued_at column already exists';
    END IF;
END $$;

-- Step 2: Create indexes for performance
-- These indexes improve query performance significantly

-- Index for user queries with environment filter
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'videos' AND indexname = 'idx_videos_user_env') THEN
        CREATE INDEX idx_videos_user_env ON videos (user_id, environment);
        RAISE NOTICE 'Created idx_videos_user_env index';
    ELSE
        RAISE NOTICE 'idx_videos_user_env index already exists';
    END IF;
END $$;

-- Index for createdAt sorting
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'videos' AND indexname = 'idx_videos_created_at') THEN
        CREATE INDEX idx_videos_created_at ON videos (created_at);
        RAISE NOTICE 'Created idx_videos_created_at index';
    ELSE
        RAISE NOTICE 'idx_videos_created_at index already exists';
    END IF;
END $$;

-- Index for project queries
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'videos' AND indexname = 'idx_videos_project_id') THEN
        CREATE INDEX idx_videos_project_id ON videos (project_id);
        RAISE NOTICE 'Created idx_videos_project_id index';
    ELSE
        RAISE NOTICE 'idx_videos_project_id index already exists';
    END IF;
END $$;

-- Index for status queries
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'videos' AND indexname = 'idx_videos_status') THEN
        CREATE INDEX idx_videos_status ON videos (status);
        RAISE NOTICE 'Created idx_videos_status index';
    ELSE
        RAISE NOTICE 'idx_videos_status index already exists';
    END IF;
END $$;

-- Index for job polling queries
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'videos' AND indexname = 'idx_videos_poll_status') THEN
        CREATE INDEX idx_videos_poll_status ON videos (status, environment, next_poll_at) 
        WHERE status = 'processing';
        RAISE NOTICE 'Created idx_videos_poll_status index';
    ELSE
        RAISE NOTICE 'idx_videos_poll_status index already exists';
    END IF;
END $$;

-- Step 3: Backfill environment column for existing videos
-- All existing production videos should have environment = 'prod'
UPDATE videos 
SET environment = 'prod' 
WHERE environment IS NULL OR environment = 'dev';

-- Step 4: Verify the migration
SELECT 
    COUNT(*) as total_videos,
    COUNT(CASE WHEN environment = 'prod' THEN 1 END) as prod_videos,
    COUNT(CASE WHEN environment = 'dev' THEN 1 END) as dev_videos
FROM videos;

-- Display column information
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'videos'
ORDER BY ordinal_position;

RAISE NOTICE 'Migration completed successfully!';
RAISE NOTICE 'The video gallery should now work without 500 errors.';