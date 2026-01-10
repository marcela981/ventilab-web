/**
 * =============================================================================
 * Database Logger
 * =============================================================================
 * Instrumentación de logs para Prisma queries, errores y métricas
 * 
 * Funcionalidades:
 * - Logging de tiempos de queries
 * - Captura de errores de violación de índice único (P2002)
 * - Métricas básicas (número de upserts por sesión)
 * 
 * Controlado por flag LOG_DB en .env
 * =============================================================================
 */

import { Prisma } from '@prisma/client';

/**
 * Flag para activar/desactivar logging de DB
 * Se lee desde variable de entorno LOG_DB (default: false)
 */
const LOG_DB_ENABLED = process.env.LOG_DB === 'true';

/**
 * Métricas por sesión (request)
 */
interface SessionMetrics {
  upserts: number;
  queries: number;
  totalQueryTime: number;
  errors: {
    P2002: number;
    others: number;
  };
}

/**
 * Almacenamiento de métricas por sesión
 * Usa Map para mantener contexto por request
 */
const sessionMetrics = new Map<string, SessionMetrics>();

/**
 * Generar ID único para cada request/sesión
 * En producción, se puede usar un request ID de headers si está disponible
 */
export function getSessionId(): string {
  // En Next.js App Router, podemos usar headers para identificar requests
  // Por simplicidad, usamos timestamp + random
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtener o crear métricas para una sesión
 */
function getSessionMetrics(sessionId: string): SessionMetrics {
  if (!sessionMetrics.has(sessionId)) {
    sessionMetrics.set(sessionId, {
      upserts: 0,
      queries: 0,
      totalQueryTime: 0,
      errors: {
        P2002: 0,
        others: 0,
      },
    });
  }
  return sessionMetrics.get(sessionId)!;
}

/**
 * Limpiar métricas antiguas (más de 1 hora)
 */
function cleanupOldMetrics() {
  // En producción, implementar limpieza periódica si es necesario
  // Por ahora, las métricas se mantienen en memoria durante la sesión
}

/**
 * Setup query logging con tiempos
 * Debe llamarse una vez al inicializar el cliente de Prisma
 */
export function setupPrismaQueryLogging(prisma: any) {
  if (!LOG_DB_ENABLED) {
    return;
  }

  // Listener para eventos de query
  prisma.$on('query', (e: Prisma.QueryEvent) => {
    const queryTime = e.duration || 0;
    const sessionId = getSessionId();
    const metrics = getSessionMetrics(sessionId);

    // Actualizar métricas
    metrics.queries++;
    metrics.totalQueryTime += queryTime;

    // Detectar upserts
    const queryString = e.query.toLowerCase();
    if (queryString.includes('insert') && queryString.includes('on conflict')) {
      metrics.upserts++;
    }

    // Log con formato estructurado
    console.log('[DB Query]', {
      timestamp: new Date().toISOString(),
      query: e.query,
      params: e.params,
      duration: `${queryTime}ms`,
      target: e.target,
    });
  });

  // Listener para errores
  prisma.$on('error', (e: Prisma.LogEvent) => {
    const sessionId = getSessionId();
    const metrics = getSessionMetrics(sessionId);

    // Detectar código de error P2002
    if (e.message && e.message.includes('P2002')) {
      metrics.errors.P2002++;
    } else {
      metrics.errors.others++;
    }

    console.error('[DB Error]', {
      timestamp: new Date().toISOString(),
      level: e.level,
      message: e.message,
      target: e.target,
    });
  });
}

/**
 * Registrar un query manualmente (para tracking por sesión)
 */
export function recordQuery(sessionId: string, duration: number) {
  if (!LOG_DB_ENABLED) return;

  const metrics = getSessionMetrics(sessionId);
  metrics.queries++;
  metrics.totalQueryTime += duration;
}

/**
 * Registrar un upsert manualmente
 */
export function recordUpsert(sessionId: string) {
  if (!LOG_DB_ENABLED) return;

  const metrics = getSessionMetrics(sessionId);
  metrics.upserts++;
}

/**
 * Registrar un error P2002
 */
export function recordP2002Error(sessionId: string) {
  if (!LOG_DB_ENABLED) return;

  const metrics = getSessionMetrics(sessionId);
  metrics.errors.P2002++;

  console.log('[DB P2002]', {
    timestamp: new Date().toISOString(),
    message: 'El progreso ya existe; se actualizó',
    sessionId,
  });
}

/**
 * Obtener métricas de una sesión
 */
export function getMetrics(sessionId: string): SessionMetrics | null {
  if (!LOG_DB_ENABLED) return null;
  return sessionMetrics.get(sessionId) || null;
}

/**
 * Log métricas al final de una request
 */
export function logSessionMetrics(sessionId: string, endpoint: string) {
  if (!LOG_DB_ENABLED) return;

  const metrics = getSessionMetrics(sessionId);
  const avgQueryTime = metrics.queries > 0
    ? Math.round(metrics.totalQueryTime / metrics.queries)
    : 0;

  console.log('[DB Metrics]', {
    timestamp: new Date().toISOString(),
    endpoint,
    sessionId,
    queries: metrics.queries,
    upserts: metrics.upserts,
    avgQueryTime: `${avgQueryTime}ms`,
    totalQueryTime: `${metrics.totalQueryTime}ms`,
    errors: metrics.errors,
  });
}

/**
 * Limpiar métricas de una sesión
 */
export function clearSessionMetrics(sessionId: string) {
  sessionMetrics.delete(sessionId);
}

export default {
  setupPrismaQueryLogging,
  recordUpsert,
  recordP2002Error,
  getMetrics,
  logSessionMetrics,
  clearSessionMetrics,
  getSessionId,
};

