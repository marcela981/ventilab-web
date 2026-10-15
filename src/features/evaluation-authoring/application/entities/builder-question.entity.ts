/*
* Funcionalidad: Builder question drafts
* Descripción: Pure rules of the question editor of the evaluation builder: Spanish labels of the question types, the local draft of a question (prompt document, points, explanation and, for choice questions, the option list with stable client keys; new options have no id yet), the correct-answer semantics (radio for SINGLE_CHOICE and TRUE_FALSE, checkbox for MULTIPLE_CHOICE), adding, removing and moving options, validation mirroring the backend DTOs (points positive, option text required, at most 20 options), the dirty check and the save plan of a draft against the loaded question: the question PATCH holding only the changed fields, the options to create, the option PATCHes (the ones that become correct first, so a multiple choice never drops to zero correct answers on the way), the options to delete and whether the final option order must be sent with `PUT .../options/order`. Also the body of a new question (TRUE_FALSE starts with the two options Verdadero and Falso) and the Spanish messages of the readiness issues of `GET /api/evaluations/{id}`. No dependencies besides the builder entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { emptyDoc, sameRichText } from "./builder-rich-text";
import type { RichDoc } from "./builder-rich-text";
import type { BuilderMedia, BuilderQuestion, QuestionType, ReadinessIssue } from "./evaluation-builder.entity";

export type { QuestionType } from "./evaluation-builder.entity";

export const MAX_OPTIONS_PER_QUESTION = 20;

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const QUESTION_TYPE_LABELS: Readonly<Record<QuestionType, string>> = {
  SINGLE_CHOICE: "Selección única",
  MULTIPLE_CHOICE: "Selección múltiple",
  TRUE_FALSE: "Verdadero o falso",
  OPEN_TEXT: "Respuesta abierta",
  SIMULATION: "Simulación",
};

export const QUESTION_TYPES: readonly QuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "OPEN_TEXT", "SIMULATION"];

export const TRUE_FALSE_OPTION_TEXTS = ["Verdadero", "Falso"] as const;

export const QUESTION_ERROR_MESSAGES = {
  pointsPositive: "Los puntos deben ser un número mayor que cero.",
  optionRequired: "Escribe el texto de la opción.",
  tooManyOptions: `Una pregunta admite como máximo ${MAX_OPTIONS_PER_QUESTION} opciones.`,
} as const;

export const READINESS_ISSUE_MESSAGES: Readonly<Record<string, string>> = {
  no_questions: "La evaluación necesita al menos una pregunta.",
  points_not_positive: "Los puntos de la pregunta deben ser mayores que cero.",
  correct_option_required: "Marca al menos una opción correcta.",
  single_correct_option_required: "Marca solo una opción correcta.",
  true_false_two_options_required: "Una pregunta de verdadero o falso debe tener exactamente dos opciones.",
  invalid_rubric: "La rúbrica de la simulación no es válida.",
};

export function readinessIssueMessage(issue: ReadinessIssue): string {
  const base = READINESS_ISSUE_MESSAGES[issue.code] ?? "La pregunta tiene un problema que impide marcar la evaluación como lista.";

  return issue.details.length > 0 ? `${base} ${issue.details.join("; ")}` : base;
}

export function isChoiceType(type: QuestionType): boolean {
  return type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE";
}

export function hasSingleCorrect(type: QuestionType): boolean {
  return type === "SINGLE_CHOICE" || type === "TRUE_FALSE";
}

export type OptionDraft = {
  key: string
  // null until the option is created on the backend.
  id: string | null
  content: string
  isCorrect: boolean
  mediaId: string | null
  media: BuilderMedia | null
};

export type QuestionDraft = {
  prompt: RichDoc
  points: string
  explanation: string
  options: OptionDraft[]
};

export function questionDraftFrom(question: BuilderQuestion): QuestionDraft {
  return {
    prompt: question.prompt,
    points: String(question.points),
    explanation: question.explanation ?? "",
    options: question.options.map((option) => ({
      key: option.id,
      id: option.id,
      content: option.content,
      isCorrect: option.isCorrect,
      mediaId: option.mediaId,
      media: option.media,
    })),
  };
}

export function setOptionCorrect(type: QuestionType, options: readonly OptionDraft[], key: string, checked: boolean): OptionDraft[] {
  if (hasSingleCorrect(type)) {
    // Radio semantics: the chosen option becomes the only correct one.
    return checked ? options.map((option) => ({ ...option, isCorrect: option.key === key })) : [...options];
  }

  return options.map((option) => (option.key === key ? { ...option, isCorrect: checked } : option));
}

export function addOptionDraft(options: readonly OptionDraft[], key: string): OptionDraft[] {
  return [...options, { key, id: null, content: "", isCorrect: false, mediaId: null, media: null }];
}

export function removeOptionDraft(options: readonly OptionDraft[], key: string): OptionDraft[] {
  return options.filter((option) => option.key !== key);
}

export function moveOptionDraft(options: readonly OptionDraft[], key: string, delta: -1 | 1): OptionDraft[] {
  const from = options.findIndex((option) => option.key === key);
  const to = from + delta;

  if (from < 0 || to < 0 || to >= options.length) {
    return [...options];
  }

  const next = [...options];
  const [moved] = next.splice(from, 1);

  if (moved) {
    next.splice(to, 0, moved);
  }

  return next;
}

export function updateOptionContent(options: readonly OptionDraft[], key: string, content: string): OptionDraft[] {
  return options.map((option) => (option.key === key ? { ...option, content } : option));
}

export type QuestionErrors = {
  points?: string
  options?: string
  optionContent: Record<string, string>
};

function parsePoints(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");

  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function validateQuestionDraft(type: QuestionType, draft: QuestionDraft): QuestionErrors {
  const errors: QuestionErrors = { optionContent: {} };

  if (parsePoints(draft.points) === null) {
    errors.points = QUESTION_ERROR_MESSAGES.pointsPositive;
  }

  if (isChoiceType(type)) {
    if (draft.options.length > MAX_OPTIONS_PER_QUESTION) {
      errors.options = QUESTION_ERROR_MESSAGES.tooManyOptions;
    }

    for (const option of draft.options) {
      if (option.content.trim() === "") {
        errors.optionContent[option.key] = QUESTION_ERROR_MESSAGES.optionRequired;
      }
    }
  }

  return errors;
}

export function hasQuestionErrors(errors: QuestionErrors): boolean {
  return errors.points !== undefined || errors.options !== undefined || Object.keys(errors.optionContent).length > 0;
}

export type UpdateQuestionChanges = {
  prompt?: RichDoc
  points?: number
  explanation?: string | null
};

export type OptionUpdate = {
  id: string
  changes: { content?: string, isCorrect?: boolean }
};

export type QuestionSavePlan = {
  question: UpdateQuestionChanges | null
  creates: OptionDraft[]
  updates: OptionUpdate[]
  deletes: string[]
  reorder: boolean
};

// Order the backend ends with after the creates (appended) and deletes, before any reorder.
function orderAfterCreatesAndDeletes(question: BuilderQuestion, draft: QuestionDraft): string[] {
  const kept = new Set(draft.options.map((option) => option.key));

  return [
    ...question.options.filter((option) => kept.has(option.id)).map((option) => option.id),
    ...draft.options.filter((option) => option.id === null).map((option) => option.key),
  ];
}

// Assumes a valid draft (validateQuestionDraft returned no errors).
export function planQuestionSave(question: BuilderQuestion, draft: QuestionDraft): QuestionSavePlan {
  const changes: UpdateQuestionChanges = {};
  const points = parsePoints(draft.points);
  const explanation = draft.explanation.trim() === "" ? null : draft.explanation;

  if (!sameRichText(draft.prompt, question.prompt)) {
    changes.prompt = draft.prompt;
  }

  if (points !== null && points !== question.points) {
    changes.points = points;
  }

  if (explanation !== question.explanation) {
    changes.explanation = explanation;
  }

  const existing = new Map(question.options.map((option) => [option.id, option]));
  const updates: OptionUpdate[] = [];

  for (const option of draft.options) {
    const current = option.id === null ? undefined : existing.get(option.id);

    if (!current || option.id === null) {
      continue;
    }

    const optionChanges: OptionUpdate["changes"] = {};

    if (option.content.trim() !== current.content) {
      optionChanges.content = option.content.trim();
    }

    if (option.isCorrect !== current.isCorrect) {
      optionChanges.isCorrect = option.isCorrect;
    }

    if (Object.keys(optionChanges).length > 0) {
      updates.push({ id: option.id, changes: optionChanges });
    }
  }

  // The options that become correct go first: a READY multiple choice never passes through zero correct answers.
  updates.sort((a, b) => Number(b.changes.isCorrect === true) - Number(a.changes.isCorrect === true));

  const draftIds = new Set(draft.options.map((option) => option.id).filter((id): id is string => id !== null));
  const finalOrder = draft.options.map((option) => option.key);

  return {
    question: Object.keys(changes).length > 0 ? changes : null,
    creates: draft.options.filter((option) => option.id === null),
    updates,
    deletes: question.options.filter((option) => !draftIds.has(option.id)).map((option) => option.id),
    reorder: orderAfterCreatesAndDeletes(question, draft).join("|") !== finalOrder.join("|"),
  };
}

export function isPlanEmpty(plan: QuestionSavePlan): boolean {
  return plan.question === null && plan.creates.length === 0 && plan.updates.length === 0 && plan.deletes.length === 0 && !plan.reorder;
}

export function isQuestionDraftDirty(question: BuilderQuestion, draft: QuestionDraft): boolean {
  // Invalid points produce no PATCH but are still an unsaved edit.
  return parsePoints(draft.points) === null || !isPlanEmpty(planQuestionSave(question, draft));
}

export type NewQuestionBody = {
  type: QuestionType
  prompt: RichDoc
  scenarioId?: string
  options?: Array<{ content: string, isCorrect: boolean }>
};

export function newQuestionBody(type: QuestionType, scenarioId: string | null): NewQuestionBody {
  return {
    type,
    prompt: emptyDoc(),
    ...(scenarioId === null ? {} : { scenarioId }),
    ...(type === "TRUE_FALSE" ? { options: TRUE_FALSE_OPTION_TEXTS.map((content) => ({ content, isCorrect: false })) } : {}),
  };
}

export function questionIssues(issues: readonly ReadinessIssue[], questionId: string): ReadinessIssue[] {
  return issues.filter((issue) => issue.questionId === questionId);
}
