/*
* Funcionalidad: Attempt feedback and result entities
* Descripción: Domain types and pure rules of the attempt result page. AttemptFeedback is the AI feedback of a published attempt (overall item plus one item per question, each PENDING|READY|FAILED with source LLM|DETERMINISTIC|null; the item id is the GRADE_FEEDBACK rating target). Rules: whether any item is still pending, the feedback item of a question, the spaced polling delay used while feedback is pending (10 s, 20 s, 40 s… capped at 60 s) and the parsing of a published simulation rubric (`{criteria:[{parameter, expectedValue, min?, max?, priority?}], justification?}`, the real backend schema) into display rows; unknown or malformed criteria are skipped. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type FeedbackStatus = "PENDING" | "READY" | "FAILED";
export type FeedbackSource = "LLM" | "DETERMINISTIC";

export type FeedbackItem = {
  id: string
  questionId: string | null
  status: FeedbackStatus
  source: FeedbackSource | null
  content: string | null
};

export type AttemptFeedback = {
  attemptId: string
  overall: FeedbackItem | null
  questions: FeedbackItem[]
};

export function hasPendingFeedback(feedback: AttemptFeedback | null): boolean {
  if (!feedback) {
    return false;
  }

  return feedback.overall?.status === "PENDING" || feedback.questions.some((item) => item.status === "PENDING");
}

export function findQuestionFeedback(feedback: AttemptFeedback | null, questionId: string): FeedbackItem | null {
  return feedback?.questions.find((item) => item.questionId === questionId) ?? null;
}

export const FEEDBACK_POLL_BASE_MS = 10_000;
export const FEEDBACK_POLL_MAX_MS = 60_000;

// Backup polling while feedback is pending (the socket event is the primary signal):
// step 0 → 10 s, 1 → 20 s, 2 → 40 s, then 60 s.
export function nextFeedbackPollDelay(step: number): number {
  const safeStep = Number.isFinite(step) && step > 0 ? Math.floor(step) : 0;

  return Math.min(FEEDBACK_POLL_BASE_MS * 2 ** Math.min(safeStep, 16), FEEDBACK_POLL_MAX_MS);
}

export const RUBRIC_PRIORITIES = ["CRITICO", "IMPORTANTE", "OPCIONAL"] as const;
export type RubricPriority = (typeof RUBRIC_PRIORITIES)[number];

export type RubricCriterion = {
  parameter: string
  expectedValue: string | number
  min: number | null
  max: number | null
  priority: RubricPriority | null
};

export type Rubric = {
  criteria: RubricCriterion[]
  justification: string | null
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toNumberOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

function toCriterion(value: unknown): RubricCriterion | null {
  if (!isRecord(value) || typeof value.parameter !== "string") {
    return null;
  }

  const { expectedValue, priority } = value;

  if (typeof expectedValue !== "string" && typeof expectedValue !== "number") {
    return null;
  }

  return {
    parameter: value.parameter,
    expectedValue,
    min: toNumberOrNull(value.min),
    max: toNumberOrNull(value.max),
    priority: RUBRIC_PRIORITIES.find((item) => item === priority) ?? null,
  };
}

export function parseRubric(value: unknown): Rubric | null {
  if (!isRecord(value) || !Array.isArray(value.criteria)) {
    return null;
  }

  const criteria = value.criteria.flatMap((item) => {
    const criterion = toCriterion(item);

    return criterion ? [criterion] : [];
  });
  const justification = typeof value.justification === "string" && value.justification.trim() !== "" ? value.justification : null;

  return criteria.length === 0 && justification === null ? null : { criteria, justification };
}
