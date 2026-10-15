/*
* Funcionalidad: Grading attempt mappers tests
* Descripción: Verifies the mapping of the grading attempt: questions sorted by order with their position, the answer joined by questionId (null when the student did not answer), the correct option ids kept apart for the staff, the scores and the practical score; the defensive reading of the opaque rubric breakdown rows (criterion or parameter name, numbers only when numeric, rows without a name dropped); and the staff feedback items. Depends on vitest, the grading mappers and the grading test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  feedbackDto,
  feedbackItemDto,
  gradingAnswerDto,
  gradingAttemptDto,
  gradingOptionDto,
  gradingQuestionDto,
} from "../../application/pages/grading-test-helpers";
import { toGradingAttempt, toGradingFeedback, toRubricBreakdownRow } from "./grading-attempt.mapper";

describe("toGradingAttempt", () => {
  it("joins every question with its answer and keeps the correct options apart", () => {
    const attempt = toGradingAttempt(gradingAttemptDto("at1", {
      questions: [
        gradingQuestionDto("q2", 2),
        gradingQuestionDto("q1", 1, {
          type: "SINGLE_CHOICE",
          options: [gradingOptionDto("o2", 2, { isCorrect: true }), gradingOptionDto("o1", 1)],
          explanation: "La PEEP mejora la oxigenación.",
        }),
      ],
      answers: [
        gradingAnswerDto("q1", { selectedOptionIds: ["o1"], autoScore: 0, earnedScore: 0 }),
        gradingAnswerDto("q2", { answerId: null }),
      ],
    }));

    expect(attempt.items.map((item) => [item.question.id, item.question.position])).toEqual([["q1", 1], ["q2", 2]]);

    const [first, second] = attempt.items;

    expect(first?.question.options.map((option) => option.id)).toEqual(["o1", "o2"]);
    expect(first?.question.options[1]).not.toHaveProperty("isCorrect");
    expect(first?.correctOptionIds).toEqual(["o2"]);
    expect(first?.answer).toEqual({ selectedOptionIds: ["o1"], textAnswer: null, simulationSessionId: null });
    expect(first?.question.answer).toEqual(first?.answer);
    expect(first?.autoScore).toBe(0);
    expect(first?.explanation).toBe("La PEEP mejora la oxigenación.");
    expect(second?.answer).toBeNull();
    expect(attempt.passingGrade).toBe(3);
    expect(attempt.studentId).toBe("st-1");
  });

  it("maps the practical score of a SIMULATION answer", () => {
    const attempt = toGradingAttempt(gradingAttemptDto("at1", {
      questions: [gradingQuestionDto("q1", 1, { type: "SIMULATION" })],
      answers: [gradingAnswerDto("q1", {
        simulationSessionId: "s1",
        practicalScore: {
          available: true,
          score: 0.75,
          reason: null,
          breakdown: [
            { criterion: "TIME_IN_RANGE", weight: 2, value: 80, threshold: 70, points: 1, weightedPoints: 0.5, justification: "Estable" },
          ] as never[],
        },
      })],
    }));

    expect(attempt.items[0]?.practicalScore).toEqual({
      available: true,
      score: 0.75,
      reason: null,
      breakdown: [{ criterion: "TIME_IN_RANGE", value: 80, threshold: 70, points: 1, weightedPoints: 0.5, justification: "Estable" }],
    });
  });
});

describe("toRubricBreakdownRow", () => {
  it("reads the known fields defensively", () => {
    expect(toRubricBreakdownRow({ parameter: "peep", value: "8", points: 1 })).toEqual({
      criterion: "peep",
      value: null,
      threshold: null,
      points: 1,
      weightedPoints: null,
      justification: null,
    });
    expect(toRubricBreakdownRow({ value: 1 })).toBeNull();
    expect(toRubricBreakdownRow(null)).toBeNull();
    expect(toRubricBreakdownRow("x")).toBeNull();
  });
});

describe("toGradingFeedback", () => {
  it("maps the overall and per-question items", () => {
    const feedback = toGradingFeedback(feedbackDto("at1", {
      overall: feedbackItemDto("f0"),
      questions: [feedbackItemDto("f1", { questionId: "q1", status: "PENDING", source: null, content: "" })],
    }));

    expect(feedback.overall).toMatchObject({ id: "f0", status: "READY", provider: "gemini", model: "gemini-2.0-flash" });
    expect(feedback.questions).toEqual([expect.objectContaining({ id: "f1", questionId: "q1", status: "PENDING" })]);
  });
});
