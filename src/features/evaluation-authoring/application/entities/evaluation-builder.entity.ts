/*
* Funcionalidad: Evaluation builder entities
* Descripción: Domain types of the evaluation builder (BuilderEvaluation from `GET /api/evaluations/{id}` with its scenarios, questions, options, media, readiness issues, usage and the structureLocked flag) and the pure rules of its metadata form: the defaults of a new evaluation (showResultsImmediately true for QUIZ, false for EXAM and WORKSHOP, applied on a type change only while creating), the form built from a loaded evaluation, validation mirroring the backend DTOs (title required and at most 200 characters, duration and max attempts integers of at least 1, duration optional), the create body and the update body holding only the changed fields (null clears description, duration, module and level), the dirty check and the level/module choices of the curriculum (a module belongs to one level). No dependencies besides the builder rich text helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { isBlankRichText, sameRichText } from "./builder-rich-text";
import type { RichDoc, RichTextValue } from "./builder-rich-text";
import type { EvaluationStatus, EvaluationType } from "./evaluation-authoring.entity";

export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "OPEN_TEXT" | "SIMULATION";

export type BuilderMedia = {
  mediaId: string
  url: string
  mimeType: string
  kind: "IMAGE" | "VIDEO" | "FILE"
};

export type BuilderOption = {
  id: string
  order: number
  content: string
  isCorrect: boolean
  mediaId: string | null
  media: BuilderMedia | null
};

export type BuilderQuestion = {
  id: string
  scenarioId: string | null
  order: number
  type: QuestionType
  prompt: RichDoc
  points: number
  explanation: string | null
  mediaIds: string[]
  media: BuilderMedia[]
  clinicalCaseId: string | null
  rubric: Record<string, unknown> | null
  options: BuilderOption[]
};

export type BuilderScenario = {
  id: string
  order: number
  content: RichDoc
  mediaIds: string[]
  media: BuilderMedia[]
};

export type ReadinessIssue = {
  code: string
  questionId: string | null
  details: string[]
};

export type BuilderEvaluation = {
  id: string
  type: EvaluationType
  title: string
  description: RichTextValue | null
  status: EvaluationStatus
  moduleId: string | null
  levelId: string | null
  durationMinutes: number | null
  maxAttempts: number
  shuffleQuestions: boolean
  showResultsImmediately: boolean
  structureLocked: boolean
  canManage: boolean
  usage: { attempts: number, submittedAttempts: number, assignments: number }
  scenarios: BuilderScenario[]
  questions: BuilderQuestion[]
  readinessIssues: ReadinessIssue[]
};

export const TITLE_MAX_LENGTH = 200;

export type MetadataForm = {
  type: EvaluationType
  title: string
  description: RichTextValue | null
  // "" means not linked.
  levelId: string
  moduleId: string
  durationMinutes: string
  maxAttempts: string
  shuffleQuestions: boolean
  showResultsImmediately: boolean
};

export type MetadataErrors = Partial<Record<"title" | "durationMinutes" | "maxAttempts", string>>;

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const METADATA_ERROR_MESSAGES = {
  titleRequired: "Escribe un título.",
  titleTooLong: `El título admite como máximo ${TITLE_MAX_LENGTH} caracteres.`,
  positiveInteger: "Debe ser un número entero mayor o igual a 1.",
} as const;

export function defaultShowResults(type: EvaluationType): boolean {
  return type === "QUIZ";
}

export function newMetadataForm(type: EvaluationType = "QUIZ"): MetadataForm {
  return {
    type,
    title: "",
    description: null,
    levelId: "",
    moduleId: "",
    durationMinutes: "",
    maxAttempts: "1",
    shuffleQuestions: false,
    showResultsImmediately: defaultShowResults(type),
  };
}

// The type only changes while creating: the update DTO has no type.
export function changeMetadataType(form: MetadataForm, type: EvaluationType): MetadataForm {
  return { ...form, type, showResultsImmediately: defaultShowResults(type) };
}

export function metadataFormFrom(evaluation: BuilderEvaluation): MetadataForm {
  return {
    type: evaluation.type,
    title: evaluation.title,
    description: evaluation.description,
    levelId: evaluation.levelId ?? "",
    moduleId: evaluation.moduleId ?? "",
    durationMinutes: evaluation.durationMinutes === null ? "" : String(evaluation.durationMinutes),
    maxAttempts: String(evaluation.maxAttempts),
    shuffleQuestions: evaluation.shuffleQuestions,
    showResultsImmediately: evaluation.showResultsImmediately,
  };
}

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);

  return parsed >= 1 ? parsed : null;
}

export function validateMetadata(form: MetadataForm): MetadataErrors {
  const errors: MetadataErrors = {};
  const title = form.title.trim();

  if (title === "") {
    errors.title = METADATA_ERROR_MESSAGES.titleRequired;
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = METADATA_ERROR_MESSAGES.titleTooLong;
  }

  if (form.durationMinutes.trim() !== "" && parsePositiveInteger(form.durationMinutes) === null) {
    errors.durationMinutes = METADATA_ERROR_MESSAGES.positiveInteger;
  }

  if (parsePositiveInteger(form.maxAttempts) === null) {
    errors.maxAttempts = METADATA_ERROR_MESSAGES.positiveInteger;
  }

  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some((value) => value !== undefined);
}

export type CreateEvaluationBody = {
  type: EvaluationType
  title: string
  description?: RichTextValue
  levelId?: string
  moduleId?: string
  durationMinutes?: number
  maxAttempts?: number
  shuffleQuestions: boolean
  showResultsImmediately: boolean
};

// Assumes a valid form (validateMetadata returned no errors).
export function toCreateEvaluationBody(form: MetadataForm): CreateEvaluationBody {
  const duration = parsePositiveInteger(form.durationMinutes);
  const maxAttempts = parsePositiveInteger(form.maxAttempts);

  return {
    type: form.type,
    title: form.title.trim(),
    ...(isBlankRichText(form.description) || form.description === null ? {} : { description: form.description }),
    ...(form.levelId ? { levelId: form.levelId } : {}),
    ...(form.moduleId ? { moduleId: form.moduleId } : {}),
    ...(duration === null ? {} : { durationMinutes: duration }),
    ...(maxAttempts === null ? {} : { maxAttempts }),
    shuffleQuestions: form.shuffleQuestions,
    showResultsImmediately: form.showResultsImmediately,
  };
}

export type UpdateEvaluationChanges = {
  title?: string
  description?: RichTextValue | null
  levelId?: string | null
  moduleId?: string | null
  durationMinutes?: number | null
  maxAttempts?: number
  shuffleQuestions?: boolean
  showResultsImmediately?: boolean
};

// Only the fields that differ from the loaded evaluation; assumes a valid form.
export function toUpdateEvaluationChanges(evaluation: BuilderEvaluation, form: MetadataForm): UpdateEvaluationChanges {
  const changes: UpdateEvaluationChanges = {};
  const title = form.title.trim();
  const duration = form.durationMinutes.trim() === "" ? null : parsePositiveInteger(form.durationMinutes);
  const maxAttempts = parsePositiveInteger(form.maxAttempts);

  if (title !== evaluation.title) {
    changes.title = title;
  }

  if (!sameRichText(form.description, evaluation.description)) {
    changes.description = isBlankRichText(form.description) ? null : form.description;
  }

  if ((form.levelId || null) !== evaluation.levelId) {
    changes.levelId = form.levelId || null;
  }

  if ((form.moduleId || null) !== evaluation.moduleId) {
    changes.moduleId = form.moduleId || null;
  }

  if (duration !== evaluation.durationMinutes) {
    changes.durationMinutes = duration;
  }

  if (maxAttempts !== null && maxAttempts !== evaluation.maxAttempts) {
    changes.maxAttempts = maxAttempts;
  }

  if (form.shuffleQuestions !== evaluation.shuffleQuestions) {
    changes.shuffleQuestions = form.shuffleQuestions;
  }

  if (form.showResultsImmediately !== evaluation.showResultsImmediately) {
    changes.showResultsImmediately = form.showResultsImmediately;
  }

  return changes;
}

export function isMetadataDirty(evaluation: BuilderEvaluation | null, form: MetadataForm): boolean {
  if (evaluation === null) {
    const pristine = newMetadataForm(form.type);

    return form.title.trim() !== ""
      || !isBlankRichText(form.description)
      || form.levelId !== pristine.levelId
      || form.moduleId !== pristine.moduleId
      || form.durationMinutes.trim() !== ""
      || form.maxAttempts.trim() !== pristine.maxAttempts
      || form.shuffleQuestions !== pristine.shuffleQuestions
      || form.showResultsImmediately !== pristine.showResultsImmediately;
  }

  return Object.keys(toUpdateEvaluationChanges(evaluation, form)).length > 0;
}

// Minimal curriculum shape (structurally compatible with the learning CurriculumLevel).
export type CurriculumLevelChoice = {
  id: string
  title: string
  modules: ReadonlyArray<{ id: string, title: string }>
};

export type CurriculumChoice = { id: string, title: string, levelId: string };

export function moduleChoices(levels: readonly CurriculumLevelChoice[], levelId: string): CurriculumChoice[] {
  return levels
    .filter((level) => levelId === "" || level.id === levelId)
    .flatMap((level) => level.modules.map((module) => ({ id: module.id, title: module.title, levelId: level.id })));
}

export function selectLevel(form: MetadataForm, levels: readonly CurriculumLevelChoice[], levelId: string): MetadataForm {
  const keepsModule = form.moduleId === "" || moduleChoices(levels, levelId).some((module) => module.id === form.moduleId);

  return { ...form, levelId, moduleId: keepsModule ? form.moduleId : "" };
}

// Picking a module also links its level.
export function selectModule(form: MetadataForm, levels: readonly CurriculumLevelChoice[], moduleId: string): MetadataForm {
  const owner = moduleChoices(levels, "").find((module) => module.id === moduleId);

  return { ...form, moduleId, levelId: owner ? owner.levelId : form.levelId };
}
