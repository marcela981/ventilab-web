/*
* Funcionalidad: Evaluation builder entity tests
* Descripción: Unit tests of the metadata rules of the evaluation builder: defaults by type (show results immediately only for QUIZ, applied on a type change), validation (title, duration, max attempts), the create body (blank fields omitted), the update changes (only changed fields; blanks clear with null), the dirty check of a new and a loaded evaluation and the level/module choices. Depends on vitest and the builder entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  changeMetadataType,
  isMetadataDirty,
  METADATA_ERROR_MESSAGES,
  metadataFormFrom,
  moduleChoices,
  newMetadataForm,
  selectLevel,
  selectModule,
  toCreateEvaluationBody,
  toUpdateEvaluationChanges,
  validateMetadata,
} from "./evaluation-builder.entity";
import type { BuilderEvaluation } from "./evaluation-builder.entity";

const evaluation: BuilderEvaluation = {
  id: "e1",
  type: "EXAM",
  title: "Parcial",
  description: "Lee con atención",
  status: "DRAFT",
  moduleId: "m1",
  levelId: "l1",
  durationMinutes: 45,
  maxAttempts: 1,
  shuffleQuestions: false,
  showResultsImmediately: false,
  structureLocked: false,
  canManage: true,
  usage: { attempts: 0, submittedAttempts: 0, assignments: 0 },
  scenarios: [],
  questions: [],
  readinessIssues: [],
};

const levels = [
  { id: "l1", title: "Nivel 1", modules: [{ id: "m1", title: "Módulo 1" }] },
  { id: "l2", title: "Nivel 2", modules: [{ id: "m2", title: "Módulo 2" }] },
];

describe("metadata defaults", () => {
  it("shows results immediately only for quizzes", () => {
    expect(newMetadataForm().showResultsImmediately).toBe(true);
    expect(changeMetadataType(newMetadataForm(), "EXAM").showResultsImmediately).toBe(false);
    expect(changeMetadataType(newMetadataForm("WORKSHOP"), "QUIZ").showResultsImmediately).toBe(true);
  });
});

describe("validateMetadata", () => {
  it("mirrors the backend DTO rules", () => {
    expect(validateMetadata({ ...newMetadataForm(), title: " ", durationMinutes: "0", maxAttempts: "1.5" })).toEqual({
      title: METADATA_ERROR_MESSAGES.titleRequired,
      durationMinutes: METADATA_ERROR_MESSAGES.positiveInteger,
      maxAttempts: METADATA_ERROR_MESSAGES.positiveInteger,
    });
    expect(validateMetadata({ ...newMetadataForm(), title: "x".repeat(201) }).title).toBe(METADATA_ERROR_MESSAGES.titleTooLong);
    expect(validateMetadata({ ...newMetadataForm(), title: "Quiz" })).toEqual({});
  });
});

describe("toCreateEvaluationBody", () => {
  it("omits the blank optional fields", () => {
    expect(toCreateEvaluationBody({ ...newMetadataForm("EXAM"), title: " Parcial ", durationMinutes: "30" })).toEqual({
      type: "EXAM",
      title: "Parcial",
      durationMinutes: 30,
      maxAttempts: 1,
      shuffleQuestions: false,
      showResultsImmediately: false,
    });
  });
});

describe("toUpdateEvaluationChanges", () => {
  it("sends only the changed fields and null to clear", () => {
    const form = metadataFormFrom(evaluation);

    expect(toUpdateEvaluationChanges(evaluation, form)).toEqual({});
    expect(isMetadataDirty(evaluation, form)).toBe(false);
    expect(toUpdateEvaluationChanges(evaluation, { ...form, title: "Final", durationMinutes: "", moduleId: "", levelId: "", description: null })).toEqual({
      title: "Final",
      durationMinutes: null,
      moduleId: null,
      levelId: null,
      description: null,
    });
  });

  it("marks a new form dirty once something is typed", () => {
    expect(isMetadataDirty(null, newMetadataForm("EXAM"))).toBe(false);
    expect(isMetadataDirty(null, { ...newMetadataForm(), title: "Quiz" })).toBe(true);
  });
});

describe("curriculum choices", () => {
  it("filters modules by level and links the level of a picked module", () => {
    expect(moduleChoices(levels, "l2")).toEqual([{ id: "m2", title: "Módulo 2", levelId: "l2" }]);
    expect(selectModule(newMetadataForm(), levels, "m2")).toMatchObject({ moduleId: "m2", levelId: "l2" });
    expect(selectLevel({ ...newMetadataForm(), levelId: "l2", moduleId: "m2" }, levels, "l1")).toMatchObject({ levelId: "l1", moduleId: "" });
  });
});
