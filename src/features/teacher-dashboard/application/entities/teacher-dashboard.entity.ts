/*
* Funcionalidad: Teacher dashboard entities
* Descripción: View models of the teacher dashboard (group option, students table row with the API progress, published grades, simulation, AI usage per use case and ventilator hours; evaluation stats; dashboard cards: active assignments, upcoming group reservations, pending attempts) and the pure row rules allowed on the client: text filter by name or email, sort by one API value (missing values last), the distinct evaluations present in the rows (selector options), the scheduled reservations of one group and the pending attempts of one student (selection only). Nothing here computes a grade, average or statistic: every number shown comes from the API. Depends on nothing at runtime. v1.1 (closure B2): the row carries the API risk (atRisk, riskReasons, failedEvaluationIds, lastActivityAt), the dashboard its passingGrade, riskThresholds and per-module summary, the group option its relation (MANAGED/SUPERVISED); student grade and simulation session view models; the calendar is filtered by group on the server (only the SCHEDULED selection stays) and the queue by student (selectStudentAttempts removed); failedEvaluationTitles names the API failed evaluations.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/** How the caller follows a group (`GroupDTO.relation`): created/leads it or supervises it; null when the API does not say. */
export type GroupRelation = "MANAGED" | "SUPERVISED";

export type GroupOption = {
  id: string
  name: string
  membersCount: number
  relation: GroupRelation | null
};

/** Reasons the API flags a student at risk (`StudentDashboardRowDTO.riskReasons`). */
export type RiskReason = "FAILED_EVALUATIONS" | "LOW_PROGRESS" | "INACTIVE";

/** Risk thresholds of the platform settings, as sent with the group dashboard (0 turns a rule off). */
export type RiskThresholds = {
  maxFailedEvaluations: number
  minProgressPct: number
  inactivityDays: number
};

/** Per-module aggregate of the group, computed by the API (`GroupDashboardDTO.moduleSummary`). */
export type ModuleSummary = {
  moduleId: string
  moduleTitle: string | null
  averageProgressPct: number
  completedCount: number
  studentCount: number
};

export type ProgressItem = {
  id: string | null
  percentage: number
  completedLessons: number
  totalLessons: number
  completed: boolean
};

export type StudentProgress = {
  overall: ProgressItem
  sections: ProgressItem[]
  levels: ProgressItem[]
  modules: ProgressItem[]
};

export type EvaluationGrade = {
  evaluationId: string
  evaluationTitle: string
  attemptNumber: number
  grade: number
  passed: boolean
  publishedAt: string
};

export type AiUsage = {
  useCase: string
  calls: number
  ratings: number
  helpfulPercentage: number | null
};

export type SimulationSummary = {
  sessionCount: number
  averageScore: number | null
  averageTimeToStabilizeSeconds: number | null
};

export type StudentRow = {
  userId: string
  name: string | null
  email: string
  progress: StudentProgress
  averageGrade: number | null
  evaluations: EvaluationGrade[]
  simulation: SimulationSummary
  aiUsage: AiUsage[]
  ventilatorHours: number
  atRisk: boolean
  riskReasons: RiskReason[]
  failedEvaluationIds: string[]
  lastActivityAt: string | null
};

export type GroupDashboard = {
  groupId: string
  groupName: string
  generatedAt: string
  passingGrade: number
  riskThresholds: RiskThresholds
  moduleSummary: ModuleSummary[]
  students: StudentRow[]
};

/** One published grade of a student (`GET /api/evaluation-grading/students/{userId}/grades`). */
export type StudentGrade = {
  attemptId: string
  attemptNumber: number
  evaluationId: string
  evaluationTitle: string
  moduleTitle: string | null
  grade: number
  passed: boolean
  publishedAt: string
};

/** One simulation session of a student (`GET /api/simulation/sessions/history?userId`). */
export type StudentSession = {
  id: string
  caseTitle: string | null
  mode: string
  status: string
  score: number | null
  startedAt: string
  endedAt: string | null
};

export type HistogramBin = {
  from: number
  to: number
  count: number
};

export type EvaluationStats = {
  evaluationId: string
  title: string
  passingGrade: number
  gradedCount: number
  histogram: HistogramBin[]
};

export type ActiveAssignment = {
  id: string
  evaluationId: string
  evaluationTitle: string
  startsAt: string
  endsAt: string | null
  pendingReview: number
};

export type GroupReservation = {
  id: string
  groupId: string | null
  startsAt: string
  endsAt: string
  status: string
  purpose: string | null
};

export type PendingAttempt = {
  attemptId: string
  attemptNumber: number
  evaluationId: string
  evaluationTitle: string
  studentId: string
  submittedAt: string | null
};

export type SortKey = "name" | "progress" | "averageGrade" | "simulationSessions" | "simulationScore" | "stabilizeTime" | "ventilatorHours";

export type SortDirection = "asc" | "desc";

export type SortState = {
  key: SortKey
  direction: SortDirection
};

export type EvaluationOption = {
  id: string
  title: string
};

export const DEFAULT_SORT: SortState = { key: "name", direction: "asc" };

/** Reservation status of a slot that is still going to happen (ventilator-lab: SCHEDULED). */
export const SCHEDULED_RESERVATION_STATUS = "SCHEDULED";

const collator = new Intl.Collator("es-CO", { sensitivity: "base" });

export function displayName(row: Pick<StudentRow, "name" | "email">): string {
  return row.name?.trim() ? row.name : row.email;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Row selection only: keeps the students whose name or email contains the text (accents and case ignored). */
export function filterRows(rows: readonly StudentRow[], text: string): StudentRow[] {
  const needle = normalize(text);

  if (!needle) {
    return [...rows];
  }

  return rows.filter((row) => normalize(row.name ?? "").includes(needle) || normalize(row.email).includes(needle));
}

function sortValue(row: StudentRow, key: Exclude<SortKey, "name">): number | null {
  switch (key) {
    case "progress":
      return row.progress.overall.percentage;
    case "averageGrade":
      return row.averageGrade;
    case "simulationSessions":
      return row.simulation.sessionCount;
    case "simulationScore":
      return row.simulation.averageScore;
    case "stabilizeTime":
      return row.simulation.averageTimeToStabilizeSeconds;
    case "ventilatorHours":
      return row.ventilatorHours;
  }
}

/** Orders the rows by one API value; rows without a value always go last, ties keep the name order. */
export function sortRows(rows: readonly StudentRow[], sort: SortState): StudentRow[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  const byName = (a: StudentRow, b: StudentRow) => collator.compare(displayName(a), displayName(b));

  return [...rows].sort((a, b) => {
    if (sort.key === "name") {
      return sign * byName(a, b);
    }

    const left = sortValue(a, sort.key);
    const right = sortValue(b, sort.key);

    if (left === null || right === null) {
      return left === right ? byName(a, b) : left === null ? 1 : -1;
    }

    return left === right ? byName(a, b) : sign * (left < right ? -1 : 1);
  });
}

export function toggleSort(current: SortState, key: SortKey): SortState {
  if (current.key !== key) {
    return { key, direction: key === "name" ? "asc" : "desc" };
  }

  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}

/** Distinct evaluations with a published grade in the rows, by title: the options of the grade distribution selector. */
export function listEvaluationOptions(rows: readonly StudentRow[]): EvaluationOption[] {
  const byId = new Map<string, string>();

  for (const row of rows) {
    for (const grade of row.evaluations) {
      if (!byId.has(grade.evaluationId)) {
        byId.set(grade.evaluationId, grade.evaluationTitle);
      }
    }
  }

  return [...byId.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((a, b) => collator.compare(a.title, b.title));
}

/** Upcoming reservations among the group calendar rows (the API filters by group; selection by status only), soonest first. */
export function selectScheduledReservations(reservations: readonly GroupReservation[]): GroupReservation[] {
  return reservations
    .filter((reservation) => reservation.status === SCHEDULED_RESERVATION_STATUS)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Titles of the evaluations the API lists as failed for the row (`failedEvaluationIds`), in row order (selection only). */
export function failedEvaluationTitles(row: Pick<StudentRow, "evaluations" | "failedEvaluationIds">): string[] {
  const failed = new Set(row.failedEvaluationIds);
  const titles = new Map<string, string>();

  for (const grade of row.evaluations) {
    if (failed.has(grade.evaluationId) && !titles.has(grade.evaluationId)) {
      titles.set(grade.evaluationId, grade.evaluationTitle);
    }
  }

  return [...titles.values()];
}
