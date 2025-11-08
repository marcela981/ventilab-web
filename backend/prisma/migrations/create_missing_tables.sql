-- =============================================================================
-- Create Missing Tables from Initial Migration
-- =============================================================================
-- This script creates the tables that should have been created by the initial
-- migration but failed due to the pg_trgm extension issue
-- =============================================================================

-- Install pg_trgm extension (required for GIN indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create learning_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS "learning_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_progress_pkey" PRIMARY KEY ("id")
);

-- Create lesson_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS "lesson_progress" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "lastAccessed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- Create indexes for learning_progress
CREATE INDEX IF NOT EXISTS "learning_progress_userId_idx" ON "learning_progress"("userId");
CREATE INDEX IF NOT EXISTS "learning_progress_moduleId_idx" ON "learning_progress"("moduleId");
CREATE UNIQUE INDEX IF NOT EXISTS "learning_progress_userId_moduleId_key" ON "learning_progress"("userId", "moduleId");

-- Create indexes for lesson_progress
CREATE INDEX IF NOT EXISTS "lesson_progress_progressId_idx" ON "lesson_progress"("progressId");
CREATE INDEX IF NOT EXISTS "lesson_progress_lessonId_idx" ON "lesson_progress"("lessonId");
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_progress_progressId_lessonId_key" ON "lesson_progress"("progressId", "lessonId");

-- Add foreign keys (only if tables exist)
DO $$
BEGIN
    -- Add FK to learning_progress if users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'learning_progress_userId_fkey'
        ) THEN
            ALTER TABLE "learning_progress" 
            ADD CONSTRAINT "learning_progress_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;

    -- Add FK to learning_progress if modules table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'learning_progress_moduleId_fkey'
        ) THEN
            ALTER TABLE "learning_progress" 
            ADD CONSTRAINT "learning_progress_moduleId_fkey" 
            FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;

    -- Add FK to lesson_progress if learning_progress table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'learning_progress') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'lesson_progress_progressId_fkey'
        ) THEN
            ALTER TABLE "lesson_progress" 
            ADD CONSTRAINT "lesson_progress_progressId_fkey" 
            FOREIGN KEY ("progressId") REFERENCES "learning_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;

    -- Add FK to lesson_progress if lessons table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lessons') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'lesson_progress_lessonId_fkey'
        ) THEN
            ALTER TABLE "lesson_progress" 
            ADD CONSTRAINT "lesson_progress_lessonId_fkey" 
            FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

