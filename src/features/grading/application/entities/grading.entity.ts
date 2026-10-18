/*
* Funcionalidad: Grading queue entities
* Descripción: View models and pure rules of the grading queue: a queue item (student, evaluation, attempt number, submission date, auto score), a queue page with its pagination, the filter choices (evaluation, group), the query sent to `GET /api/evaluation-grading/queue` (0-based table page to 1-based API page), the evaluation filter options (READY evaluations merged with the evaluations present in the loaded queue page, sorted by title) and the pending count read from the envelope pagination. Depends on nothing at runtime. v1.1 (G1 review W1): no sort order; the backend ignores sortOrder and always lists the oldest submissions first (evaluation-grading-prisma.repository orderBy submittedAt asc), so the toggle was a no-op and was removed (reported API gap). v1.2 (closure B2): a student filter (`studentId`, options from the chosen group's students merged with the students of the loaded page); the pending count reads the count endpoint, so toPendingCount (envelope total of a one-row page) is gone.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type GradingEvaluationType = "EXAM" | "QUIZ" | "WORKSHOP";

export type GradingQueueItem = {
  attemptId: string
  attemptNumber: number
  evaluationId: string
  evaluationTitle: string
  evaluationType: GradingEvaluationType
  studentId: string
  studentName: string | null
  studentEmail: string
  submittedAt: string | null
  score: number | null
  maxScore: number | null
};

export type GradingQueuePage = {
  items: GradingQueueItem[]
  total: number
  page: number
  pages: number
};

export type GradingQueueFilters = {
  evaluationId: string
  groupId: string
  studentId: string
};

export const ALL_OPTION = "";

export const DEFAULT_GRADING_FILTERS: GradingQueueFilters = {
  evaluationId: ALL_OPTION,
  groupId: ALL_OPTION,
  studentId: ALL_OPTION,
};

export type GradingQueueQuery = {
  evaluationId?: string
  // No sortOrder: the backend ignores it and always lists the oldest submissions first (API gap).
  groupId?: string
  studentId?: string
  page: number
  limit: number
};

export type FilterOption = {
  id: string
  label: string
};

// pageIndex is 0-based (table pagination); the API page is 1-based.
export function toGradingQueueQuery(filters: GradingQueueFilters, pageIndex: number, limit: number): GradingQueueQuery {
  return {
    ...(filters.evaluationId ? { evaluationId: filters.evaluationId } : {}),
    ...(filters.groupId ? { groupId: filters.groupId } : {}),
    ...(filters.studentId ? { studentId: filters.studentId } : {}),
    page: pageIndex + 1,
    limit,
  };
}

function byLabel(a: FilterOption, b: FilterOption): number {
  return a.label.localeCompare(b.label, "es");
}

// Attempts of archived evaluations can still wait for review, so the loaded queue page adds its evaluations.
export function mergeEvaluationOptions(
  readyEvaluations: readonly FilterOption[],
  queueItems: readonly GradingQueueItem[],
): FilterOption[] {
  const options = new Map<string, FilterOption>();

  for (const option of readyEvaluations) {
    options.set(option.id, option);
  }

  for (const item of queueItems) {
    if (!options.has(item.evaluationId)) {
      options.set(item.evaluationId, { id: item.evaluationId, label: item.evaluationTitle });
    }
  }

  return [...options.values()].sort(byLabel);
}

export function sortOptions(options: readonly FilterOption[]): FilterOption[] {
  return [...options].sort(byLabel);
}

export function studentLabel(student: { name: string | null, email: string }): string {
  return student.name?.trim() || student.email;
}

// Students of the chosen group, plus the students of the loaded page (they may belong to another group or none chosen).
export function mergeStudentOptions(
  groupStudents: readonly FilterOption[],
  queueItems: readonly GradingQueueItem[],
): FilterOption[] {
  const options = new Map<string, FilterOption>();

  for (const option of groupStudents) {
    options.set(option.id, option);
  }

  for (const item of queueItems) {
    if (!options.has(item.studentId)) {
      options.set(item.studentId, { id: item.studentId, label: studentLabel({ name: item.studentName, email: item.studentEmail }) });
    }
  }

  return [...options.values()].sort(byLabel);
}
