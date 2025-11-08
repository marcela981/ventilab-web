-- Prisma Migration: nc001_drop_userprogress_final
-- Final cleanup: Permanently deletes the legacy user_progress backup table
-- 
-- ⚠️  WARNING: This migration permanently deletes the user_progress_legacy_bk table.
-- Only run this migration AFTER:
-- 1. Data migration script (nc001_migrate_userprogress.ts) has completed successfully
-- 2. All verification checks have passed (see README.md)
-- 3. Application has been tested with the new schema
-- 4. You have confirmed no rollback is needed
--
-- If you need to rollback, see the rollback instructions in the README.

-- Step 1: Drop the trigger that blocks inserts
DROP TRIGGER IF EXISTS block_legacy_inserts ON "user_progress_legacy_bk";

-- Step 2: Drop the function that prevents inserts
DROP FUNCTION IF EXISTS prevent_legacy_inserts();

-- Step 3: Drop indexes on the legacy table (if they still exist)
DROP INDEX IF EXISTS "user_progress_legacy_bk_user_id_idx";
DROP INDEX IF EXISTS "user_progress_legacy_bk_module_id_idx";
DROP INDEX IF EXISTS "user_progress_legacy_bk_lesson_id_idx";
DROP INDEX IF EXISTS "user_progress_legacy_bk_user_id_module_id_lesson_id_key";

-- Step 4: Permanently drop the legacy backup table
DROP TABLE IF EXISTS "user_progress_legacy_bk";

-- Verification query (uncomment to verify deletion):
-- SELECT EXISTS (
--     SELECT FROM information_schema.tables 
--     WHERE table_schema = 'public' 
--     AND table_name = 'user_progress_legacy_bk'
-- ) as table_still_exists;
-- Expected result: false (table_still_exists = f)

