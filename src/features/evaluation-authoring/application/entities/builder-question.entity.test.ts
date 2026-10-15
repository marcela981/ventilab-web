/*
* Funcionalidad: Builder question draft tests
* Descripción: Unit tests of the question draft rules of the evaluation builder: radio semantics of the correct answer for SINGLE_CHOICE and TRUE_FALSE and checkbox semantics for MULTIPLE_CHOICE, moving options, validation (points, option text), the save plan (question PATCH with only the changed fields, option creates, PATCHes with the newly correct ones first, deletes and the reorder flag), the dirty check and the body of a new TRUE_FALSE question. Depends on vitest and the builder entities. v1.1 (A3): the plan splits the text PATCH from the structural PATCH and covers the clinical case and the rubric of a SIMULATION question; an option created by a failed save (id set, client key kept) is neither recreated nor reordered; stripStructuralEdits keeps only the texts; withCreatedOptionIds merges created ids by key; SIMULATION rubric errors block the draft; backend rubric details are translated in readiness messages.
* Versión: 1.1
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
  readinessIssueMessage,
  setOptionCorrect,
  stripStructuralEdits,
  updateOptionContent,
  validateQuestionDraft,
  withCreatedOptionIds,
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

  it("reports the rubric issues of a SIMULATION draft and accepts an empty rubric", () => {
    const question: BuilderQuestion = { ...choiceQuestion("SIMULATION"), options: [] };
    const draft = questionDraftFrom(question);

    expect(validateQuestionDraft("SIMULATION", draft)).toEqual({ optionContent: {} });

    const invalid = {
      ...draft,
      rubric: { criteria: [{ key: "c1", parameter: "peep" as const, expectedValue: "12", min: "5", max: "10", priority: "CRITICO" as const }], justification: "" },
    };

    expect(validateQuestionDraft("SIMULATION", invalid).rubric).toEqual(["Criterio 1: el valor esperado debe estar entre el mínimo y el máximo."]);
  });
});

describe("planQuestionSave", () => {
  it("is empty and not dirty for an untouched draft", () => {
    const question = choiceQuestion();
    const draft = questionDraftFrom(question);

    expect(planQuestionSave(question, draft)).toEqual({ text: null, structure: null, creates: [], updates: [], deletes: [], reorder: false });
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

    expect(plan.text).toEqual({ explanation: "Protege el pulmón" });
    expect(plan.structure).toEqual({ points: 3 });
    expect(plan.creates.map((option) => option.content)).toEqual(["10"]);
    expect(plan.updates).toEqual([
      { id: "o2", changes: { isCorrect: true } },
      { id: "o1", changes: { isCorrect: false } },
    ]);
    expect(plan.deletes).toEqual(["o3"]);
    expect(plan.reorder).toBe(true);
    expect(isQuestionDraftDirty(question, draft)).toBe(true);
  });

  it("does not recreate nor reorder an option created by an earlier failed save", () => {
    const question = choiceQuestion("MULTIPLE_CHOICE");
    const created = { key: "new-1", id: "o9", content: "10", isCorrect: false, mediaId: null, media: null };
    const draft = { ...questionDraftFrom(question), options: [...questionDraftFrom(question).options, created] };
    // Before the reload: o9 is not in the loaded question yet.
    const stale = planQuestionSave(question, draft);

    expect(stale.creates).toEqual([]);
    expect(stale.reorder).toBe(false);

    // After the reload the backend lists o9 last, as in the draft.
    const reloaded: BuilderQuestion = { ...question, options: [...question.options, { id: "o9", order: 2, content: "10", isCorrect: false, mediaId: null, media: null }] };

    expect(isQuestionDraftDirty(reloaded, draft)).toBe(false);
  });

  it("plans the clinical case and the rubric of a SIMULATION question as structural changes", () => {
    const question: BuilderQuestion = { ...choiceQuestion("SIMULATION"), options: [], rubric: { criteria: [{ parameter: "peep", expectedValue: 8 }] } };
    const draft = questionDraftFrom(question);

    expect(isQuestionDraftDirty(question, draft)).toBe(false);

    const criterion = draft.rubric.criteria[0];

    if (!criterion) {
      throw new Error("missing criterion");
    }

    const edited = {
      ...draft,
      clinicalCaseId: "case-1",
      rubric: { criteria: [{ ...criterion, expectedValue: "10", min: "8", max: "12" }], justification: "Protección pulmonar" },
    };

    expect(planQuestionSave(question, edited).structure).toEqual({
      clinicalCaseId: "case-1",
      rubric: { criteria: [{ parameter: "peep", expectedValue: 10, min: 8, max: 12, priority: "OPCIONAL" }], justification: "Protección pulmonar" },
    });
  });

  it("treats invalid points as an unsaved edit", () => {
    const question = choiceQuestion();

    expect(isQuestionDraftDirty(question, { ...questionDraftFrom(question), points: "" })).toBe(true);
  });
});

describe("stripStructuralEdits", () => {
  it("keeps the texts and drops points, correct answers, added and removed options", () => {
    const question = choiceQuestion();
    let draft = questionDraftFrom(question);

    draft = { ...draft, explanation: "Nueva", points: "9", options: setOptionCorrect("SINGLE_CHOICE", draft.options, "o2", true) };
    draft = { ...draft, options: updateOptionContent(addOptionDraft(draft.options.filter((option) => option.key !== "o1"), "new-1"), "o2", "8 cmH2O") };

    const stripped = stripStructuralEdits(question, draft);

    expect(stripped.explanation).toBe("Nueva");
    expect(stripped.points).toBe("2");
    expect(stripped.options.map((option) => [option.id, option.content, option.isCorrect])).toEqual([["o1", "5", true], ["o2", "8 cmH2O", false]]);
    expect(planQuestionSave(question, stripped)).toMatchObject({ structure: null, creates: [], updates: [{ id: "o2", changes: { content: "8 cmH2O" } }], deletes: [], reorder: false });
  });
});

describe("withCreatedOptionIds", () => {
  it("sets the backend id of the created options by client key", () => {
    const draft = { ...questionDraftFrom(choiceQuestion()), options: addOptionDraft(questionDraftFrom(choiceQuestion()).options, "new-1") };
    const merged = withCreatedOptionIds(draft, new Map([["new-1", "o9"]]));

    expect(merged.options.map((option) => [option.key, option.id])).toEqual([["o1", "o1"], ["o2", "o2"], ["new-1", "o9"]]);
  });
});

describe("readinessIssueMessage", () => {
  it("translates the English rubric details of the backend", () => {
    expect(readinessIssueMessage({ code: "invalid_rubric", questionId: "q1", details: ["criteria[1].parameter is duplicated"] }))
      .toBe("La rúbrica de la simulación no es válida. Criterio 2: el parámetro ya está en otro criterio.");
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
