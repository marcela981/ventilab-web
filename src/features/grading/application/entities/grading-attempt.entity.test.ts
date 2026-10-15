/*
* Funcionalidad: Grading attempt entities tests
* Descripción: Verifies the pure grading rules: score parsing (dot or comma, up to two decimals), the draft validation (required score, range [0, points], a comment when the answer already has an automatic or manual score, comment length), the dirty check against the counting score and the current comment, the request body, the pass state from `passed` or the API passing grade, the publish rule (GRADED, unpublished, not legacy), the pending feedback check and the spaced polling delays. Depends on vitest and the grading attempt entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  canPublish,
  GRADE_DRAFT_ERRORS,
  hasPendingFeedback,
  initialDraft,
  isDraftDirty,
  MAX_TEACHER_COMMENT_LENGTH,
  nextFeedbackPollDelay,
  parseScore,
  passState,
  toGradeAnswerBody,
  validateDraft,
} from "./grading-attempt.entity";
import type { FeedbackItem, GradingItem } from "./grading-attempt.entity";

function item(overrides: Partial<GradingItem> = {}): GradingItem {
  return {
    question: {
      id: "q1",
      scenarioId: null,
      position: 1,
      type: "OPEN_TEXT",
      prompt: null,
      media: [],
      points: 2,
      clinicalCaseId: null,
      options: [],
      answer: null,
    },
    answer: { selectedOptionIds: [], textAnswer: "Subir PEEP", simulationSessionId: null },
    correctOptionIds: [],
    explanation: null,
    autoScore: null,
    manualScore: null,
    earnedScore: null,
    pending: true,
    teacherComment: null,
    practicalScore: null,
    ...overrides,
  };
}

describe("parseScore", () => {
  it("accepts integers and up to two decimals with dot or comma", () => {
    expect(parseScore("2")).toBe(2);
    expect(parseScore("1,5")).toBe(1.5);
    expect(parseScore(" 0.25 ")).toBe(0.25);
  });

  it("rejects anything else", () => {
    expect(parseScore("")).toBeNull();
    expect(parseScore("1.234")).toBeNull();
    expect(parseScore("-1")).toBeNull();
    expect(parseScore("abc")).toBeNull();
  });
});

describe("validateDraft", () => {
  it("requires a score within [0, points]", () => {
    expect(validateDraft(item(), { score: "", comment: "" })).toEqual({ score: GRADE_DRAFT_ERRORS.scoreRequired });
    expect(validateDraft(item(), { score: "2,5", comment: "" })).toEqual({ score: GRADE_DRAFT_ERRORS.scoreRange(2) });
    expect(validateDraft(item(), { score: "1.999", comment: "" })).toEqual({ score: GRADE_DRAFT_ERRORS.scoreNumber });
    expect(validateDraft(item(), { score: "0", comment: "" })).toEqual({});
    expect(validateDraft(item(), { score: "2", comment: "" })).toEqual({});
  });

  it("requires a comment when an automatic or manual score already exists", () => {
    expect(validateDraft(item({ autoScore: 1 }), { score: "1", comment: " " })).toEqual({ comment: GRADE_DRAFT_ERRORS.commentRequired });
    expect(validateDraft(item({ manualScore: 0.5 }), { score: "1", comment: "" })).toEqual({ comment: GRADE_DRAFT_ERRORS.commentRequired });
    expect(validateDraft(item({ autoScore: 1 }), { score: "0", comment: "Falta la presión meseta" })).toEqual({});
  });

  it("limits the comment length", () => {
    expect(validateDraft(item(), { score: "1", comment: "x".repeat(MAX_TEACHER_COMMENT_LENGTH + 1) })).toEqual({
      comment: GRADE_DRAFT_ERRORS.commentTooLong,
    });
  });
});

describe("drafts", () => {
  it("starts from the counting score and the current comment", () => {
    expect(initialDraft(item({ autoScore: 1, manualScore: 1.5, teacherComment: "Bien" }))).toEqual({ score: "1,5", comment: "Bien" });
    expect(initialDraft(item())).toEqual({ score: "", comment: "" });
  });

  it("is dirty only when the score value or the comment changes", () => {
    const graded = item({ autoScore: 1 });

    expect(isDraftDirty(graded, { score: "1", comment: "" })).toBe(false);
    expect(isDraftDirty(graded, { score: "1,00", comment: "" })).toBe(false);
    expect(isDraftDirty(graded, { score: "0,5", comment: "" })).toBe(true);
    expect(isDraftDirty(graded, { score: "1", comment: "Revisar" })).toBe(true);
    expect(isDraftDirty(item(), { score: "", comment: "" })).toBe(false);
    expect(isDraftDirty(item(), { score: "x", comment: "" })).toBe(true);
  });

  it("builds the body only for a valid draft", () => {
    expect(toGradeAnswerBody(item(), { score: "1,5", comment: "" })).toEqual({ manualScore: 1.5 });
    expect(toGradeAnswerBody(item({ autoScore: 2 }), { score: "1", comment: "  Incompleta " })).toEqual({ manualScore: 1, comment: "Incompleta" });
    expect(toGradeAnswerBody(item({ autoScore: 2 }), { score: "1", comment: "" })).toBeNull();
  });
});

describe("attempt rules", () => {
  it("takes pass/fail from the API flag, then from the API passing grade", () => {
    expect(passState({ grade: null, passed: null, passingGrade: 3 })).toBe("none");
    expect(passState({ grade: 2.5, passed: true, passingGrade: 3 })).toBe("passed");
    expect(passState({ grade: 3.5, passed: null, passingGrade: 4 })).toBe("failed");
    expect(passState({ grade: 3.5, passed: null, passingGrade: 3.5 })).toBe("passed");
  });

  it("publishes only a GRADED, unpublished, non-legacy attempt", () => {
    expect(canPublish({ status: "GRADED", publishedAt: null, legacy: false })).toBe(true);
    expect(canPublish({ status: "PENDING_REVIEW", publishedAt: null, legacy: false })).toBe(false);
    expect(canPublish({ status: "GRADED", publishedAt: "2026-10-12T00:00:00.000Z", legacy: false })).toBe(false);
    expect(canPublish({ status: "GRADED", publishedAt: null, legacy: true })).toBe(false);
  });
});

describe("feedback", () => {
  const feedbackItem = (status: FeedbackItem["status"]): FeedbackItem => ({
    id: "f1",
    questionId: null,
    status,
    source: null,
    content: "",
    provider: null,
    model: null,
    updatedAt: "2026-10-12T00:00:00.000Z",
  });

  it("is pending while any item is PENDING", () => {
    expect(hasPendingFeedback(null)).toBe(false);
    expect(hasPendingFeedback({ overall: feedbackItem("READY"), questions: [feedbackItem("PENDING")] })).toBe(true);
    expect(hasPendingFeedback({ overall: feedbackItem("FAILED"), questions: [] })).toBe(false);
  });

  it("spaces the polling and then keeps the last delay", () => {
    expect([0, 1, 2, 3, 4, 10].map(nextFeedbackPollDelay)).toEqual([3_000, 6_000, 12_000, 24_000, 30_000, 30_000]);
  });
});
