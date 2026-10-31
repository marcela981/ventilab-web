/*
* Funcionalidad: Evaluation attempts mapper and entity tests
* Descripción: Verifies the mapping of the attempts list of the unified grading screen (student flattened, blank names to null, counts per status with missing values as 0, pagination with row-count fallback) and its pure rules: the status filter parsed from and written to the URL, the query sent to `GET /api/evaluation-grading/attempts`, which rows may be reset and the "Total · Entregadas · Calificadas" summary. Depends on vitest, the evaluation attempts mapper and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  canResetAttempt,
  formatStatusFilter,
  parseStatusFilter,
  summarizeCounts,
  toEvaluationAttemptsQuery,
} from "../../application/entities/evaluation-attempts.entity";
import type { GradingAttemptListItemDTO } from "../dtos/grading.dto";
import { toAttemptStatusCounts, toEvaluationAttemptsPage } from "./evaluation-attempts.mapper";

function itemDto(attemptId: string, overrides: Partial<GradingAttemptListItemDTO> = {}): GradingAttemptListItemDTO {
  return {
    attemptId,
    evaluationId: "ev-1",
    assignmentId: "as-1",
    groupId: "g-1",
    attemptNumber: 1,
    student: { id: `st-${attemptId}`, name: "Ana Gómez", email: "ana@ventylab.demo" },
    status: "SUBMITTED",
    startedAt: "2026-10-11T10:00:00.000Z",
    submittedAt: "2026-10-11T10:30:00.000Z",
    score: 3,
    maxScore: 5,
    grade: null,
    gradePublishedAt: null,
    isLate: false,
    ...overrides,
  };
}

const counts = { IN_PROGRESS: 1, SUBMITTED: 2, PENDING_REVIEW: 3, GRADED: 4, total: 10 };

describe("toEvaluationAttemptsPage", () => {
  it("flattens the student, keeps the row fields and the counts", () => {
    const page = toEvaluationAttemptsPage(
      { items: [itemDto("a1", { student: { id: "s1", name: "  ", email: "x@ventylab.demo" }, isLate: true })], counts },
      { page: 2, limit: 10, total: 11, pages: 2 } as never,
    );

    expect(page.items[0]).toMatchObject({ attemptId: "a1", studentId: "s1", studentName: null, studentEmail: "x@ventylab.demo", isLate: true, status: "SUBMITTED" });
    expect(page.counts).toEqual(counts);
    expect(page).toMatchObject({ total: 11, page: 2, pages: 2 });
  });

  it("falls back to the row count without pagination and reads missing counts as 0", () => {
    const page = toEvaluationAttemptsPage({ items: [itemDto("a1"), itemDto("a2")], counts }, null);

    expect(page).toMatchObject({ total: 2, page: 1, pages: 1 });
    expect(toAttemptStatusCounts({ GRADED: 2 })).toEqual({ IN_PROGRESS: 0, SUBMITTED: 0, PENDING_REVIEW: 0, GRADED: 2, total: 0 });
    expect(toAttemptStatusCounts(null).total).toBe(0);
  });
});

describe("evaluation attempts rules", () => {
  it("parses the status filter in canonical order and drops unknown values", () => {
    expect(parseStatusFilter("GRADED,foo,SUBMITTED,GRADED")).toEqual(["SUBMITTED", "GRADED"]);
    expect(parseStatusFilter(["PENDING_REVIEW", "IN_PROGRESS"])).toEqual(["IN_PROGRESS", "PENDING_REVIEW"]);
    expect(parseStatusFilter(undefined)).toEqual([]);
    expect(formatStatusFilter(["GRADED", "SUBMITTED"])).toBe("SUBMITTED,GRADED");
  });

  it("builds the API query with optional group and status", () => {
    expect(toEvaluationAttemptsQuery("ev-1", { groupId: "", statuses: [] }, 0, 25)).toEqual({ evaluationId: "ev-1", page: 1, limit: 25 });
    expect(toEvaluationAttemptsQuery("ev-1", { groupId: "g-1", statuses: ["GRADED", "SUBMITTED"] }, 2, 10))
      .toEqual({ evaluationId: "ev-1", groupId: "g-1", status: "SUBMITTED,GRADED", page: 3, limit: 10 });
  });

  it("offers the reset only for submitted, pending-review and graded attempts", () => {
    expect(canResetAttempt({ status: "IN_PROGRESS" })).toBe(false);
    expect(canResetAttempt({ status: "SUBMITTED" })).toBe(true);
    expect(canResetAttempt({ status: "PENDING_REVIEW" })).toBe(true);
    expect(canResetAttempt({ status: "GRADED" })).toBe(true);
  });

  it("summarizes the counts as total, submitted and graded", () => {
    expect(summarizeCounts(counts)).toEqual({ total: 10, submitted: 9, graded: 4 });
  });
});
