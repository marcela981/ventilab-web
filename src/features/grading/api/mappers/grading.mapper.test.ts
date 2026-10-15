/*
* Funcionalidad: Grading mapper and entity tests
* Descripción: Verifies the mapping of grading queue items and pages (pagination with row-count fallback, blank student names), the evaluation and student group filter options, the queue query built from the filters, the merge of READY evaluations with the evaluations of the loaded queue page, the pending count read from the pagination and the Spanish grading error messages. Depends on vitest, the grading mappers, entities, error messages and test helpers. v1.1 (G1 review W1): the queue query carries no sortOrder.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { evaluationSummaryDto, groupDto, queueItemDto } from "../../application/pages/grading-test-helpers";
import {
  DEFAULT_GRADING_FILTERS,
  mergeEvaluationOptions,
  toGradingQueueQuery,
  toPendingCount,
} from "../../application/entities/grading.entity";
import { GRADING_ERROR_MESSAGES, GRADING_FALLBACK_MESSAGES, getGradingErrorMessage } from "../../application/entities/grading-error-messages";
import { toEvaluationOptions, toGradingQueueItem, toGradingQueuePage, toGroupOptions } from "./grading.mapper";

describe("toGradingQueueItem", () => {
  it("flattens the student and keeps the attempt, evaluation and score", () => {
    expect(toGradingQueueItem(queueItemDto("a1", { attemptNumber: 2, score: null, maxScore: null }))).toEqual({
      attemptId: "a1",
      attemptNumber: 2,
      evaluationId: "ev-1",
      evaluationTitle: "Parcial de ventilación",
      evaluationType: "EXAM",
      studentId: "st-a1",
      studentName: "Ana Gómez",
      studentEmail: "ana@ventylab.demo",
      submittedAt: "2026-10-11T11:00:00.000Z",
      score: null,
      maxScore: null,
    });
  });

  it("turns a blank student name into null", () => {
    const dto = queueItemDto("a1", { student: { id: "s", name: "  ", email: "x@ventylab.demo" } });

    expect(toGradingQueueItem(dto).studentName).toBeNull();
  });
});

describe("toGradingQueuePage", () => {
  it("reads total, page and pages from the pagination", () => {
    const page = toGradingQueuePage([queueItemDto("a1")], { total: 31, pages: 4, page: 2, limit: 10, next: null, previous: null });

    expect(page).toMatchObject({ total: 31, pages: 4, page: 2 });
    expect(page.items).toHaveLength(1);
  });

  it("falls back to the row count without pagination", () => {
    expect(toGradingQueuePage([queueItemDto("a1"), queueItemDto("a2")], null)).toMatchObject({ total: 2, page: 1, pages: 1 });
  });
});

describe("filter options", () => {
  it("sorts evaluations by title", () => {
    expect(toEvaluationOptions([evaluationSummaryDto("e2", "Taller VM"), evaluationSummaryDto("e1", "Examen final")])).toEqual([
      { id: "e1", label: "Examen final" },
      { id: "e2", label: "Taller VM" },
    ]);
  });

  it("keeps only active student groups, sorted by name", () => {
    const options = toGroupOptions([
      groupDto("g2", "Grupo B"),
      groupDto("g1", "Grupo A"),
      groupDto("g3", "Docentes", { type: "TEACHER" }),
      groupDto("g4", "Inactivo", { isActive: false }),
    ]);

    expect(options).toEqual([{ id: "g1", label: "Grupo A" }, { id: "g2", label: "Grupo B" }]);
  });

  it("adds the evaluations of the loaded queue page that are not READY", () => {
    const items = [toGradingQueueItem(queueItemDto("a1", { evaluationId: "old", evaluationTitle: "Archivada" }))];

    expect(mergeEvaluationOptions([{ id: "ev-1", label: "Parcial" }], items)).toEqual([
      { id: "old", label: "Archivada" },
      { id: "ev-1", label: "Parcial" },
    ]);
  });
});

describe("toGradingQueueQuery", () => {
  it("sends no filters and no sort order by default (the backend ignores sortOrder)", () => {
    expect(toGradingQueueQuery(DEFAULT_GRADING_FILTERS, 0, 10)).toEqual({ page: 1, limit: 10 });
  });

  it("sends the chosen evaluation, group and 1-based page", () => {
    expect(toGradingQueueQuery({ evaluationId: "e1", groupId: "g1" }, 2, 25)).toEqual({
      evaluationId: "e1",
      groupId: "g1",
      page: 3,
      limit: 25,
    });
  });
});

describe("toPendingCount", () => {
  it("reads the total from the pagination, not the one-row page", () => {
    expect(toPendingCount({ total: 7 }, 1)).toBe(7);
    expect(toPendingCount(null, 1)).toBe(1);
    expect(toPendingCount({ total: 0 }, 0)).toBe(0);
  });
});

describe("getGradingErrorMessage", () => {
  it("maps known backend codes and falls back by status", () => {
    expect(getGradingErrorMessage(new ApiError({ status: 403, code: "evaluation.grading_forbidden", message: "x" })))
      .toBe(GRADING_ERROR_MESSAGES["evaluation.grading_forbidden"]);
    expect(getGradingErrorMessage(new ApiError({ status: 404, code: "other", message: "x" })))
      .toBe(GRADING_FALLBACK_MESSAGES.notFound);
    expect(getGradingErrorMessage(new ApiError({ status: 503, code: "other", message: "x" })))
      .toBe(GRADING_FALLBACK_MESSAGES.server);
  });
});
