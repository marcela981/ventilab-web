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
} from '../api/progressService';
import { getAuthToken, getUserData } from '../authService';
import { debug } from '../../utils/debug';

// =============================================================================
// TYPES
// =============================================================================

export type LessonItem = { lessonId:string; progress:number; updatedAt?:string };

export type Overview = {
  xpTotal:number; level:number; nextLevelXp:number; streakDays:number;
  calendar:Array<{date:string;hasActivity:boolean;lessonsCompleted:number}>;
  completedLessons:number; totalLessons:number; modulesCompleted:number; totalModules:number;
};

export type ProgressSnapshot = {
  userId: string | null;
  overview: Overview;
  lessons: LessonItem[];
  lastSyncAt?: string;
  source: 'db' | 'local' | 'merged';
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
  // Ajustar si tu AuthContext expone token/userId distinto
  const token = getAuthToken() || '';
  const userId = getUserData()?.id || getUserData()?._id || null;
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

function readLocalSnapshot(): ProgressSnapshot|null {
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
      lastSyncAt: null,
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

  // Merge local lessons (use if newer or higher progress)
  localLessons.forEach(localLesson => {
    const existing = mergedLessonsMap.get(localLesson.lessonId);

    if (!existing) {
      // New lesson, add it
      mergedLessonsMap.set(localLesson.lessonId, {
        lessonId: localLesson.lessonId,
        progress: localLesson.progress,
        updatedAt: localLesson.updatedAt
      });
    } else {
      // Compare timestamps and progress
      const localTime = new Date(localLesson.updatedAt).getTime();
      const dbTime = new Date(existing.updatedAt).getTime();

      // Use the one with higher progress (never decrement)
      if (localLesson.progress > existing.progress) {
        mergedLessonsMap.set(localLesson.lessonId, {
          lessonId: localLesson.lessonId,
          progress: localLesson.progress,
          updatedAt: localLesson.updatedAt
        });
      } else if (localTime > dbTime && localLesson.progress === existing.progress) {
        // Same progress but local is newer, update timestamp
        mergedLessonsMap.set(localLesson.lessonId, {
          ...existing,
          updatedAt: localLesson.updatedAt
        });
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

function mergeSnapshots(userId:string|null, localSnap:any, localQueue:LessonItem[], dbOverview?:Overview, dbLessons?:LessonItem[]): ProgressSnapshot {
  let source: 'db'|'local'|'merged' = 'local';
  let lessons: LessonItem[] = localSnap?.lessons || [];
  if (dbLessons) {
    source = 'db';
    lessons = mergeLessons(lessons.concat(localQueue), dbLessons);
    if (localQueue.length) source = 'merged';
  }
  const overview = deriveOverview(dbOverview, lessons, localSnap?.overview);
  return { userId, source, overview, lessons, lastSyncAt: new Date().toISOString() };
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
function deriveOverview(db?:Overview, lessons?:LessonItem[], local?:Overview): Overview {
  if (db) return db;
  const totalLessons = local?.totalLessons ?? (Array.isArray(lessons) ? Math.max(lessons.length, 1) : 1);
  const completedLessons = (lessons||[]).filter(x => x.progress >= 0.99).length;
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
   */
  async getSnapshot(): Promise<ProgressSnapshot> {
    const g = debug.group('ProgressSource.getSnapshot');
    const { token, userId } = getAuth();
    g.info('auth', { userId, hasToken: !!token, tokenPreview: debug.short(token) });

    // 1) lee local
    const localSnap = readLocalSnapshot();
    const localQueue = readLocalQueue();
    g.info('local state', { hasLocalSnap: !!localSnap, queueLen: localQueue.length });

    // 2) si hay token, intenta DB
    let dbOverview: Overview|undefined;
    let dbLessons: LessonItem[]|undefined;

    if (token) {
      try {
        const o = await getOverview();
        // getOverview returns overview data, extract lessons if available
        dbOverview = o?.overview || o; // por si la API responde plano
        dbLessons  = o?.lessons  || []; // lessons might be in overview response
        g.info('db fetched', {
          overviewOk: !!dbOverview,
          lessonsCount: Array.isArray(dbLessons) ? dbLessons.length : 0
        });
      } catch (err: any) {
        g.warn('db fetch failed', err?.message);
      }
    } else {
      g.warn('no token: using local only');
    }

    // 3) merge reglas (nunca decrementar)
    const merged = mergeSnapshots(userId, localSnap, localQueue, dbOverview, dbLessons);
    g.info('merged snapshot', {
      source: merged.source,
      completedLessons: merged.overview.completedLessons,
      totalLessons: merged.overview.totalLessons,
      modulesCompleted: merged.overview.modulesCompleted,
      totalModules: merged.overview.totalModules
    });

    // 4) persistir último snapshot para diagnóstico
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
      const { updateLessonProgress } = await import('../api/progressService');
      await updateLessonProgress({
        lessonId,
        moduleId, // Include moduleId in the request
        progress,
        completed: progress >= 1.0
      });
      g.info('synced to DB');
    } catch (err: any) {
      g.warn('server refused, enqueuing local', err?.message);
      enqueueLocal({ lessonId, progress, updatedAt: new Date().toISOString() });
    }
    g.end();
  },

  /**
   * Migrate local progress to DB (called on login)
   */
  async migrateLocalToDB(): Promise<void> {
    const userId = getUserData()?.id || getUserData()?._id || null;
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
      const { updateLessonProgress } = await import('../api/progressService');

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

