/**
 * ProgressSource - Unified Progress Data Source
 * Reconciles local and backend progress data
 */

import {
  getOverview,
  getSkills,
  getMilestones,
  getAchievements,
  getUserState
} from './progressService.js';
import { getAuthToken, getUserData } from '@/shared/services/authService';
import { debug } from '@/shared/utils/debug';

// =============================================================================
// TYPES
// =============================================================================

export type LessonItem = { lessonId: string; progress: number; updatedAt?: string; moduleId?: string };

export type Overview = {
  xpTotal: number; level: number; nextLevelXp: number; streakDays: number;
  calendar: Array<{ date: string; hasActivity: boolean; lessonsCompleted: number }>;
  completedLessons: number; totalLessons: number; modulesCompleted: number; totalModules: number;
};

export type ProgressSnapshot = {
  userId: string | null;
  overview: Overview;
  lessons: LessonItem[];
  lastSyncAt?: string;
  source: 'db' | 'local' | 'merged';
  _modules?: Array<{ id: string; moduleId: string; progress: number; completedLessons: number; totalLessons: number; completed: boolean }>;
  /** Level-aggregated data from GET /api/progress/overview (levels[]). */
  _levels?: Array<Record<string, unknown>>;
};

interface LocalProgress {
  lessons: Array<{ lessonId: string; progress: number; updatedAt: string }>;
  lastUpdated: string;
}

// =============================================================================
// LOCAL STORAGE HELPERS
// =============================================================================

const LOCAL_STORAGE_KEY = 'vlab:progress:local';
const LAST_SYNC_KEY = 'vlab:progress:lastSync';
const LS_QUEUE = 'progress.queue';
const LS_SNAPSHOT = 'progress.last';

function getAuth() {
  const token = getAuthToken() || '';
  const userId = (getUserData() as Record<string, unknown>)?.id as string || (getUserData() as Record<string, unknown>)?._id as string || null;
  if (!token) {
    debug.warn('[ProgressSource.getAuth] No backend token found in storage. ' +
      'If there is an active NextAuth session, the token should be refreshed ' +
      'by LearningProgressContext before calling getSnapshot.');
  }
  return { token, userId };
}

function getLocalProgress(): LocalProgress | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    debug.error('Failed to read local progress:', error);
    return null;
  }
}

function saveLocalProgress(progress: LocalProgress): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    debug.error('Failed to save local progress:', error);
  }
}

function clearLocalProgress(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
  } catch (error) {
    debug.error('Failed to clear local progress:', error);
  }
}

function getLastSyncAt(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch (error) {
    return null;
  }
}

function setLastSyncAt(timestamp: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(LAST_SYNC_KEY, timestamp);
  } catch (error) {
    debug.error('Failed to save last sync timestamp:', error);
  }
}

function readLocalQueue(): LessonItem[] {
  try { return JSON.parse(localStorage.getItem(LS_QUEUE) || '[]'); } catch { return []; }
}

function enqueueLocal(it: LessonItem) {
  const q = readLocalQueue(); q.push(it);
  localStorage.setItem(LS_QUEUE, JSON.stringify(q));
}

function readLocalSnapshot(): ProgressSnapshot | null {
  try { return JSON.parse(localStorage.getItem(LS_SNAPSHOT) || 'null'); } catch { return null; }
}

function saveLocalSnapshot(s: ProgressSnapshot) {
  localStorage.setItem(LS_SNAPSHOT, JSON.stringify(s));
}

// =============================================================================
// RECONCILIATION LOGIC
// =============================================================================

/**
 * Merge local and DB progress
 * Rules:
 * - DB is primary source if user is authenticated
 * - Local is used for pending queue
 * - Resolve by max(updatedAt) and higher progress (never decrement)
 */
function mergeProgress(
  dbProgress: Partial<ProgressSnapshot> | null,
  localProgress: LocalProgress | null,
  userId: string | null
): ProgressSnapshot {
  const now = new Date().toISOString();
  const isAuthenticated = !!userId;

  // If not authenticated, use local only
  if (!isAuthenticated) {
    const localSnapshot: ProgressSnapshot = {
      userId: null,
      overview: {
        xpTotal: 0,
        level: 1,
        nextLevelXp: 500,
        streakDays: 0,
        calendar: [],
        // Count lessons with progress === 1 (not based on flags)
        // Lesson progress (0-1 float) is the single source of truth
        completedLessons: localProgress?.lessons.filter(l => {
          const progressValue = Math.max(0, Math.min(1, l.progress || 0));
          return progressValue === 1;
        }).length || 0,
        totalLessons: localProgress?.lessons.length || 0,
        modulesCompleted: 0,
        totalModules: 0
      },
      lessons: localProgress?.lessons.map(l => ({
        lessonId: l.lessonId,
        progress: l.progress,
        updatedAt: l.updatedAt
      })) || [],
      lastSyncAt: '',
      source: 'local'
    };

    debug.logSnapshot(localSnapshot, 'local (not authenticated)');
    return localSnapshot;
  }

  // If authenticated, merge DB (primary) + local (pending)
  const dbLessons = dbProgress?.lessons || [];
  const localLessons = localProgress?.lessons || [];

  // Create map of lessons by ID
  const mergedLessonsMap = new Map<string, { lessonId: string; progress: number; updatedAt: string }>();

  // Add DB lessons first (primary source)
  dbLessons.forEach(lesson => {
    mergedLessonsMap.set(lesson.lessonId, {
      lessonId: lesson.lessonId,
      progress: lesson.progress,
      updatedAt: lesson.updatedAt || now
    });
  });

  // CRITICAL FIX: Merge local lessons ONLY if they have HIGHER progress than DB
  // Database is the SINGLE SOURCE OF TRUTH - localStorage is only for pending changes
  // 
  // Rules:
  // 1. If lesson exists in DB → use DB progress UNLESS localStorage has higher progress
  // 2. If lesson only exists in localStorage → add it (pending sync to DB)
  // 3. NEVER downgrade progress (max of DB and localStorage)
  // 4. ALWAYS prefer DB timestamp unless localStorage has higher progress
  //
  // This ensures that when user clears localStorage, DB data is loaded correctly
  localLessons.forEach(localLesson => {
    const existing = mergedLessonsMap.get(localLesson.lessonId);

    if (!existing) {
      // New lesson in localStorage (not yet synced to DB) - add it
      mergedLessonsMap.set(localLesson.lessonId, {
        lessonId: localLesson.lessonId,
        progress: localLesson.progress,
        updatedAt: localLesson.updatedAt
      });
      debug.info('[ProgressSource] Merging local-only lesson:', localLesson.lessonId);
    } else {
      // Lesson exists in both DB and localStorage
      // CRITICAL: Only override DB if localStorage has HIGHER progress
      // This prevents localStorage from masking DB updates
      if (localLesson.progress > existing.progress) {
        debug.info('[ProgressSource] Local progress higher than DB, using local:', {
          lessonId: localLesson.lessonId,
          dbProgress: existing.progress,
          localProgress: localLesson.progress
        });
        mergedLessonsMap.set(localLesson.lessonId, {
          lessonId: localLesson.lessonId,
          progress: localLesson.progress,
          updatedAt: localLesson.updatedAt
        });
      } else {
        // DB has equal or higher progress - keep DB data
        // This is the CRITICAL FIX: when localStorage is cleared, DB data is preserved
        debug.info('[ProgressSource] DB progress equal or higher, using DB:', {
          lessonId: localLesson.lessonId,
          dbProgress: existing.progress,
          localProgress: localLesson.progress
        });
        // Keep existing (DB data) - no changes needed
      }
    }
  });

  const mergedLessons = Array.from(mergedLessonsMap.values());
  // Count lessons with progress === 1 (not based on flags)
  // Lesson progress (0-1 float) is the single source of truth
  const completedLessons = mergedLessons.filter(l => {
    const progressValue = Math.max(0, Math.min(1, l.progress || 0));
    return progressValue === 1;
  }).length;

  // Use DB overview if available, otherwise calculate from merged lessons
  const overview = dbProgress?.overview || {
    xpTotal: completedLessons * 100,
    level: Math.floor(completedLessons / 5) + 1,
    nextLevelXp: (Math.floor(completedLessons / 5) + 1) * 5 * 100,
    streakDays: 0,
    calendar: [],
    completedLessons,
    totalLessons: mergedLessons.length,
    modulesCompleted: 0,
    totalModules: 0
  };

  // Update completedLessons if we have merged data
  if (mergedLessons.length > 0) {
    overview.completedLessons = completedLessons;
  }

  const mergedSnapshot: ProgressSnapshot = {
    userId,
    overview,
    lessons: mergedLessons,
    lastSyncAt: getLastSyncAt() || now,
    source: 'merged'
  };

  debug.logSnapshot(mergedSnapshot, 'merged');

  // Log divergence if detected
  if (dbProgress && localProgress && dbProgress.lessons) {
    // Count lessons with progress === 1 (not based on flags)
    // Lesson progress (0-1 float) is the single source of truth
    const dbCompleted = dbProgress.lessons.filter(l => {
      const progressValue = Math.max(0, Math.min(1, l.progress || 0));
      return progressValue === 1;
    }).length;
    const localCompleted = localLessons.filter(l => {
      const progressValue = Math.max(0, Math.min(1, l.progress || 0));
      return progressValue === 1;
    }).length;
    if (Math.abs(dbCompleted - localCompleted) > 0) {
      debug.logDivergence(
        { overview: { completedLessons: localCompleted }, lastSyncAt: localProgress.lastUpdated },
        { overview: { completedLessons: dbCompleted }, lastSyncAt: dbProgress.lastSyncAt }
      );
    }
  }

  return mergedSnapshot;
}

function mergeSnapshots(userId: string | null, localSnap: ProgressSnapshot | null, localQueue: LessonItem[], dbOverview?: Overview, dbLessons?: LessonItem[]): ProgressSnapshot {
  let source: 'db' | 'local' | 'merged' = 'local';
  let lessons: LessonItem[] = localSnap?.lessons || [];
  if (dbLessons) {
    source = 'db';
    lessons = mergeLessons(lessons.concat(localQueue), dbLessons);
    if (localQueue.length) source = 'merged';
  }
  const overview = deriveOverview(dbOverview, lessons, localSnap?.overview);
  return {
    userId, source, overview, lessons,
    lastSyncAt: new Date().toISOString(),
    _modules: (dbOverview as Overview & { _modules?: ProgressSnapshot['_modules'] })?._modules || [],
    _levels: (dbOverview as Overview & { _levels?: ProgressSnapshot['_levels'] })?._levels || [],
  };
}

function mergeLessons(local: LessonItem[], db: LessonItem[]): LessonItem[] {
  const map = new Map<string, LessonItem>();
  for (const it of db) map.set(it.lessonId, it);
  for (const it of local) {
    const prev = map.get(it.lessonId);
    if (!prev || (it.progress > prev.progress)) map.set(it.lessonId, it);
  }
  return Array.from(map.values());
}

// Si no hay overview del backend, la derivamos con catálogo local (fallback)
function deriveOverview(db?: Overview, lessons?: LessonItem[], local?: Overview): Overview {
  if (db) return db;
  const totalLessons = local?.totalLessons ?? (Array.isArray(lessons) ? Math.max(lessons.length, 1) : 1);
  const completedLessons = (lessons || []).filter(x => x.progress >= 0.99).length;
  // Valores aproximados para no dejar vacío
  return {
    xpTotal: local?.xpTotal ?? 0,
    level: local?.level ?? 1,
    nextLevelXp: local?.nextLevelXp ?? 100,
    streakDays: local?.streakDays ?? 0,
    calendar: local?.calendar ?? [],
    completedLessons,
    totalLessons,
    modulesCompleted: local?.modulesCompleted ?? 0,
    totalModules: local?.totalModules ?? 1
  };
}

// =============================================================================
// PROGRESS SOURCE API
// =============================================================================

export const ProgressSource = {
  /**
   * Get progress snapshot (reconciled from DB and local)
   * 
   * CRITICAL: This is the SINGLE SOURCE OF TRUTH for progress data.
   * Database is PRIMARY, localStorage is SECONDARY (only for pending changes).
   * 
   * Flow:
   * 1. Check authentication (userId + token)
   * 2. Read localStorage queue (pending changes not yet synced)
   * 3. Fetch from DB (PRIMARY source)
   * 4. Merge: DB data + localStorage queue (only if localStorage has higher progress)
   * 5. Save merged snapshot for offline access
   * 
   * IMPORTANT: If user clears localStorage, this method will correctly load from DB.
   */
  async getSnapshot(): Promise<ProgressSnapshot> {
    const g = debug.group('ProgressSource.getSnapshot');

    const { token, userId } = getAuth();
    g.info('auth', { userId, hasToken: !!token, tokenPreview: debug.short(token) });

    // 1) Read local queue (pending changes NOT yet synced to DB)
    // DO NOT read full localStorage snapshot here - DB is primary source
    const localSnap = readLocalSnapshot();
    const localQueue = readLocalQueue();
    g.info('local state', { hasLocalSnap: !!localSnap, queueLen: localQueue.length });

    // 2) If authenticated, fetch from DB (PRIMARY source)
    let dbOverview: Overview | undefined;
    let dbLessons: LessonItem[] | undefined;

    if (token) {
      try {

        const o = await getOverview() as Record<string, unknown>;

        // CRITICAL DEBUG: Log the EXACT response from backend

        if (o?.overview) {
        }

        if (o?.lessons) {
          if (Array.isArray(o.lessons) && o.lessons.length > 0) {
          }
        }

        if (o?.modules) {
        }

        // getOverview returns overview data, extract lessons if available
        dbOverview = (o?.overview || o) as Overview;

        // Map lessons array: backend may use 'pageId' or 'lessonId', normalize to 'lessonId'
        const rawLessons = (o?.lessons || []) as Array<Record<string, unknown>>;
        dbLessons = rawLessons.map((l: Record<string, unknown>) => ({
          lessonId: l.lessonId || l.pageId || l.id || '',
          progress: typeof l.progress === 'number' ? l.progress : (l.completed ? 1 : 0),
          updatedAt: l.updatedAt || l.lastVisitedAt || new Date().toISOString(),
          // Preserve moduleId from backend so the sync effect in LearningProgressContext
          // can place each lesson in the correct module bucket without guessing.
          moduleId: l.moduleId || '',
        })).filter((l: LessonItem) => l.lessonId !== '');

        // La API retorna modules[], construir dbLessons adicionales si lessons estaba vacío
        const oModules = o?.modules as Array<Record<string, unknown>> | undefined;
        if (dbLessons.length === 0 && Array.isArray(oModules) && oModules.length) {
          dbLessons = oModules
            .filter((mod: Record<string, unknown>) => ((mod.progress as number) || (mod.percentComplete as number) || 0) > 0 || ((mod.completedLessons as number) || (mod.completedPages as number) || 0) > 0)
            .map((mod: Record<string, unknown>) => ({
              lessonId: `__module__${mod.id || mod.moduleId}`,
              progress: ((mod.progress || mod.percentComplete || 0)) / 100,
              updatedAt: new Date().toISOString(),
            }));
        }
        // Normalize modules data and store on dbOverview for moduleProgressAggregated fallback
        if (dbOverview && oModules) {
          (dbOverview as Overview & { _modules?: ProgressSnapshot['_modules'] })._modules = oModules.map((mod: Record<string, unknown>) => ({
            id: mod.id || mod.moduleId,
            moduleId: mod.id || mod.moduleId,
            progress: mod.progress ?? mod.percentComplete ?? 0,
            completedLessons: mod.completedLessons ?? mod.completedPages ?? 0,
            totalLessons: mod.totalLessons ?? mod.totalPages ?? 0,
            completed: mod.completed ?? false,
          }));
        }

        // Store level-aggregated data (totalLessons, completedLessons, progressPercentage per level)
        const rawLevels = o?.levels as Array<Record<string, unknown>> | undefined;
        if (dbOverview && Array.isArray(rawLevels) && rawLevels.length > 0) {
          (dbOverview as Overview & { _levels?: ProgressSnapshot['_levels'] })._levels = rawLevels;
        }

        g.info('db fetched', {
          overviewOk: !!dbOverview,
          lessonsCount: Array.isArray(dbLessons) ? dbLessons.length : 0
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        g.warn('db fetch failed', errMsg);
        console.error('');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('❌ DB fetch FAILED');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('   Error:', errMsg);
        console.error('   Full error:', err);
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('');
        console.error('   Will fall back to localStorage if available');
      }
    } else {
      g.warn('no token: using local only');
      console.warn('⚠️  No auth token - will use localStorage only (offline mode)');
    }

    // 3) Merge: DB (primary) + localStorage queue (only if higher progress)
    // CRITICAL: DB data takes precedence, localStorage only adds pending changes
    const merged = mergeSnapshots(userId, localSnap, localQueue, dbOverview, dbLessons);
    g.info('merged snapshot', {
      source: merged.source,
      completedLessons: merged.overview.completedLessons,
      totalLessons: merged.overview.totalLessons,
      modulesCompleted: merged.overview.modulesCompleted,
      totalModules: merged.overview.totalModules
    });

    // Log source breakdown for debugging
    if (merged.source === 'db') {
    } else if (merged.source === 'merged') {
    } else if (merged.source === 'local') {
    }

    // 4) Save merged snapshot for offline access
    saveLocalSnapshot(merged);
    g.end();
    return merged;
  },

  /**
   * Revalidate progress (force refresh)
   */
  async revalidate(): Promise<ProgressSnapshot> {
    const g = debug.group('ProgressSource.revalidate');
    const res = await this.getSnapshot();
    g.info('revalidated', { source: res.source, lastSyncAt: res.lastSyncAt });
    g.end();
    return res;
  },

  /**
   * Upsert lesson progress (save locally and queue for sync)
   * @param lessonId - The lesson ID (required, non-empty string)
   * @param progress - Progress value between 0 and 1
   * @param moduleId - The module ID (optional but recommended for validation)
   */
  async upsertLessonProgress(lessonId: string, progress: number, moduleId?: string): Promise<void> {
    const g = debug.group('ProgressSource.upsertLessonProgress');
    g.info('input', { lessonId, progress, moduleId });

    // ==========================================================================
    // STRICT VALIDATION - Prevent 400 errors from invalid payloads
    // ==========================================================================

    // 1. Validate lessonId is a non-empty string
    if (!lessonId || typeof lessonId !== 'string' || lessonId.trim() === '') {
      g.warn('ABORTED: lessonId is invalid or empty', { lessonId });
      g.end();
      return;
    }

    // 2. Validate progress is a valid number between 0 and 1
    if (typeof progress !== 'number' || isNaN(progress) || progress < 0 || progress > 1) {
      g.warn('ABORTED: progress must be a number between 0 and 1', { lessonId, progress });
      g.end();
      return;
    }

    // 3. Warn if moduleId is missing (but don't block - for backwards compatibility)
    if (!moduleId) {
      g.warn('moduleId not provided - request may fail if backend requires it', { lessonId });
    }

    // 4. Check if lesson is already completed - prevent redundant updates
    const localSnap = readLocalSnapshot();
    const existingLesson = localSnap?.lessons?.find(l => l.lessonId === lessonId);
    if (existingLesson && existingLesson.progress >= 1 && progress <= existingLesson.progress) {
      g.info('SKIPPED: lesson already completed, no progress increase', { lessonId, currentProgress: existingLesson.progress, requestedProgress: progress });
      g.end();
      return;
    }

    // ==========================================================================
    // EXECUTE THE UPSERT
    // ==========================================================================
    const { token } = getAuth();
    if (!token) {
      // cola local modo offline
      enqueueLocal({ lessonId, progress, updatedAt: new Date().toISOString() });
      g.warn('offline/local queued');
      g.end();
      return;
    }
    // Intento directo a DB
    try {
      const { updateLessonProgress } = await import('./progressService.js');
      // Calculate completionPercentage to send consistent data
      const completionPercentage = Math.round(progress * 100);
      await updateLessonProgress({
        lessonId,
        moduleId, // Include moduleId in the request
        progress,
        completionPercentage,
        completed: progress >= 1.0
      });
      g.info('synced to DB');
    } catch (err: unknown) {
      g.warn('server refused, enqueuing local', err instanceof Error ? err.message : err);
      enqueueLocal({ lessonId, progress, updatedAt: new Date().toISOString() });
    }
    g.end();
  },

  /**
   * Migrate local progress to DB (called on login)
   */
  async migrateLocalToDB(): Promise<void> {
    const userId = (getUserData() as Record<string, unknown>)?.id as string || (getUserData() as Record<string, unknown>)?._id as string || null;
    const hasToken = !!getAuthToken();

    if (!userId || !hasToken) {
      debug.warn('Cannot migrate: not authenticated');
      return;
    }

    const localProgress = getLocalProgress();
    if (!localProgress || localProgress.lessons.length === 0) {
      debug.info('No local progress to migrate');
      return;
    }

    debug.info(`Migrating ${localProgress.lessons.length} lessons to DB...`);

    try {
      // Import here to avoid circular dependency
      const { updateLessonProgress } = await import('./progressService.js');

      // Migrate all lessons
      await Promise.all(
        localProgress.lessons.map(lesson => {
          // Get progress value (0-1)
          const progressValue = Math.max(0, Math.min(1, lesson.progress || 0));
          return updateLessonProgress({
            lessonId: lesson.lessonId,
            progress: progressValue,
            // Only set completed flag if progress === 1 (explicit completion)
            // The backend may store this flag, but we don't use it for calculations
            ...(progressValue === 1 && { completed: true })
          }).catch(err => {
            debug.warn(`Failed to migrate lesson ${lesson.lessonId}:`, err);
          });
        })
      );

      // Clear local progress after successful migration
      clearLocalProgress();
      setLastSyncAt(new Date().toISOString());
      debug.info('Local progress migrated successfully');
    } catch (error) {
      debug.error('Failed to migrate local progress:', error);
      throw error;
    }
  }
};

export default ProgressSource;

