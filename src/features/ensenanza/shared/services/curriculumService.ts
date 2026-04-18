/**
 * curriculumService.ts
 * =====================
 * Async service that replaces static curriculumData.js imports.
 * Fetches curriculum structure from the backend API and returns
 * the same data shapes that curriculumData.js currently exports,
 * so components can migrate with minimal changes.
 *
 * Cache: simple in-memory Map with 5-minute TTL per key.
 *
 * Autor   : Marcela Mazo Castro
 * Proyecto: VentyLab
 */

import { BACKEND_API_URL } from '@/config/env';

// ─── Cache ───────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── API response types ───────────────────────────────────────────────────────

export interface ApiLevelModule {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  estimatedTime: number | null;
  order: number;
  category: string | null;
  progressPercentage: number;
  isCompleted: boolean;
  lessonCount: number;
}

export interface ApiLevel {
  id: string;        // slug — 'beginner', 'intermediate', etc.
  dbId: string;      // actual DB id — 'level-beginner'
  track: string;
  title: string;
  description: string | null;
  color: string;
  emoji: string;
  order: number;
  modules: ApiLevelModule[];
  totalModules: number;
  completedModules: number;
  progressPercentage: number;
  isCompleted: boolean;
  isUnlocked: boolean;
}

export interface ApiLesson {
  id: string;
  title: string;
  description?: string | null;
  estimatedTime?: number | null;
  difficulty?: string | null;
  order: number;
  slug?: string | null;
  isActive: boolean;
}

export interface ApiStep {
  id: string;
  title: string | null;
  content: string;
  contentType: string;
  order: number;
  isActive: boolean;
}

// ─── Shape that curriculumData.js exports ─────────────────────────────────────

export interface CurriculumLesson {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  difficulty: string;
  order: number;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface CurriculumModule {
  id: string;
  title: string;
  level: string;       // slug: 'beginner' | 'intermediate' | etc.
  track?: string;
  order: number;
  duration: number;    // estimatedTime in minutes
  estimatedTime: string;
  description: string;
  difficulty: string;
  prerequisites: string[];
  learningObjectives: string[];
  bloomLevel: string;
  lessons: CurriculumLesson[];
}

export interface CurriculumLevel {
  id: string;
  title: string;
  description: string;
  color: string;
  emoji: string;
  estimatedDuration?: string;
  mandatory?: boolean;
}

export interface CurriculumData {
  levels: CurriculumLevel[];
  modules: Record<string, CurriculumModule>;
  metadata: {
    lastUpdated: string;
    version: string;
  };
}

export interface ModuleWithLessons extends CurriculumModule {
  lessons: CurriculumLesson[];
}

export interface LessonWithSteps {
  id: string;
  title: string;
  description: string | null;
  estimatedTime: number | null;
  moduleId: string;
  steps: ApiStep[];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function apiFetch<T>(endpoint: string): Promise<T> {
  const url = `${BACKEND_API_URL}${endpoint}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[curriculumService] ${res.status} ${res.statusText} — ${url}`);
  }
  const json = await res.json();
  // Backend wraps responses: { success, data }
  return (json.data ?? json) as T;
}

function mapApiLevelToShape(level: ApiLevel): CurriculumLevel {
  return {
    id: level.id,
    title: level.title,
    description: level.description ?? '',
    color: level.color,
    emoji: level.emoji,
  };
}

function mapApiModuleToShape(mod: ApiLevelModule, levelId: string, track: string): CurriculumModule {
  return {
    id: mod.id,
    title: mod.title,
    level: levelId,
    track,
    order: mod.order,
    duration: mod.estimatedTime ?? 0,
    estimatedTime: mod.estimatedTime ? `${mod.estimatedTime} min` : 'Variable',
    description: mod.description ?? '',
    difficulty: mod.difficulty ?? 'beginner',
    prerequisites: [],
    learningObjectives: [],
    bloomLevel: 'apply',
    lessons: [],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the full curriculum structure.
 * Returns the same shape as curriculumData.js so components can do a drop-in replacement.
 * Fetches both mecanica and ventylab tracks and merges them.
 */
export async function fetchCurriculum(): Promise<CurriculumData> {
  const cacheKey = 'curriculum:all';
  const cached = getCached<CurriculumData>(cacheKey);
  if (cached) return cached;

  // Fetch both tracks in parallel
  const [mecanicaLevels, ventylabLevels] = await Promise.all([
    apiFetch<ApiLevel[]>('/levels/curriculum?track=mecanica'),
    apiFetch<ApiLevel[]>('/levels/curriculum?track=ventylab'),
  ]);

  const allLevels = [...mecanicaLevels, ...ventylabLevels];

  // Build levels array (only mecanica levels for the main sidebar — matches curriculumData.js)
  const levels: CurriculumLevel[] = mecanicaLevels.map(mapApiLevelToShape);

  // Build modules object (all tracks)
  const modules: Record<string, CurriculumModule> = {};
  for (const level of allLevels) {
    for (const mod of level.modules) {
      modules[mod.id] = mapApiModuleToShape(mod, level.id, level.track);
    }
  }

  const result: CurriculumData = {
    levels,
    modules,
    metadata: {
      lastUpdated: new Date().toISOString().split('T')[0],
      version: '2.0',
    },
  };

  setCached(cacheKey, result);
  return result;
}

/**
 * Fetch a module with its full lesson list (lesson metadata, not content).
 * Calls GET /api/modules/:moduleId/lessons
 */
export async function fetchModuleWithLessons(moduleId: string): Promise<ModuleWithLessons> {
  const cacheKey = `module:${moduleId}:lessons`;
  const cached = getCached<ModuleWithLessons>(cacheKey);
  if (cached) return cached;

  const [moduleData, lessonsData] = await Promise.all([
    apiFetch<ApiLevelModule & { level?: { id: string; track: string } }>(`/modules/${moduleId}`),
    apiFetch<ApiLesson[]>(`/modules/${moduleId}/lessons`),
  ]);

  const levelId = moduleData.level?.id ?? '';
  const track = moduleData.level?.track ?? 'mecanica';

  const lessons: CurriculumLesson[] = lessonsData.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description ?? '',
    estimatedTime: lesson.estimatedTime ?? 0,
    difficulty: lesson.difficulty ?? 'beginner',
    order: lesson.order,
    type: 'reading',
  }));

  const result: ModuleWithLessons = {
    ...mapApiModuleToShape(moduleData as ApiLevelModule, levelId, track),
    lessons,
  };

  setCached(cacheKey, result);
  return result;
}

/**
 * Fetch a lesson with its full step (card) content.
 * Calls GET /api/lessons/:lessonId and GET /api/lessons/:lessonId/steps
 */
export async function fetchLessonWithSteps(lessonId: string): Promise<LessonWithSteps> {
  const cacheKey = `lesson:${lessonId}:steps`;
  const cached = getCached<LessonWithSteps>(cacheKey);
  if (cached) return cached;

  const [lessonData, stepsData] = await Promise.all([
    apiFetch<ApiLesson & { moduleId?: string }>(`/lessons/${lessonId}`),
    apiFetch<ApiStep[]>(`/lessons/${lessonId}/steps`),
  ]);

  const result: LessonWithSteps = {
    id: lessonData.id,
    title: lessonData.title,
    description: lessonData.description ?? null,
    estimatedTime: lessonData.estimatedTime ?? null,
    moduleId: lessonData.moduleId ?? '',
    steps: stepsData.filter((s) => s.isActive).sort((a, b) => a.order - b.order),
  };

  setCached(cacheKey, result);
  return result;
}

/**
 * Clear the in-memory cache. Useful when user logs in/out or after mutations.
 */
export function clearCurriculumCache(): void {
  cache.clear();
}
