/*
* Funcionalidad: Attempt feedback entities tests
* Descripción: Unit tests of the pure result-page rules: pending detection, the feedback item of a question, the spaced polling backoff (10 s, 20 s, 40 s, capped at 60 s) and the parsing of a published simulation rubric. Depends on Vitest and the attempt feedback entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { AttemptFeedback, FeedbackItem } from "./attempt-feedback";
import { findQuestionFeedback, hasPendingFeedback, nextFeedbackPollDelay, parseRubric } from "./attempt-feedback";

const item = (id: string, questionId: string | null, status: FeedbackItem["status"]): FeedbackItem => ({
  id,
  questionId,
  status,
  source: status === "READY" ? "LLM" : null,
  content: status === "READY" ? "Bien." : null,
});

describe("nextFeedbackPollDelay", () => {
  it("doubles from 10 s and caps at 60 s", () => {
    expect([0, 1, 2, 3, 4, 50].map(nextFeedbackPollDelay)).toEqual([10_000, 20_000, 40_000, 60_000, 60_000, 60_000]);
  });

  it("treats negative or invalid steps as the first one", () => {
    expect(nextFeedbackPollDelay(-3)).toBe(10_000);
    expect(nextFeedbackPollDelay(Number.NaN)).toBe(10_000);
  });
});

describe("hasPendingFeedback", () => {
  const feedback = (overall: FeedbackItem | null, questions: FeedbackItem[]): AttemptFeedback => ({ attemptId: "at1", overall, questions });

  it("is true when the overall or any question item is pending", () => {
    expect(hasPendingFeedback(feedback(item("f0", null, "PENDING"), []))).toBe(true);
    expect(hasPendingFeedback(feedback(null, [item("f1", "q1", "READY"), item("f2", "q2", "PENDING")]))).toBe(true);
  });

  it("is false when everything is ready or failed, or without feedback", () => {
    expect(hasPendingFeedback(feedback(item("f0", null, "READY"), [item("f1", "q1", "FAILED")]))).toBe(false);
    expect(hasPendingFeedback(null)).toBe(false);
  });

  it("finds the item of a question", () => {
    const value = feedback(null, [item("f1", "q1", "READY")]);

    expect(findQuestionFeedback(value, "q1")?.id).toBe("f1");
    expect(findQuestionFeedback(value, "q9")).toBeNull();
  });
});

describe("parseRubric", () => {
  it("keeps valid criteria with their range and priority", () => {
    expect(parseRubric({
      criteria: [
        { parameter: "peep", expectedValue: 8, min: 5, max: 10, priority: "CRITICO" },
        { parameter: "ventilationMode", expectedValue: "VCV" },
        { parameter: 3, expectedValue: 1 },
        { parameter: "fio2", expectedValue: { bad: true } },
      ],
      justification: "SDRA moderado.",
    })).toEqual({
      criteria: [
        { parameter: "peep", expectedValue: 8, min: 5, max: 10, priority: "CRITICO" },
        { parameter: "ventilationMode", expectedValue: "VCV", min: null, max: null, priority: null },
      ],
      justification: "SDRA moderado.",
    });
  });

  it("returns null for a missing or empty rubric", () => {
    expect(parseRubric(null)).toBeNull();
    expect(parseRubric({})).toBeNull();
    expect(parseRubric({ criteria: [] })).toBeNull();
  });
});
