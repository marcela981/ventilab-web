/*
* Funcionalidad: Teacher dashboard mapper tests
* Descripción: DTO → view model mappers of the teacher dashboard: STUDENT groups only, dashboard rows copied as the API sends them (no derived value), evaluation stats histogram, active assignments with their pending reviews, calendar rows (only detail rows carry a group), grading queue rows, student header, learning summary, timeline and the curriculum tree reduced to titles in curriculum order. Depends on vitest, the teacher dashboard mapper and test helpers. v1.1 (closure B1): the dashboard fixture comes from dashboardDto (new contract fields). v1.2 (closure B2): group relation, API risk fields, thresholds and module summary copied; student grades and sessions mapped. v1.3 (S8): fixtures carry the regenerated block 1 contract fields (session patient null).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  assignmentDto,
  dashboardDto,
  groupDto,
  queueItemDto,
  reservationDto,
  rowDto,
  statsDto,
  studentDto,
  summaryDto,
  timelineEntryDto,
  treeDto,
} from "../../application/pages/teacher-dashboard-test-helpers";
import {
  toActiveAssignments,
  toCurriculumTitles,
  toEvaluationStats,
  toGroupDashboard,
  toGroupOptions,
  toGroupReservations,
  toLearningSummary,
  toPendingAttempts,
  toStudentGrades,
  toStudentHeader,
  toStudentSessions,
  toStudentTimeline,
} from "./teacher-dashboard.mapper";

describe("teacher dashboard mappers", () => {
  it("keeps only STUDENT groups", () => {
    expect(toGroupOptions([groupDto("g1", "Grupo A"), groupDto("t1", "Docentes", { type: "TEACHER" })]))
      .toEqual([{ id: "g1", name: "Grupo A", membersCount: 2, relation: null }]);
    expect(toGroupOptions([groupDto("g2", "Grupo B", { relation: "SUPERVISED" })])[0]?.relation).toBe("SUPERVISED");
  });

  it("copies the API risk, thresholds and module summary of the dashboard", () => {
    const dashboard = toGroupDashboard(dashboardDto([
      rowDto("u1", "Ana", { atRisk: true, riskReasons: ["LOW_PROGRESS", "INACTIVE"], failedEvaluationIds: ["ev-1"], lastActivityAt: null }),
    ], {
      passingGrade: 3.5,
      riskThresholds: { maxFailedEvaluations: 1, minProgressPct: 40, inactivityDays: 14 },
      moduleSummary: [{ moduleId: "m1", moduleTitle: "Fisiología", averageProgressPct: 62.5, completedCount: 1, studentCount: 4 }],
    }));

    expect(dashboard.passingGrade).toBe(3.5);
    expect(dashboard.riskThresholds).toEqual({ maxFailedEvaluations: 1, minProgressPct: 40, inactivityDays: 14 });
    expect(dashboard.moduleSummary).toEqual([{ moduleId: "m1", moduleTitle: "Fisiología", averageProgressPct: 62.5, completedCount: 1, studentCount: 4 }]);
    expect(dashboard.students[0]).toMatchObject({ atRisk: true, riskReasons: ["LOW_PROGRESS", "INACTIVE"], failedEvaluationIds: ["ev-1"], lastActivityAt: null });
  });

  it("maps a student's published grades and simulation sessions", () => {
    expect(toStudentGrades([{
      attemptId: "at-1", attemptNumber: 2, evaluationId: "ev-1", evaluationTitle: "Parcial", evaluationType: "EXAM", grade: 3.8,
      legacy: false, maxScore: 10, moduleId: "m1", moduleTitle: "Fisiología", passed: true, publishedAt: "2026-10-10T15:00:00.000Z", score: 7.6,
    }])).toEqual([{
      attemptId: "at-1", attemptNumber: 2, evaluationId: "ev-1", evaluationTitle: "Parcial", moduleTitle: "Fisiología", grade: 3.8, passed: true, publishedAt: "2026-10-10T15:00:00.000Z",
    }]);
    expect(toStudentSessions([{
      attemptId: null, caseId: "c1", caseTitle: "SDRA", endedAt: null, engineVersion: "1", id: "ss-1", lastEventAt: "x", lastSimTimeMs: 0,
      mode: "FREE", patient: null, questionId: null, score: null, startedAt: "2026-10-14T15:00:00.000Z", status: "ACTIVE", timeMultiplier: 1, userId: "u1",
    }])).toEqual([{ id: "ss-1", caseTitle: "SDRA", mode: "FREE", status: "ACTIVE", score: null, startedAt: "2026-10-14T15:00:00.000Z", endedAt: null }]);
  });

  it("copies the dashboard rows as the API sends them", () => {
    const dashboard = toGroupDashboard(dashboardDto([rowDto("u1", "Ana")]));
    const row = dashboard.students[0];

    expect(dashboard.groupName).toBe("Grupo A");
    expect(row?.averageGrade).toBe(4.1);
    expect(row?.progress.overall.percentage).toBe(40);
    expect(row?.progress.modules.map((item) => [item.id, item.percentage])).toEqual([["m1", 80], ["m2", 20]]);
    expect(row?.simulation).toEqual({ sessionCount: 3, averageScore: 81.5, averageTimeToStabilizeSeconds: 42.3 });
    expect(row?.aiUsage).toEqual([{ useCase: "FREE_CHAT", calls: 7, ratings: 3, helpfulPercentage: 66.7 }]);
    expect(row?.evaluations[0]).toMatchObject({ evaluationId: "ev-1", grade: 4.1, passed: true });
    expect(row?.ventilatorHours).toBe(1.5);
  });

  it("maps the evaluation stats histogram and passing grade", () => {
    expect(toEvaluationStats(statsDto("ev-1"))).toEqual({
      evaluationId: "ev-1",
      title: "Evaluación ev-1",
      passingGrade: 3,
      gradedCount: 5,
      histogram: [{ from: 2.5, to: 3, count: 1 }, { from: 3, to: 3.5, count: 2 }, { from: 4, to: 4.5, count: 2 }],
    });
  });

  it("maps assignments, calendar rows and queue rows", () => {
    expect(toActiveAssignments([assignmentDto("as-1", "Quiz")])[0]).toMatchObject({ evaluationId: "ev-as-1", evaluationTitle: "Quiz", pendingReview: 3 });
    expect(toGroupReservations([
      reservationDto("r1", "g1", "A"),
      { id: "r2", startsAt: "2026-10-18T14:00:00.000Z", endsAt: "2026-10-18T15:00:00.000Z", label: "Ocupado", labelKey: "busy", status: "SCHEDULED", visibility: "PRIVATE" },
    ])).toEqual([{ id: "r1", groupId: "g1", startsAt: "2026-10-18T14:00:00.000Z", endsAt: "2026-10-18T15:00:00.000Z", status: "SCHEDULED", purpose: "A" }]);
    expect(toPendingAttempts([queueItemDto("at-1", "u1", "Taller")])[0]).toMatchObject({ attemptId: "at-1", studentId: "u1", evaluationTitle: "Taller" });
  });

  it("maps the student header, learning summary and timeline", () => {
    expect(toStudentHeader(studentDto("u1", "Ana"))).toEqual({ id: "u1", name: "Ana", email: "u1@ventylab.demo", lastAccess: "2026-10-15T20:00:00.000Z" });

    const summary = toLearningSummary(summaryDto());

    expect(summary.overall).toEqual({ percentage: 40, completedLessons: 4, totalLessons: 10, completed: false });
    expect(summary.modules.map((item) => item.moduleId)).toEqual(["m2", "m1"]);

    const timeline = toStudentTimeline({ userId: "u1", from: "a", to: "b", truncated: true, entries: [timelineEntryDto("SIMULATION_SESSION", "ss-1", { value: 90 })] });

    expect(timeline.truncated).toBe(true);
    expect(timeline.entries[0]).toMatchObject({ kind: "SIMULATION_SESSION", referenceId: "ss-1", value: 90 });
  });

  it("reduces the curriculum tree to titles in curriculum order", () => {
    const titles = toCurriculumTitles(treeDto());

    expect(titles.sections.get("s1")).toEqual({ title: "Fundamentos", rank: 0 });
    expect(titles.levels.get("lv1")).toEqual({ title: "Nivel básico", rank: 0 });
    expect(titles.modules.get("m2")).toEqual({ title: "Modos ventilatorios", rank: 1 });
  });
});
