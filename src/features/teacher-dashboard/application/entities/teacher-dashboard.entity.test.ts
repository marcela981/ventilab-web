/*
* Funcionalidad: Teacher dashboard entity tests
* Descripción: Pure rules of the teacher dashboard: the risk highlight (only a published evaluation with passed === false, never a threshold invented on the client), row filter by name or email, sort by an API value with missing values last, sort toggling, distinct evaluation options, group reservation and student attempt selection, the progress tree nesting in curriculum order, the per-student module series, the timeline windows (default, previous, date inputs with their errors) and the error messages (403 no access, Retry-After). v1.1 (O3 review): latest published attempt per evaluation for the risk rule, modules without a level kept in a last bucket. v1.2 (review): attempts ordered by attemptNumber first (publishedAt only as tiebreak), so attempt 1 re-published after a passed attempt 2 is not at risk. v1.3 (closure B2): the client risk rule and its tests are gone (the API flags the row); the failed evaluation titles come from the API failedEvaluationIds; the group calendar selection keeps SCHEDULED rows only (the API filters by group); the group module series from the API moduleSummary; the student-attempt and timeline-session selections are gone. Depends on vitest, the api-client errors and the teacher dashboard entities.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { buildProgressTree, toGroupModuleSeries, toModuleProgressSeries, UNTITLED } from "./curriculum-titles.entity";
import type { CurriculumTitles } from "./curriculum-titles.entity";
import { defaultWindow, previousWindow, windowFromDateInputs } from "./student-timeline.entity";
import { getTeacherDashboardErrorMessage, isForbiddenError, TEACHER_DASHBOARD_FALLBACK_MESSAGES } from "./teacher-dashboard-error-messages";
import {
  DEFAULT_SORT,
  failedEvaluationTitles,
  filterRows,
  listEvaluationOptions,
  selectScheduledReservations,
  sortRows,
  toggleSort,
} from "./teacher-dashboard.entity";
import type { StudentRow } from "./teacher-dashboard.entity";

const progress = (id: string | null, percentage: number) => ({ id, percentage, completedLessons: 1, totalLessons: 2, completed: false });

function row(userId: string, name: string | null, overrides: Partial<StudentRow> = {}): StudentRow {
  return {
    userId,
    name,
    email: `${userId}@ventylab.demo`,
    progress: { overall: progress(null, 50), sections: [], levels: [], modules: [] },
    averageGrade: null,
    evaluations: [],
    simulation: { sessionCount: 0, averageScore: null, averageTimeToStabilizeSeconds: null },
    aiUsage: [],
    ventilatorHours: 0,
    atRisk: false,
    riskReasons: [],
    failedEvaluationIds: [],
    lastActivityAt: null,
    ...overrides,
  };
}

const grade = (evaluationId: string, title: string, passed: boolean) => ({
  evaluationId,
  evaluationTitle: title,
  attemptNumber: 1,
  grade: passed ? 4 : 2,
  passed,
  publishedAt: "2026-10-10T00:00:00.000Z",
});

const TITLES: CurriculumTitles = {
  sections: new Map([["s1", { title: "Fundamentos", rank: 0 }]]),
  levels: new Map([["lv1", { title: "Nivel básico", rank: 0 }]]),
  modules: new Map([["m1", { title: "Fisiología", rank: 0 }], ["m2", { title: "Modos", rank: 1 }]]),
};

describe("failedEvaluationTitles", () => {
  it("names only the evaluations the API lists as failed, once each, in row order", () => {
    const retake = { ...grade("e2", "Quiz", false), attemptNumber: 2 };

    expect(failedEvaluationTitles({
      evaluations: [grade("e1", "Parcial", true), grade("e2", "Quiz", false), retake, grade("e3", "Taller", false)],
      failedEvaluationIds: ["e3", "e2"],
    })).toEqual(["Quiz", "Taller"]);
    expect(failedEvaluationTitles({ evaluations: [grade("e1", "Parcial", false)], failedEvaluationIds: [] })).toEqual([]);
  });
});

describe("students table rules", () => {
  const rows = [
    row("u1", "Ángela Ruiz", { averageGrade: 3.5, ventilatorHours: 2 }),
    row("u2", "bruno díaz", { averageGrade: null, ventilatorHours: 1 }),
    row("u3", null, { averageGrade: 4.8, ventilatorHours: 3 }),
  ];

  it("filters by name or email ignoring accents and case", () => {
    expect(filterRows(rows, "angela").map((item) => item.userId)).toEqual(["u1"]);
    expect(filterRows(rows, "U3@").map((item) => item.userId)).toEqual(["u3"]);
    expect(filterRows(rows, "  ")).toHaveLength(3);
  });

  it("sorts by an API value with missing values last", () => {
    expect(sortRows(rows, { key: "averageGrade", direction: "desc" }).map((item) => item.userId)).toEqual(["u3", "u1", "u2"]);
    expect(sortRows(rows, { key: "averageGrade", direction: "asc" }).map((item) => item.userId)).toEqual(["u1", "u3", "u2"]);
    expect(sortRows(rows, DEFAULT_SORT).map((item) => item.userId)).toEqual(["u1", "u2", "u3"]);
    expect(sortRows(rows, { key: "ventilatorHours", direction: "asc" }).map((item) => item.userId)).toEqual(["u2", "u1", "u3"]);
  });

  it("toggles the sort direction and starts numeric columns descending", () => {
    expect(toggleSort(DEFAULT_SORT, "progress")).toEqual({ key: "progress", direction: "desc" });
    expect(toggleSort({ key: "progress", direction: "desc" }, "progress")).toEqual({ key: "progress", direction: "asc" });
  });

  it("lists the distinct evaluations of the rows by title", () => {
    const withGrades = [row("u1", "A", { evaluations: [grade("e2", "Quiz", true), grade("e1", "Parcial", false)] }), row("u2", "B", { evaluations: [grade("e2", "Quiz", true)] })];

    expect(listEvaluationOptions(withGrades)).toEqual([{ id: "e1", title: "Parcial" }, { id: "e2", title: "Quiz" }]);
  });

  it("keeps the scheduled reservations of the group calendar, soonest first", () => {
    const reservation = (id: string, status: string, startsAt: string) => ({ id, groupId: "g1", status, startsAt, endsAt: startsAt, purpose: null });

    expect(selectScheduledReservations([
      reservation("r2", "SCHEDULED", "2026-10-19T00:00:00.000Z"),
      reservation("r1", "SCHEDULED", "2026-10-18T00:00:00.000Z"),
      reservation("r4", "CANCELLED", "2026-10-17T00:00:00.000Z"),
    ]).map((item) => item.id)).toEqual(["r1", "r2"]);
  });
});

describe("curriculum titles", () => {
  it("nests the progress summary in curriculum order with generic titles for unknown ids", () => {
    const values = { percentage: 50, completedLessons: 1, totalLessons: 2, completed: false };
    const tree = buildProgressTree({
      overall: values,
      sections: [{ sectionId: "s1", ...values }],
      levels: [{ levelId: "lv1", sectionId: "s1", ...values }, { levelId: "lv9", sectionId: null, ...values }],
      modules: [{ moduleId: "m2", levelId: "lv1", ...values }, { moduleId: "m1", levelId: "lv1", ...values, percentage: 100 }],
    }, TITLES);

    expect(tree.map((section) => section.title)).toEqual(["Fundamentos", UNTITLED.unsectioned]);
    expect(tree[0]?.levels[0]?.modules.map((module) => [module.title, module.percentage])).toEqual([["Fisiología", 100], ["Modos", 50]]);
    expect(tree[1]?.levels[0]?.title).toBe(UNTITLED.level);
  });

  it("keeps modules without a level in a last bucket", () => {
    const values = { percentage: 40, completedLessons: 1, totalLessons: 3, completed: false };
    const tree = buildProgressTree({
      overall: values,
      sections: [{ sectionId: "s1", ...values }],
      levels: [{ levelId: "lv1", sectionId: "s1", ...values }],
      modules: [{ moduleId: "m1", levelId: "lv1", ...values }, { moduleId: "m2", levelId: null, ...values }, { moduleId: "m9", levelId: "lv-gone", ...values }],
    }, TITLES);
    const bucket = tree[tree.length - 1];

    expect(bucket?.title).toBe(UNTITLED.unleveled);
    expect(bucket?.modules.map((module) => module.title)).toEqual(["Modos", UNTITLED.module]);
    expect(tree[0]?.levels[0]?.modules.map((module) => module.id)).toEqual(["m1"]);
  });

  it("lists one student's module percentages in curriculum order", () => {
    expect(toModuleProgressSeries([progress("m2", 20), progress(null, 5), progress("m1", 80)], TITLES))
      .toEqual([{ moduleId: "m1", title: "Fisiología", percentage: 80 }, { moduleId: "m2", title: "Modos", percentage: 20 }]);
  });

  it("lists the group's API module averages in curriculum order, preferring the API title", () => {
    const summary = (moduleId: string, moduleTitle: string | null, averageProgressPct: number) => ({ moduleId, moduleTitle, averageProgressPct, completedCount: 1, studentCount: 3 });

    expect(toGroupModuleSeries([summary("m2", null, 35.5), summary("m1", "Fisiología respiratoria", 70)], TITLES)).toEqual([
      { moduleId: "m1", title: "Fisiología respiratoria", percentage: 70 },
      { moduleId: "m2", title: "Modos", percentage: 35.5 },
    ]);
  });
});

describe("timeline windows", () => {
  it("defaults to the last 30 days and moves back by the same length", () => {
    const window = defaultWindow(new Date("2026-10-16T12:00:00.000Z"));

    expect(window).toEqual({ from: "2026-09-16T12:00:00.000Z", to: "2026-10-16T12:00:00.000Z" });
    expect(previousWindow(window)).toEqual({ from: "2026-08-17T12:00:00.000Z", to: "2026-09-16T12:00:00.000Z" });
  });

  it("turns Bogota calendar days into a window and rejects bad ranges", () => {
    expect(windowFromDateInputs("2026-10-01", "2026-10-01")).toEqual({ from: "2026-10-01T05:00:00.000Z", to: "2026-10-02T05:00:00.000Z" });
    expect(windowFromDateInputs("2026-10-05", "2026-10-01")).toBe("order");
    expect(windowFromDateInputs("2025-01-01", "2026-10-01")).toBe("tooLong");
    expect(windowFromDateInputs("", "2026-10-01")).toBe("invalid");
  });

});

describe("teacher dashboard error messages", () => {
  const error = (status: number, code = "x", retryAfter?: number) => new ApiError({ code, message: code, status, retryAfter });

  it("maps the out of scope analytics and any 403 to the no-access message", () => {
    expect(getTeacherDashboardErrorMessage(error(403, "analytics.out_of_scope"))).toBe("No tienes acceso a este grupo.");
    expect(getTeacherDashboardErrorMessage(error(403))).toBe(TEACHER_DASHBOARD_FALLBACK_MESSAGES.forbidden);
    expect(isForbiddenError(error(403))).toBe(true);
    expect(isForbiddenError(error(500))).toBe(false);
    expect(isForbiddenError(null)).toBe(false);
  });

  it("tells how long to wait on 429 and falls back by status", () => {
    expect(getTeacherDashboardErrorMessage(error(429, "rate", 30))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 30 segundos.");
    expect(getTeacherDashboardErrorMessage(error(422, "analytics.invalid_range"))).toContain("366 días");
    expect(getTeacherDashboardErrorMessage(error(503))).toBe(TEACHER_DASHBOARD_FALLBACK_MESSAGES.server);
  });
});
