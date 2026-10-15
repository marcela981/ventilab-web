/*
* Funcionalidad: Builder question draft tests
* Descripción: Unit tests of the question draft rules of the evaluation builder: radio semantics of the correct answer for SINGLE_CHOICE and TRUE_FALSE and checkbox semantics for MULTIPLE_CHOICE, moving options, validation (points, option text), the save plan (question PATCH with only the changed fields, option creates, PATCHes with the newly correct ones first, deletes and the reorder flag), the dirty check and the body of a new TRUE_FALSE question. Depends on vitest and the builder entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  addOptionDraft,
  isQuestionDraftDirty,
  moveOptionDraft,
  newQuestionBody,
  planQuestionSave,
  questionDraftFrom,
  QUESTION_ERROR_MESSAGES,
  setOptionCorrect,
  updateOptionContent,
  validateQuestionDraft,
} from "./builder-question.entity";
import type { BuilderQuestion } from "./evaluation-builder.entity";

const prompt = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "¿PEEP?" }] }] };

function choiceQuestion(type: BuilderQuestion["type"] = "SINGLE_CHOICE"): BuilderQuestion {
  return {
    id: "q1",
    scenarioId: null,
    order: 0,
    type,
    prompt,
    points: 2,
    explanation: null,
    mediaIds: [],
    media: [],
    clinicalCaseId: null,
    rubric: null,
    options: [
      { id: "o1", order: 0, content: "5", isCorrect: true, mediaId: null, media: null },
      { id: "o2", order: 1, content: "8", isCorrect: false, mediaId: null, media: null },
    ],
  };
}

describe("setOptionCorrect", () => {
  it("keeps a single correct option for SINGLE_CHOICE and TRUE_FALSE", () => {
    const draft = questionDraftFrom(choiceQuestion());

    for (const type of ["SINGLE_CHOICE", "TRUE_FALSE"] as const) {
      expect(setOptionCorrect(type, draft.options, "o2", true).map((option) => option.isCorrect)).toEqual([false, true]);
      // Unchecking a radio changes nothing.
      expect(setOptionCorrect(type, draft.options, "o1", false).map((option) => option.isCorrect)).toEqual([true, false]);
    }
  });

  it("toggles each option independently for MULTIPLE_CHOICE", () => {
    const draft = questionDraftFrom(choiceQuestion("MULTIPLE_CHOICE"));
    const both = setOptionCorrect("MULTIPLE_CHOICE", draft.options, "o2", true);

    expect(both.map((option) => option.isCorrect)).toEqual([true, true]);
    expect(setOptionCorrect("MULTIPLE_CHOICE", both, "o1", false).map((option) => option.isCorrect)).toEqual([false, true]);
  });
});

describe("validateQuestionDraft", () => {
  it("requires positive points and option texts", () => {
    const draft = questionDraftFrom(choiceQuestion());
    const options = addOptionDraft(draft.options, "new-1");
    const errors = validateQuestionDraft("SINGLE_CHOICE", { ...draft, points: "0", options });

    expect(errors.points).toBe(QUESTION_ERROR_MESSAGES.pointsPositive);
    expect(errors.optionContent).toEqual({ "new-1": QUESTION_ERROR_MESSAGES.optionRequired });
    expect(validateQuestionDraft("SINGLE_CHOICE", { ...draft, points: "1,5" })).toEqual({ optionContent: {} });
  });
});

describe("planQuestionSave", () => {
  it("is empty and not dirty for an untouched draft", () => {
    const question = choiceQuestion();
    const draft = questionDraftFrom(question);

    expect(planQuestionSave(question, draft)).toEqual({ question: null, creates: [], updates: [], deletes: [], reorder: false });
    expect(isQuestionDraftDirty(question, draft)).toBe(false);
  });

  it("plans the question PATCH, option creates, updates (newly correct first), deletes and reorder", () => {
    const question: BuilderQuestion = {
      ...choiceQuestion("MULTIPLE_CHOICE"),
      options: [
        { id: "o1", order: 0, content: "5", isCorrect: true, mediaId: null, media: null },
        { id: "o2", order: 1, content: "8", isCorrect: false, mediaId: null, media: null },
        { id: "o3", order: 2, content: "12", isCorrect: false, mediaId: null, media: null },
      ],
    };
    let draft = questionDraftFrom(question);

    draft = { ...draft, points: "3", explanation: "Protege el pulmón" };
    draft = { ...draft, options: setOptionCorrect("MULTIPLE_CHOICE", draft.options, "o1", false) };
    draft = { ...draft, options: setOptionCorrect("MULTIPLE_CHOICE", draft.options, "o2", true) };
    draft = { ...draft, options: draft.options.filter((option) => option.key !== "o3") };
    draft = { ...draft, options: updateOptionContent(addOptionDraft(draft.options, "new-1"), "new-1", "10") };
    draft = { ...draft, options: moveOptionDraft(draft.options, "new-1", -1) };

    const plan = planQuestionSave(question, draft);

    expect(plan.question).toEqual({ points: 3, explanation: "Protege el pulmón" });
    expect(plan.creates.map((option) => option.content)).toEqual(["10"]);
    expect(plan.updates).toEqual([
      { id: "o2", changes: { isCorrect: true } },
      { id: "o1", changes: { isCorrect: false } },
    ]);
    expect(plan.deletes).toEqual(["o3"]);
    expect(plan.reorder).toBe(true);
    expect(isQuestionDraftDirty(question, draft)).toBe(true);
  });

  it("treats invalid points as an unsaved edit", () => {
    const question = choiceQuestion();

    expect(isQuestionDraftDirty(question, { ...questionDraftFrom(question), points: "" })).toBe(true);
  });
});

describe("newQuestionBody", () => {
  it("creates TRUE_FALSE with its two options and places the question in its scenario", () => {
    expect(newQuestionBody("TRUE_FALSE", "s1")).toEqual({
      type: "TRUE_FALSE",
      prompt: { type: "doc", content: [] },
      scenarioId: "s1",
      options: [{ content: "Verdadero", isCorrect: false }, { content: "Falso", isCorrect: false }],
    });
    expect(newQuestionBody("OPEN_TEXT", null)).toEqual({ type: "OPEN_TEXT", prompt: { type: "doc", content: [] } });
  });
});
