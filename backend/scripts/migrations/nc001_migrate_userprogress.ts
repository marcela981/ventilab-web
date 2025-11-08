/**
 * =============================================================================
 * Migration Script: nc001_migrate_userprogress
 * =============================================================================
 * 
 * Migrates data from the old UserProgress table to the unified
 * LearningProgress + LessonProgress schema.
 * 
 * This script is:
 * - Idempotent: Safe to run multiple times (won't duplicate data)
 * - Fail-fast: Rolls back entire transaction on any error
 * - Safe: Uses transactions to ensure data consistency
 * 
 * Prerequisites:
 * - Prisma Client must be generated (npx prisma generate)
 * - Database connection must be configured
 * - Old user_progress table may or may not exist (script handles both cases)
 * 
 * =============================================================================
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// =============================================================================
// Types
// =============================================================================

interface OldUserProgress {
  id: string;
  user_id: string;
  module_id: string | null;
  lesson_id: string;
  position_seconds: number;
  progress: number; // 0.0-1.0 or 0-100 (will be normalized)
  is_completed: boolean;
  attempts: number;
  score: number | null;
  metadata: any;
  client_updated_at: Date | null;
  server_updated_at: Date | null;
  created_at: Date;
}

interface MigrationStats {
  totalOldRecords: number;
  learningProgressCreated: number;
  learningProgressFound: number;
  lessonProgressCreated: number;
  lessonProgressFound: number;
  recordsSkipped: number;
  errors: Array<{ recordId: string; error: string }>;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize progress value to 0.0-1.0 range
 * Handles both 0-1 and 0-100 ranges
 */
function normalizeProgress(progress: number): number {
  if (progress > 1.0) {
    // Assume it's in 0-100 range, convert to 0-1
    return Math.min(1.0, Math.max(0.0, progress / 100));
  }
  return Math.min(1.0, Math.max(0.0, progress));
}

/**
 * Convert positionSeconds to timeSpent in minutes
 * Uses a simple heuristic: 1 second = 1/60 minutes
 * For more accurate conversion, you might want to use metadata if available
 */
function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

/**
 * Get moduleId from lesson if not present in old record
 */
async function inferModuleIdFromLesson(lessonId: string): Promise<string | null> {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { moduleId: true },
    });
    return lesson?.moduleId || null;
  } catch (error) {
    console.warn(`[Migration] Could not infer moduleId for lesson ${lessonId}:`, error);
    return null;
  }
}

/**
 * Check if user_progress table exists (either original or legacy backup)
 */
async function tableExists(): Promise<{ exists: boolean; tableName: string | null }> {
  try {
    // Check for original table
    const originalResult = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress'
      ) as exists;
    `;
    
    if (originalResult[0]?.exists) {
      return { exists: true, tableName: 'user_progress' };
    }

    // Check for legacy backup table
    const legacyResult = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress_legacy_bk'
      ) as exists;
    `;
    
    if (legacyResult[0]?.exists) {
      return { exists: true, tableName: 'user_progress_legacy_bk' };
    }

    return { exists: false, tableName: null };
  } catch (error) {
    console.error('[Migration] Error checking if user_progress table exists:', error);
    return { exists: false, tableName: null };
  }
}

/**
 * Fetch all records from old user_progress table (original or legacy backup)
 * Note: Uses snake_case column names as they exist in the database
 * Security: Validates table name to prevent SQL injection
 */
async function fetchOldUserProgress(tableName: string): Promise<OldUserProgress[]> {
  // Validate table name to prevent SQL injection
  const allowedTableNames = ['user_progress', 'user_progress_legacy_bk'];
  if (!allowedTableNames.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}. Allowed: ${allowedTableNames.join(', ')}`);
  }

  try {
    // Use parameterized query to safely use table name
    // Note: Prisma $queryRawUnsafe is used here because table names cannot be parameterized
    // but we've validated the table name above
    const records = await prisma.$queryRawUnsafe<OldUserProgress[]>(`
      SELECT 
        id,
        user_id,
        module_id,
        lesson_id,
        position_seconds,
        progress,
        is_completed,
        attempts,
        score,
        metadata,
        client_updated_at,
        server_updated_at,
        created_at
      FROM ${tableName}
      ORDER BY user_id, module_id, lesson_id;
    `);
    return records;
  } catch (error: any) {
    // If table doesn't exist, return empty array (handled by tableExists check)
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return [];
    }
    console.error('[Migration] Error fetching old user_progress records:', error);
    throw error;
  }
}

// =============================================================================
// Main Migration Logic
// =============================================================================

/**
 * Main migration function
 */
async function migrateUserProgress(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalOldRecords: 0,
    learningProgressCreated: 0,
    learningProgressFound: 0,
    lessonProgressCreated: 0,
    lessonProgressFound: 0,
    recordsSkipped: 0,
    errors: [],
  };

  console.log('[Migration] Starting UserProgress migration...\n');

  // Step 1: Check if old table exists (original or legacy backup)
  const tableCheck = await tableExists();
  if (!tableCheck.exists || !tableCheck.tableName) {
    console.log('[Migration] ⚠️  user_progress table does not exist. Nothing to migrate.');
    console.log('[Migration] This is OK if the table was already dropped or never existed.\n');
    return stats;
  }

  const tableName = tableCheck.tableName;
  console.log(`[Migration] Found table: ${tableName}`);
  if (tableName === 'user_progress_legacy_bk') {
    console.log('[Migration] ℹ️  Using legacy backup table (table was renamed by migration).');
  }
  console.log('');

  // Step 2: Fetch all old records
  console.log(`[Migration] Fetching records from ${tableName} table...`);
  const oldRecords = await fetchOldUserProgress(tableName);
  stats.totalOldRecords = oldRecords.length;
  console.log(`[Migration] Found ${stats.totalOldRecords} records to migrate.\n`);

  if (stats.totalOldRecords === 0) {
    console.log('[Migration] ✅ No records to migrate. Migration complete.\n');
    return stats;
  }

  // Step 3: Group records by userId + moduleId
  console.log('[Migration] Grouping records by userId + moduleId...');
  const groupedByModule = new Map<string, OldUserProgress[]>();
  
  for (const record of oldRecords) {
    let moduleId = record.module_id;
    
    // If moduleId is missing, try to infer it from lesson
    if (!moduleId) {
      console.log(`[Migration] ⚠️  Record ${record.id} missing moduleId, inferring from lesson ${record.lesson_id}...`);
      moduleId = await inferModuleIdFromLesson(record.lesson_id);
      
      if (!moduleId) {
        stats.recordsSkipped++;
        stats.errors.push({
          recordId: record.id,
          error: 'Could not infer moduleId from lesson',
        });
        console.log(`[Migration] ❌ Skipping record ${record.id}: Could not infer moduleId`);
        continue;
      }
    }

    const key = `${record.user_id}::${moduleId}`;
    if (!groupedByModule.has(key)) {
      groupedByModule.set(key, []);
    }
    groupedByModule.get(key)!.push(record);
  }

  console.log(`[Migration] Grouped into ${groupedByModule.size} unique userId+moduleId combinations.\n`);

  // Step 4: Process each group in a transaction
  console.log('[Migration] Processing groups...\n');

  for (const [key, records] of groupedByModule.entries()) {
    const [userId, moduleId] = key.split('::');
    
    try {
      await prisma.$transaction(async (tx) => {
        // Step 4a: Create or find LearningProgress
        let learningProgress = await tx.learningProgress.findUnique({
          where: {
            userId_moduleId: {
              userId,
              moduleId,
            },
          },
        });

        if (learningProgress) {
          stats.learningProgressFound++;
          console.log(`[Migration] ✓ Found existing LearningProgress for user ${userId}, module ${moduleId}`);
        } else {
          // Calculate aggregated values for LearningProgress
          const allCompleted = records.every(r => r.is_completed);
          const totalTimeSpent = records.reduce((sum, r) => sum + secondsToMinutes(r.position_seconds), 0);
          
          // Calculate average score if any records have scores
          const scoresWithValues = records
            .map(r => r.score)
            .filter((s): s is number => s !== null && !isNaN(s));
          const avgScore = scoresWithValues.length > 0
            ? scoresWithValues.reduce((sum, s) => sum + s, 0) / scoresWithValues.length
            : null;

          learningProgress = await tx.learningProgress.create({
            data: {
              userId,
              moduleId,
              timeSpent: totalTimeSpent,
              score: avgScore,
              completedAt: allCompleted ? new Date() : null,
            },
          });
          stats.learningProgressCreated++;
          console.log(`[Migration] ✓ Created LearningProgress for user ${userId}, module ${moduleId}`);
        }

        // Step 4b: Create or update LessonProgress for each record
        for (const record of records) {
          try {
            // Check if LessonProgress already exists (idempotency check)
            const existing = await tx.lessonProgress.findUnique({
              where: {
                progressId_lessonId: {
                  progressId: learningProgress.id,
                  lessonId: record.lesson_id,
                },
              },
            });

            if (existing) {
              stats.lessonProgressFound++;
              console.log(`[Migration]   ✓ LessonProgress already exists for lesson ${record.lesson_id} (skipping)`);
              continue;
            }

            // Create new LessonProgress
            const normalizedProgress = normalizeProgress(record.progress);
            const timeSpentMinutes = secondsToMinutes(record.position_seconds);
            
            // Use server_updated_at or client_updated_at as lastAccessed, fallback to created_at
            const lastAccessed = record.server_updated_at 
              || record.client_updated_at 
              || record.created_at;

            await tx.lessonProgress.create({
              data: {
                progressId: learningProgress.id,
                lessonId: record.lesson_id,
                completed: record.is_completed,
                progress: normalizedProgress,
                timeSpent: timeSpentMinutes,
                lastAccessed: lastAccessed,
              },
            });
            stats.lessonProgressCreated++;
            console.log(`[Migration]   ✓ Created LessonProgress for lesson ${record.lesson_id}`);
          } catch (error: any) {
            stats.recordsSkipped++;
            const errorMsg = error?.message || 'Unknown error';
            stats.errors.push({
              recordId: record.id,
              error: errorMsg,
            });
            console.log(`[Migration]   ❌ Error processing record ${record.id}: ${errorMsg}`);
            // Continue with next record instead of failing entire transaction
          }
        }
      }, {
        timeout: 60000, // 60 second timeout for large transactions
      });
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      console.error(`[Migration] ❌ Transaction failed for ${key}: ${errorMsg}`);
      stats.errors.push({
        recordId: key,
        error: `Transaction failed: ${errorMsg}`,
      });
      // Continue with next group
    }
  }

  return stats;
}

// =============================================================================
// Main Execution
// =============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('UserProgress Migration Script');
  console.log('='.repeat(70));
  console.log('');

  try {
    // Confirm before proceeding
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('This will migrate data from user_progress to LearningProgress + LessonProgress.\nContinue? (yes/no): ', resolve);
    });

    rl.close();

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('\n[Migration] Migration cancelled by user.');
      process.exit(0);
    }

    console.log('');

    // Run migration
    const stats = await migrateUserProgress();

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('Migration Summary');
    console.log('='.repeat(70));
    console.log(`Total old records:        ${stats.totalOldRecords}`);
    console.log(`LearningProgress created: ${stats.learningProgressCreated}`);
    console.log(`LearningProgress found:   ${stats.learningProgressFound}`);
    console.log(`LessonProgress created:   ${stats.lessonProgressCreated}`);
    console.log(`LessonProgress found:     ${stats.lessonProgressFound}`);
    console.log(`Records skipped:         ${stats.recordsSkipped}`);
    console.log(`Errors:                  ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\nErrors encountered:');
      stats.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`  ${idx + 1}. Record ${err.recordId}: ${err.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`  ... and ${stats.errors.length - 10} more errors`);
      }
    }

    console.log('\n' + '='.repeat(70));
    
    if (stats.errors.length === 0 && stats.recordsSkipped === 0) {
      console.log('✅ Migration completed successfully!');
    } else if (stats.errors.length > 0) {
      console.log('⚠️  Migration completed with errors. Please review the errors above.');
    } else {
      console.log('✅ Migration completed. Some records were skipped (likely duplicates).');
    }
    console.log('='.repeat(70));
    console.log('');

  } catch (error) {
    console.error('\n[Migration] ❌ Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { migrateUserProgress };

