/*
* Funcionalidad: Evaluation attempts entities
* Descripción: View models and pure rules of the unified grading screen (tabs revisar, estadisticas, publicacion with their labels; the attempt status labels; the builder URL that extends an assignment window) and of its attempts list: one attempt row (student, status, attempt number, dates, score and grade, publication, lateness), a page of rows with the counts per status of the whole evaluation (the counts ignore the status filter), the status filter values read from and written to the URL (`?status=SUBMITTED,PENDING_REVIEW`), the query sent to `GET /api/evaluation-grading/attempts` (evaluationId required, groupId and status optional, 1-based page) and whether a teacher may offer "Reiniciar intento" for a row (SUBMITTED, PENDING_REVIEW and GRADED). Depends on nothing at runtime. v1.1 (Bloque 3): tabs, status labels and the builder URL of the unified grading screen. v1.2 (ajustes C1): rows carry answersReleasedAt (the release state of the list).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const ATTEMPT_STATUSES = ["IN_PROGRESS", "SUBMITTED", "PENDING_REVIEW", "GRADED"] as const;
export type GradingAttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export type EvaluationAttemptRow = {
  attemptId: string
  evaluationId: string
  assignmentId: string | null
  groupId: string | null
  attemptNumber: number
  studentId: string
  studentName: string | null
  studentEmail: string
  status: GradingAttemptStatus
  startedAt: string
  submittedAt: string | null
  score: number | null
  maxScore: number | null
  grade: number | null
  gradePublishedAt: string | null
  answersReleasedAt: string | null
  isLate: boolean
};

export type AttemptStatusCounts = Record<GradingAttemptStatus, number> & { total: number };

export type EvaluationAttemptsPage = {
  items: EvaluationAttemptRow[]
  counts: AttemptStatusCounts
  total: number
  page: number
  pages: number
};

export type EvaluationAttemptsQuery = {
  evaluationId: string
  groupId?: string
  status?: string
  page: number
  limit: number
};

export type EvaluationAttemptsFilters = {
  groupId: string
  statuses: GradingAttemptStatus[]
};

export function isAttemptStatus(value: string): value is GradingAttemptStatus {
  return (ATTEMPT_STATUSES as readonly string[]).includes(value);
}

// `?status=A,B` → known statuses in canonical order, without duplicates; anything else is ignored.
export function parseStatusFilter(value: string | readonly string[] | undefined | null): GradingAttemptStatus[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  const wanted = new Set(String(raw).split(",").map((part) => part.trim()).filter(isAttemptStatus));

  return ATTEMPT_STATUSES.filter((status) => wanted.has(status));
}

export function formatStatusFilter(statuses: readonly GradingAttemptStatus[]): string {
  return parseStatusFilter(statuses.join(",")).join(",");
}

// pageIndex is 0-based (table pagination); the API page is 1-based.
export function toEvaluationAttemptsQuery(
  evaluationId: string,
  filters: EvaluationAttemptsFilters,
  pageIndex: number,
  limit: number,
): EvaluationAttemptsQuery {
  const status = formatStatusFilter(filters.statuses);

  return {
    evaluationId,
    ...(filters.groupId ? { groupId: filters.groupId } : {}),
    ...(status ? { status } : {}),
    page: pageIndex + 1,
    limit,
  };
}

const RESETTABLE: ReadonlySet<GradingAttemptStatus> = new Set(["SUBMITTED", "PENDING_REVIEW", "GRADED"]);

// An attempt in progress cannot be reset (the backend answers 409 evaluation.attempt_in_progress).
export function canResetAttempt(row: Pick<EvaluationAttemptRow, "status">): boolean {
  return RESETTABLE.has(row.status);
}

// Header of the list, as in July: "Total · Entregadas · Calificadas".
export function summarizeCounts(counts: AttemptStatusCounts): { total: number, submitted: number, graded: number } {
  return {
    total: counts.total,
    submitted: counts.SUBMITTED + counts.PENDING_REVIEW + counts.GRADED,
    graded: counts.GRADED,
  };
}

export const RESET_REASON_MAX = 500;

// TODO(i18n): move to a grading namespace in src/i18n.
export const GRADING_ATTEMPT_STATUS_LABELS: Record<GradingAttemptStatus, string> = {
  IN_PROGRESS: "En curso",
  SUBMITTED: "Entregado",
  PENDING_REVIEW: "Por revisar",
  GRADED: "Calificado",
};

export const GRADING_TABS = ["revisar", "estadisticas", "publicacion"] as const;
export type GradingTab = (typeof GRADING_TABS)[number];
export const DEFAULT_GRADING_TAB: GradingTab = "revisar";

export const GRADING_TAB_LABELS: Record<GradingTab, string> = {
  revisar: "Revisar",
  estadisticas: "Estadísticas",
  publicacion: "Publicación masiva",
};

// The builder section where the assignment window of an evaluation is extended (evaluation-authoring route).
export function buildAssignmentSectionUrl(evaluationId: string): string {
  return `/evaluations/manage/${encodeURIComponent(evaluationId)}/edit?section=asignacion`;
}
