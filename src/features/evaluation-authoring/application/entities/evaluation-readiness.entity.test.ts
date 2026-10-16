/*
* Funcionalidad: Evaluation readiness tests
* Descripción: Unit tests of the client READY validation of the builder against the backend rule it mirrors: no questions, non-positive points, choice questions without a correct option, SINGLE_CHOICE and TRUE_FALSE with two correct options, TRUE_FALSE without exactly two options (reported alone), a valid MULTIPLE_CHOICE with several correct options, SIMULATION with an invalid rubric (Spanish details) and the client-only clinical case rule, and readinessQuestionsFrom applying the unsaved drafts. Depends on vitest and the builder entities. v1.1 (A3 review W2): a SIMULATION question without a clinical case raises no readiness issue (the backend does not require it). v1.2 (T10 simulation): `emptyRubricDraft` comes from @shared/rubric-editor.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { emptyRubricDraft } from "@shared/rubric-editor";
import type { BuilderEvaluation, BuilderQuestion } from "./evaluation-builder.entity";
import { readinessQuestionsFrom, validateEvaluationReadiness } from "./evaluation-readiness.entity";
import type { ReadinessQuestion } from "./evaluation-readiness.entity";

const correct = (...flags: boolean[]) => flags.map((isCorrect) => ({ isCorrect }));

function question(id: string, overrides: Partial<ReadinessQuestion> = {}): ReadinessQuestion {
  return { id, type: "OPEN_TEXT", points: 1, options: [], rubric: null, clinicalCaseId: null, ...overrides };
}

const codes = (questions: ReadinessQuestion[]) => validateEvaluationReadiness(questions).map((issue) => [issue.code, issue.questionId]);

describe("validateEvaluationReadiness", () => {
  it("needs at least one question", () => {
    expect(validateEvaluationReadiness([])).toEqual([{ code: "no_questions", questionId: null, details: [] }]);
  });

  it("checks points and the correct options of choice questions", () => {
    expect(codes([
      question("q1", { points: 0 }),
      question("q2", { type: "SINGLE_CHOICE", options: correct(false, false) }),
      question("q3", { type: "SINGLE_CHOICE", options: correct(true, true) }),
      question("q4", { type: "TRUE_FALSE", options: correct(true, true) }),
      question("q5", { type: "TRUE_FALSE", options: correct(true, false, false) }),
      question("q6", { type: "MULTIPLE_CHOICE", options: correct(true, true, false) }),
      question("q7", { type: "MULTIPLE_CHOICE", options: correct(false), points: Number.NaN }),
    ])).toEqual([
      ["points_not_positive", "q1"],
      ["correct_option_required", "q2"],
      ["single_correct_option_required", "q3"],
      ["single_correct_option_required", "q4"],
      ["true_false_two_options_required", "q5"],
      ["points_not_positive", "q7"],
      ["correct_option_required", "q7"],
    ]);
  });

  it("validates the rubric of a SIMULATION question and never requires its clinical case", () => {
    const issues = validateEvaluationReadiness([
      question("q1", { type: "SIMULATION", rubric: { criteria: [] } }),
      question("q2", { type: "SIMULATION", rubric: { criteria: [{ parameter: "peep", expectedValue: 8 }] }, clinicalCaseId: "case-1" }),
    ]);

    expect(issues).toEqual([
      { code: "invalid_rubric", questionId: "q1", details: ["La rúbrica necesita al menos un criterio."] },
    ]);
  });
});

describe("readinessQuestionsFrom", () => {
  it("applies the unsaved drafts over the loaded questions", () => {
    const loaded: BuilderQuestion = {
      id: "q1",
      scenarioId: null,
      order: 0,
      type: "SINGLE_CHOICE",
      prompt: { type: "doc", content: [] },
      points: 2,
      explanation: null,
      mediaIds: [],
      media: [],
      clinicalCaseId: null,
      rubric: null,
      options: [{ id: "o1", order: 0, content: "5", isCorrect: true, mediaId: null, media: null }],
    };
    const evaluation = { questions: [loaded, { ...loaded, id: "q2" }] } as unknown as BuilderEvaluation;
    const questions = readinessQuestionsFrom(evaluation, {
      q1: { points: "0,5", options: correct(false), clinicalCaseId: null, rubric: emptyRubricDraft() },
    });

    expect(questions.map((item) => [item.id, item.points, item.options.map((option) => option.isCorrect)])).toEqual([
      ["q1", 0.5, [false]],
      ["q2", 2, [true]],
    ]);
    expect(codes(questions)).toEqual([["correct_option_required", "q1"]]);
  });
});
