// frontend/src/utils/debug.ts

// Get debug flag from environment (Next.js uses process.env, Vite uses import.meta.env)
function getDebugEnabled(): boolean {
  if (typeof window !== 'undefined') {
    // Client-side: check both Next.js and Vite env vars
    return (
      process.env.NEXT_PUBLIC_DEBUG_PROGRESS === 'true' ||
      (typeof (window as Record<string, unknown>).__VENTY_ENV !== 'undefined' && ((window as Record<string, unknown>).__VENTY_ENV as Record<string, unknown>)?.VITE_DEBUG_PROGRESS === 'true')
    );
  }
  // Server-side: only Next.js env vars are available
  return process.env.DEBUG_PROGRESS === 'true' || process.env.NEXT_PUBLIC_DEBUG_PROGRESS === 'true';
}

let enabled = getDebugEnabled();

function short(str?: string) {
  if (!str) return 'none';
  if (str.length <= 10) return str;
  return `${str.slice(0,4)}…${str.slice(-4)}`;
}

function now() {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
}

export const debug = {
  enable() { enabled = true; console.info('[progress] debug enabled'); },
  disable() { enabled = false; console.info('[progress] debug disabled'); },
  group(label: string) {
    if (!enabled) return { log(){}, info(){}, warn(){}, error(){}, end(){} };
    console.groupCollapsed(`%c[progress] ${label}`, 'color:#0aa');
    return {
      log:  (...a:unknown[]) => enabled && console.log(...a),
      info: (...a:unknown[]) => enabled && console.info(...a),
      warn: (...a:unknown[]) => enabled && console.warn(...a),
      error:(...a:unknown[]) => enabled && console.error(...a),
      end:  () => enabled && console.groupEnd(),
    };
  },
  info: (...a:unknown[]) => enabled && console.info('[progress]', ...a),
  warn: (...a:unknown[]) => enabled && console.warn('[progress]', ...a),
  error:(...a:unknown[]) => enabled && console.error('[progress]', ...a),
  short,
  now,
  /**
   * Log progress snapshot details
   */
  logSnapshot: (snapshot: Record<string, unknown> | null, source: string) => {
    if (!enabled) return;
    debug.info(`Snapshot from ${source}:`, {
      userId: snapshot?.userId || 'null',
      completedLessons: snapshot?.overview?.completedLessons || 0,
      totalLessons: snapshot?.overview?.totalLessons || 0,
      modulesCompleted: snapshot?.overview?.modulesCompleted || 0,
      totalModules: snapshot?.overview?.totalModules || 0,
      xpTotal: snapshot?.overview?.xpTotal || 0,
      source: snapshot?.source || source,
      lastSyncAt: snapshot?.lastSyncAt || 'never'
    });
  },
  /**
   * Log authentication state
   */
  logAuth: (userId: string | null, hasToken: boolean, baseURL: string) => {
    if (!enabled) return;
    debug.info('Auth state:', {
      userId: userId || 'null',
      hasToken,
      baseURL,
      timestamp: new Date().toISOString()
    });
  },
  /**
   * Log divergence between sources
   */
  logDivergence: (local: Record<string, unknown> | null, db: Record<string, unknown> | null) => {
    if (!enabled) return;
    debug.warn('Progress divergence detected:', {
      local: {
        completedLessons: local?.overview?.completedLessons || 0,
        lastSyncAt: local?.lastSyncAt || 'never'
      },
      db: {
        completedLessons: db?.overview?.completedLessons || 0,
        lastSyncAt: db?.lastSyncAt || 'never'
      }
    });
  },
  /**
   * Log empty state reason
   */
  logEmptyStateReason: (reason: string, details?: unknown) => {
    if (!enabled) return;
    debug.warn(`Empty state reason: ${reason}`, details);
  }
};

// Comandos desde consola (solo en cliente):
if (typeof window !== 'undefined') {
  (window as Record<string, unknown>).__VENTY_DEBUG = { debug };
}

// Legacy compatibility exports
export default debug;
