/**
 * =============================================================================
 * VentyLab — Progress DTO (frontend mirror)
 * =============================================================================
 *
 * Mirrors the canonical contract defined in the backend
 * (`ventylab-server/src/modules/teaching/progress.dto.ts`).
 *
 * The dashboard MUST consume `modules[]` from this shape — never `lessons[]`,
 * never `localStorage`. Any drift between these types and the server response
 * indicates a bug in the API layer that must be fixed at the source.
 *
 * Module: src/features/ensenanza/shared/progreso/types/progress.types.ts
 * =============================================================================
 */

export interface ProgressOverviewModuleDTO {
  moduleId: string;
  lessonsTotal: number;
  lessonsCompleted: number;
  /** Integer percent (0..100). */
  percent: number;
}

export interface ProgressOverviewDTO {
  modules: ProgressOverviewModuleDTO[];
}

/** Payload accepted by `markLessonComplete()` on the API client. */
export interface CompleteLessonInput {
  lessonId: string;
  moduleId: string;
  totalSteps: number;
  /** Optional — seconds spent on the lesson since the last save. */
  timeSpentDelta?: number;
  quizScore?: number;
  caseScore?: number;
}
