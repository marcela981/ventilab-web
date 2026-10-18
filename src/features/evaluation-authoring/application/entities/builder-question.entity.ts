/*
* Funcionalidad: Builder question drafts
* Descripción: Pure rules of the question editor of the evaluation builder: Spanish labels of the question types, the local draft of a question (prompt document, points, explanation and, for choice questions, the option list with stable client keys; new options have no id yet), the correct-answer semantics (radio for SINGLE_CHOICE and TRUE_FALSE, checkbox for MULTIPLE_CHOICE), adding, removing and moving options, validation mirroring the backend DTOs (points positive, option text required, at most 20 options), the dirty check and the save plan of a draft against the loaded question: the question PATCH holding only the changed fields, the options to create, the option PATCHes (the ones that become correct first, so a multiple choice never drops to zero correct answers on the way), the options to delete and whether the final option order must be sent with `PUT .../options/order`. Also the body of a new question (TRUE_FALSE starts with the two options Verdadero and Falso) and the Spanish messages of the readiness issues of `GET /api/evaluations/{id}`. No dependencies besides the builder entities. v1.1 (A3): SIMULATION drafts carry the clinical case and the rubric draft (saved in the question PATCH, validated with the backend rubric rules); the question PATCH is split into the text part (prompt, explanation) and the structural part (points, clinical case, rubric) so texts still save on an evaluation with submitted attempts; stripStructuralEdits drops the structural edits of a draft once the structure is locked; withCreatedOptionIds gives created options their backend id; the option order check compares option ids (an option created by a failed save keeps its client key); readiness messages cover clinical_case_required and translate the English rubric details of the backend. Depends on the simulation rubric entity. v1.2 (A3 review W2/S1): optionSaveSteps fixes the order of the option calls (options becoming correct, creates, the remaining updates such as isCorrect=false, deletes); clinical_case_required is no longer a readiness message; READY_CHANGE_REFUSED carries the READY hint shown when a 422 has no client explanation. v1.3 (S1): the draft carries the statement media (mediaIds, the list the question PATCH replaces, plus the resolved media to show them) and the option images (mediaId); addQuestionMedia (at most 20, the backend limit), removeQuestionMedia and setOptionMedia edit them; media changes are text changes (the backend accepts them with submitted attempts): mediaIds goes in the text PATCH, an option mediaId in its option PATCH, and stripStructuralEdits keeps them. v1.4 (T10 simulation): the parameter rubric rules and draft come from @shared/rubric-editor (moved unchanged). v1.5 (B3.10): the unused questionIssues filter is removed (evaluation-readiness.entity has its own). v1.6 (B4, D7): the points are read with the shared parseDecimal ("," or "." decimal, no thousands separator, no exponent, positive).
* Versión: 1.6
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { parseDecimal } from "@shared/lib/parse-decimal";
import { parseBackendRubricError, rubricDraftFrom, rubricDraftIssues, rubricIssueMessage, sameRubric, toRubricValue } from "@shared/rubric-editor";
import type { RubricDraft } from "@shared/rubric-editor";
import { BUILDER_COPY } from "./builder-copy";
import { emptyDoc, sameRichText } from "./builder-rich-text";
import type { RichDoc } from "./builder-rich-text";
import type { BuilderMedia, BuilderQuestion, QuestionType, ReadinessIssue } from "./evaluation-builder.entity";

export type { QuestionType } from "./evaluation-builder.entity";

export const MAX_OPTIONS_PER_QUESTION = 20;

// Backend MAX_MEDIA_PER_ITEM.
export const MAX_MEDIA_PER_QUESTION = 20;

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

export const READY_CHANGE_REFUSED = "ready_change_refused";

export const READINESS_ISSUE_MESSAGES: Readonly<Record<string, string>> = {
  no_questions: "La evaluación necesita al menos una pregunta.",
  points_not_positive: "Los puntos de la pregunta deben ser mayores que cero.",
  correct_option_required: "Marca al menos una opción correcta.",
  single_correct_option_required: "Marca solo una opción correcta.",
  true_false_two_options_required: "Una pregunta de verdadero o falso debe tener exactamente dos opciones.",
  invalid_rubric: "La rúbrica de la simulación no es válida.",
  // Client fallback after a 422 the client validation cannot explain (the backend sends no issues).
  [READY_CHANGE_REFUSED]: BUILDER_COPY.readyHint,
};

function readinessDetail(detail: string): string {
  const rubricIssue = parseBackendRubricError(detail);

  return rubricIssue ? rubricIssueMessage(rubricIssue) : detail;
}

export function readinessIssueMessage(issue: ReadinessIssue): string {
  const base = READINESS_ISSUE_MESSAGES[issue.code] ?? "La pregunta tiene un problema que impide marcar la evaluación como lista.";

  return issue.details.length > 0 ? `${base} ${issue.details.map(readinessDetail).join(" ")}` : base;
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
  // Statement media, in order (the question PATCH replaces the whole list).
  mediaIds: string[]
  // Resolved media of mediaIds, to show them (may miss some when storage is unavailable).
  media: BuilderMedia[]
  options: OptionDraft[]
  // SIMULATION only (null and an empty rubric for the other types).
  clinicalCaseId: string | null
  rubric: RubricDraft
};

export function questionDraftFrom(question: BuilderQuestion): QuestionDraft {
  return {
    prompt: question.prompt,
    points: String(question.points),
    explanation: question.explanation ?? "",
    mediaIds: [...question.mediaIds],
    media: [...question.media],
    options: question.options.map((option) => ({
      key: option.id,
      id: option.id,
      content: option.content,
      isCorrect: option.isCorrect,
      mediaId: option.mediaId,
      media: option.media,
    })),
    clinicalCaseId: question.clinicalCaseId,
    rubric: rubricDraftFrom(question.rubric),
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

// null removes the option image.
export function setOptionMedia(options: readonly OptionDraft[], key: string, media: BuilderMedia | null): OptionDraft[] {
  return options.map((option) => (option.key === key ? { ...option, mediaId: media?.mediaId ?? null, media } : option));
}

export function canAddQuestionMedia(draft: QuestionDraft): boolean {
  return draft.mediaIds.length < MAX_MEDIA_PER_QUESTION;
}

export function addQuestionMedia(draft: QuestionDraft, media: BuilderMedia): QuestionDraft {
  if (!canAddQuestionMedia(draft) || draft.mediaIds.includes(media.mediaId)) {
    return draft;
  }

  return { ...draft, mediaIds: [...draft.mediaIds, media.mediaId], media: [...draft.media, media] };
}

export function removeQuestionMedia(draft: QuestionDraft, mediaId: string): QuestionDraft {
  return {
    ...draft,
    mediaIds: draft.mediaIds.filter((id) => id !== mediaId),
    media: draft.media.filter((item) => item.mediaId !== mediaId),
  };
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export type QuestionErrors = {
  points?: string
  options?: string
  optionContent: Record<string, string>
  // Spanish messages of the rubric issues.
  rubric?: string[]
};

function parsePoints(value: string): number | null {
  const parsed = parseDecimal(value, { allowNegative: false });

  return parsed.ok && parsed.value !== null && parsed.value > 0 ? parsed.value : null;
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

  if (type === "SIMULATION") {
    const rubricIssues = rubricDraftIssues(draft.rubric);

    if (rubricIssues.length > 0) {
      errors.rubric = rubricIssues.map(rubricIssueMessage);
    }
  }

  return errors;
}

export function hasQuestionErrors(errors: QuestionErrors): boolean {
  return errors.points !== undefined
    || errors.options !== undefined
    || Object.keys(errors.optionContent).length > 0
    || errors.rubric !== undefined;
}

// Prompt, explanation and media: allowed even after attempts were submitted.
export type QuestionTextChanges = {
  prompt?: RichDoc
  explanation?: string | null
  mediaIds?: string[]
};

// Points, clinical case and rubric: refused by the backend once attempts were submitted.
export type QuestionStructureChanges = {
  points?: number
  clinicalCaseId?: string | null
  rubric?: Record<string, unknown> | null
};

export type OptionUpdate = {
  id: string
  changes: { content?: string, isCorrect?: boolean, mediaId?: string | null }
};

export type QuestionSavePlan = {
  text: QuestionTextChanges | null
  structure: QuestionStructureChanges | null
  creates: OptionDraft[]
  updates: OptionUpdate[]
  deletes: string[]
  reorder: boolean
};

// Identity of a draft option: its backend id once created (a created option keeps its client key), else its key.
const optionIdentity = (option: OptionDraft): string => option.id ?? option.key;

// Order the backend ends with after the creates (appended) and deletes, before any reorder.
function orderAfterCreatesAndDeletes(question: BuilderQuestion, draft: QuestionDraft): string[] {
  const keptIds = new Set(draft.options.map((option) => option.id).filter((id): id is string => id !== null));
  const loadedIds = new Set(question.options.map((option) => option.id));

  return [
    ...question.options.filter((option) => keptIds.has(option.id)).map((option) => option.id),
    // Created by an earlier save but not reloaded yet: already appended on the backend.
    ...draft.options.filter((option) => option.id !== null && !loadedIds.has(option.id)).map(optionIdentity),
    ...draft.options.filter((option) => option.id === null).map(optionIdentity),
  ];
}

// Assumes a valid draft (validateQuestionDraft returned no errors).
export function planQuestionSave(question: BuilderQuestion, draft: QuestionDraft): QuestionSavePlan {
  const text: QuestionTextChanges = {};
  const structure: QuestionStructureChanges = {};
  const points = parsePoints(draft.points);
  const explanation = draft.explanation.trim() === "" ? null : draft.explanation;

  if (!sameRichText(draft.prompt, question.prompt)) {
    text.prompt = draft.prompt;
  }

  if (explanation !== question.explanation) {
    text.explanation = explanation;
  }

  if (!sameIds(draft.mediaIds, question.mediaIds)) {
    text.mediaIds = [...draft.mediaIds];
  }

  if (points !== null && points !== question.points) {
    structure.points = points;
  }

  if (question.type === "SIMULATION") {
    if (draft.clinicalCaseId !== question.clinicalCaseId) {
      structure.clinicalCaseId = draft.clinicalCaseId;
    }

    if (!sameRubric(draft.rubric, question.rubric)) {
      structure.rubric = toRubricValue(draft.rubric);
    }
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

    if (option.mediaId !== current.mediaId) {
      optionChanges.mediaId = option.mediaId;
    }

    if (Object.keys(optionChanges).length > 0) {
      updates.push({ id: option.id, changes: optionChanges });
    }
  }

  // The options that become correct go first, so a READY MULTIPLE_CHOICE never passes through zero correct answers.
  // This cannot help SINGLE_CHOICE or TRUE_FALSE on a READY evaluation: every order of single-option PATCHes
  // passes through zero or two correct answers (there is no batch endpoint), so the builder asks to return to DRAFT first.
  updates.sort((a, b) => Number(b.changes.isCorrect === true) - Number(a.changes.isCorrect === true));

  const draftIds = new Set(draft.options.map((option) => option.id).filter((id): id is string => id !== null));
  const finalOrder = draft.options.map(optionIdentity);

  return {
    text: Object.keys(text).length > 0 ? text : null,
    structure: Object.keys(structure).length > 0 ? structure : null,
    creates: draft.options.filter((option) => option.id === null),
    updates,
    deletes: question.options.filter((option) => !draftIds.has(option.id)).map((option) => option.id),
    reorder: orderAfterCreatesAndDeletes(question, draft).join("|") !== finalOrder.join("|"),
  };
}

export type OptionSaveStep =
  | { kind: "create", option: OptionDraft }
  | { kind: "update", update: OptionUpdate }
  | { kind: "delete", optionId: string };

// Execution order of the option calls: options that become correct, then the creates, then the other updates
// (including the ones that set isCorrect=false), then the deletes. A READY MULTIPLE_CHOICE whose only correct
// answer moves to a new option therefore never passes through zero correct answers.
export function optionSaveSteps(plan: QuestionSavePlan): OptionSaveStep[] {
  const becomesCorrect = plan.updates.filter((update) => update.changes.isCorrect === true);
  const others = plan.updates.filter((update) => update.changes.isCorrect !== true);

  return [
    ...becomesCorrect.map((update): OptionSaveStep => ({ kind: "update", update })),
    ...plan.creates.map((option): OptionSaveStep => ({ kind: "create", option })),
    ...others.map((update): OptionSaveStep => ({ kind: "update", update })),
    ...plan.deletes.map((optionId): OptionSaveStep => ({ kind: "delete", optionId })),
  ];
}

export function isPlanEmpty(plan: QuestionSavePlan): boolean {
  return plan.text === null && plan.structure === null && plan.creates.length === 0 && plan.updates.length === 0 && plan.deletes.length === 0 && !plan.reorder;
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

// The draft without the edits the backend refuses once attempts were submitted: points, clinical case, rubric,
// added, removed or reordered options and correct answers. Prompt, explanation, media and option texts and images are kept.
export function stripStructuralEdits(question: BuilderQuestion, draft: QuestionDraft): QuestionDraft {
  const kept = new Map(draft.options.filter((option) => option.id !== null).map((option) => [option.id, option]));

  return {
    ...draft,
    points: String(question.points),
    clinicalCaseId: question.clinicalCaseId,
    rubric: rubricDraftFrom(question.rubric),
    options: question.options.map((option) => {
      const edited = kept.get(option.id);

      return {
        key: option.id,
        id: option.id,
        content: edited?.content ?? option.content,
        isCorrect: option.isCorrect,
        mediaId: edited ? edited.mediaId : option.mediaId,
        media: edited ? edited.media : option.media,
      };
    }),
  };
}

// Gives the options created by a save their backend id, matched by client key.
export function withCreatedOptionIds(draft: QuestionDraft, createdIds: ReadonlyMap<string, string>): QuestionDraft {
  if (createdIds.size === 0) {
    return draft;
  }

  return {
    ...draft,
    options: draft.options.map((option) => {
      const id = option.id === null ? createdIds.get(option.key) : undefined;

      return id === undefined ? option : { ...option, id };
    }),
  };
}
