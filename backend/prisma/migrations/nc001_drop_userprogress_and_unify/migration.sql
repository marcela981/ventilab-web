-- Prisma Migration: nc001_drop_userprogress_and_unify
-- Renames UserProgress table to legacy backup and unifies progress tracking to LearningProgress + LessonProgress
-- Adds progress field to LessonProgress for granular tracking (0.0-1.0)
-- 
-- IMPORTANT: This migration renames the table instead of dropping it for safety.
-- The table will be renamed to user_progress_legacy_bk and protected from new inserts.
-- After verification, run migration nc001_drop_userprogress_final to permanently delete the backup.

-- Step 1: Rename user_progress table to legacy backup (instead of dropping)
-- This preserves the data for rollback purposes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress'
    ) THEN
        -- Rename the table to backup
        ALTER TABLE "user_progress" RENAME TO "user_progress_legacy_bk";
        RAISE NOTICE 'Table user_progress renamed to user_progress_legacy_bk';
    ELSE
        RAISE NOTICE 'Table user_progress does not exist, skipping rename';
    END IF;
END $$;

-- Step 2: Create a function to prevent new inserts into the legacy table
CREATE OR REPLACE FUNCTION prevent_legacy_inserts()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'INSERT blocked: user_progress_legacy_bk is a read-only backup table. Use LearningProgress + LessonProgress instead.';
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to block inserts (but allow reads for migration/verification)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress_legacy_bk'
    ) THEN
        -- Drop trigger if it already exists
        DROP TRIGGER IF EXISTS block_legacy_inserts ON "user_progress_legacy_bk";
        
        -- Create trigger to block all inserts
        CREATE TRIGGER block_legacy_inserts
        BEFORE INSERT ON "user_progress_legacy_bk"
        FOR EACH ROW
        EXECUTE FUNCTION prevent_legacy_inserts();
        
        RAISE NOTICE 'Trigger created to block inserts into user_progress_legacy_bk';
    END IF;
END $$;

-- Step 4: Add progress field to lesson_progress if it doesn't exist
-- This field tracks granular progress (0.0-1.0) for each lesson
-- First verify that the table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lesson_progress'
    ) THEN
        -- Table exists, check if column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'lesson_progress' 
            AND column_name = 'progress'
        ) THEN
            ALTER TABLE "lesson_progress" 
            ADD COLUMN "progress" DOUBLE PRECISION NOT NULL DEFAULT 0;
        END IF;
    ELSE
        -- Table doesn't exist, this is a problem but we'll skip it
        RAISE NOTICE 'Table lesson_progress does not exist. Skipping progress column addition.';
    END IF;
END $$;

-- Step 5: Remove indexes that are no longer needed
-- Remove completedAt index from learning_progress (if exists)
DROP INDEX IF EXISTS "learning_progress_completed_at_idx";

-- Remove completed index from lesson_progress (if exists)
DROP INDEX IF EXISTS "lesson_progress_completed_idx";

