/**
 * =============================================================================
 * VentyLab — Progress API Client
 * =============================================================================
 *
 * Thin HTTP layer for the educational-progress pipeline.
 *
 *   GET  /api/progress/overview                       → ProgressOverviewDTO
 *   POST /api/progress/lesson/:lessonId/complete-unified → triggers the
 *                                                          Prisma upsert chain
 *                                                          (LessonCompletion +
 *                                                           UserProgress).
 *
 * This module has ZERO knowledge of localStorage / sessionStorage. The DB is
 * the only source of truth — when the response arrives, the caller (the
 * `useProgress` hook) hands it directly to React state via SWR.
 *
 * Module: src/features/ensenanza/shared/progreso/api/progress.api.ts
 * =============================================================================
 */

import { BACKEND_API_URL } from '@/config/env';
import { getAuthToken } from '@/shared/services/authService';
import type {
  CompleteLessonInput,
  ProgressOverviewDTO,
  ProgressOverviewModuleDTO,
} from '../types/progress.types';

/** Builds Authorization headers from the current bridge token. */
function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * Normalises a raw `modules[]` row coming from the server into the canonical
 * DTO. Accepts both the new contract fields and the legacy aliases so that
 * a partially-deployed backend never breaks the UI.
 */
function normaliseModule(raw: Record<string, unknown>): ProgressOverviewModuleDTO {
  const moduleId = (raw.moduleId as string) ?? (raw.id as string) ?? '';
  const lessonsTotal =
    (raw.lessonsTotal as number) ??
    (raw.totalLessons as number) ??
    (raw.totalPages as number) ??
    0;
  const lessonsCompleted =
    (raw.lessonsCompleted as number) ??
    (raw.completedLessons as number) ??
    (raw.completedPages as number) ??
    0;
  const rawPercent =
    (raw.percent as number) ??
    (raw.percentComplete as number) ??
    (raw.progress as number) ??
    0;
  const percent = Math.max(0, Math.min(100, Math.round(rawPercent)));
  return { moduleId, lessonsTotal, lessonsCompleted, percent };
}

/**
 * Fetches the dashboard overview from the backend and projects the response
 * down to the contract DTO. Throws on non-2xx so SWR can surface the error.
 */
export async function fetchProgressOverview(
  signal?: AbortSignal,
): Promise<ProgressOverviewDTO> {
  const res = await fetch(`${BACKEND_API_URL}/progress/overview`, {
    method: 'GET',
    headers: authHeaders({ 'Cache-Control': 'no-cache' }),
    credentials: 'include',
    signal,
  });

  if (!res.ok) {
    throw new Error(`fetchProgressOverview failed (${res.status})`);
  }

  const json = (await res.json()) as { modules?: unknown };
  const rawModules = Array.isArray(json.modules) ? json.modules : [];
  const modules = rawModules
    .map((m) => normaliseModule(m as Record<string, unknown>))
    .filter((m) => m.moduleId.length > 0);

  return { modules };
}

/**
 * Marks a lesson as complete. Hits the unified endpoint, which performs the
 * Prisma upsert against `LessonCompletion` and recalculates `UserProgress`
 * inside a transaction. The response is intentionally discarded here — the
 * caller is expected to revalidate the overview via SWR `mutate()`.
 */
export async function markLessonComplete(
  input: CompleteLessonInput,
): Promise<void> {
  const { lessonId, moduleId, totalSteps, timeSpentDelta, quizScore, caseScore } = input;

  if (!lessonId || !moduleId || !Number.isFinite(totalSteps) || totalSteps < 1) {
    throw new Error('markLessonComplete: invalid payload');
  }

  const res = await fetch(
    `${BACKEND_API_URL}/progress/lesson/${encodeURIComponent(lessonId)}/complete-unified`,
    {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({
        moduleId,
        totalSteps,
        ...(typeof timeSpentDelta === 'number' ? { timeSpentDelta } : {}),
        ...(typeof quizScore === 'number' ? { quizScore } : {}),
        ...(typeof caseScore === 'number' ? { caseScore } : {}),
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`markLessonComplete failed (${res.status})`);
  }
}

/** SWR cache key for the dashboard overview. Stable — share across hooks. */
export const PROGRESS_OVERVIEW_KEY = '/api/progress/overview';
