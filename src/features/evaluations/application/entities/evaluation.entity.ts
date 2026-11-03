/*
* Funcionalidad: Evaluation entities
* Descripción: Domain types of the student evaluations feature and their pure rules. MyEvaluation is one assigned evaluation (assignment window, state UPCOMING|ACTIVE|CLOSED, summary, attempts, canStart from the backend); AttemptDetail is one attempt with its scenarios and questions, where correctness, explanation, rubric and earned score are optional because the backend only sends them once the grade is published; RichText is a description, prompt or scenario that is either plain/markdown text or a Tiptap document. Rules: client-side filtering by state and type (the endpoint has no filters), the evaluation shown on the intro page (several assignments of the same evaluation: the active one first), the intro action (start, continue or blocked with a reason) and the last submitted attempt. Grades and pass/fail always come from the API. Depends on the shared formatters. v1.1 (Bloque 3): MyEvaluation carries attemptsAllowed (maxAttempts plus granted resets) and its curriculum placement (moduleId, levelId, levelTitle, levelOrder, track); AttemptQuestion carries the WORKSHOP hint and the revealed correction (AnswerReveal); AttemptDetail carries partialClosedScore. v1.2 (Bloque 3): the intro blocks with the July re-entry text once attemptsAllowed is reached (BLOCKED_REASONS.alreadyTaken) and attemptOrdinalLabel gives "Intento x de N".
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { formatDate, formatDateTime } from "@shared/lib/format";

export const EVALUATION_TYPES = ["EXAM", "QUIZ", "WORKSHOP"] as const;
export type EvaluationType = (typeof EVALUATION_TYPES)[number];

export const EVALUATION_STATES = ["ACTIVE", "UPCOMING", "CLOSED"] as const;
export type EvaluationState = (typeof EVALUATION_STATES)[number];

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "PENDING_REVIEW" | "GRADED";

export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "OPEN_TEXT" | "SIMULATION";

export type RichText =
  | { kind: "text", text: string }
  | { kind: "doc", doc: Record<string, unknown> };

// Published result of an attempt; null while the grade is not published.
export type AttemptResult = {
  score: number
  maxScore: number
  grade: number
  passed: boolean
};

export type AttemptSummary = {
  id: string
  attemptNumber: number
  status: AttemptStatus
  startedAt: string
  submittedAt: string | null
  deadlineAt: string | null
  published: boolean
  result: AttemptResult | null
};

export type MyEvaluation = {
  assignmentId: string
  evaluationId: string
  title: string
  type: EvaluationType
  description: RichText | null
  durationMinutes: number | null
  maxAttempts: number
  questionCount: number
  state: EvaluationState
  startsAt: string
  endsAt: string | null
  canStart: boolean
  // maxAttempts plus the extra attempts granted by teacher resets.
  attemptsAllowed: number
  // Curriculum placement (null when the evaluation is not linked to a module or level).
  moduleId: string | null
  levelId: string | null
  levelTitle: string | null
  levelOrder: number | null
  track: string | null
  // Sorted by attempt number.
  attempts: AttemptSummary[]
};

export type MyGrade = {
  attemptId: string
  evaluationId: string
  evaluationTitle: string
  evaluationType: EvaluationType
  attemptNumber: number
  grade: number
  passed: boolean
  score: number | null
  maxScore: number | null
  publishedAt: string
};

export type AttemptStart = {
  attemptId: string
  evaluationId: string
  status: AttemptStatus
  created: boolean
};

export type EvaluationMedia = {
  mediaId: string
  kind: "IMAGE" | "VIDEO" | "FILE"
  mimeType: string
  url: string
  expiresAt: string | null
};

export type AttemptOption = {
  id: string
  order: number
  content: string
  media: EvaluationMedia | null
  // Published attempts only.
  isCorrect?: boolean | undefined
  feedback?: string | null | undefined
};

export type AttemptAnswer = {
  selectedOptionIds: string[]
  textAnswer: string | null
  simulationSessionId: string | null
};

// Correction of an answer revealed by the immediate feedback (QUIZ and WORKSHOP); the answer is then locked.
export type AnswerReveal = {
  isCorrect: boolean
  correctOptionIds: string[]
  explanation: string | null
};

// Closed questions answered correctly in an attempt that waits for teacher review.
export type PartialClosedScore = {
  correct: number
  total: number
};

export type AttemptQuestion = {
  id: string
  scenarioId: string | null
  position: number
  type: QuestionType
  prompt: RichText | null
  media: EvaluationMedia[]
  points: number
  clinicalCaseId: string | null
  // Sorted by order.
  options: AttemptOption[]
  answer: AttemptAnswer | null
  // WORKSHOP only; never replaced by the explanation.
  hint: string | null
  // Set once the answer was checked (immediate feedback), so it survives a reload.
  reveal: AnswerReveal | null
  // Published attempts only.
  earnedScore?: number | null | undefined
  explanation?: string | null | undefined
  rubric?: Record<string, unknown> | null | undefined
};

export type AttemptScenario = {
  id: string
  order: number
  content: RichText | null
  media: EvaluationMedia[]
};

export type AttemptDetail = {
  id: string
  assignmentId: string | null
  attemptNumber: number
  status: AttemptStatus
  startedAt: string
  submittedAt: string | null
  deadlineAt: string | null
  serverNow: string
  published: boolean
  evaluation: {
    id: string
    title: string
    type: EvaluationType
    description: RichText | null
  }
  // Sorted by order / position.
  scenarios: AttemptScenario[]
  questions: AttemptQuestion[]
  result: AttemptResult | null
  // PENDING_REVIEW of a QUIZ or WORKSHOP with open questions; null otherwise.
  partialClosedScore: PartialClosedScore | null
};

export type EvaluationTypeFilter = EvaluationType | null;

export function filterEvaluations(
  evaluations: readonly MyEvaluation[],
  state: EvaluationState,
  type: EvaluationTypeFilter,
): MyEvaluation[] {
  return evaluations.filter((item) => item.state === state && (type === null || item.type === type));
}

export function countByState(evaluations: readonly MyEvaluation[], type: EvaluationTypeFilter): Record<EvaluationState, number> {
  const counts: Record<EvaluationState, number> = { ACTIVE: 0, UPCOMING: 0, CLOSED: 0 };

  for (const item of evaluations) {
    if (type === null || item.type === type) {
      counts[item.state] += 1;
    }
  }

  return counts;
}

const STATE_PRIORITY: Record<EvaluationState, number> = { ACTIVE: 0, UPCOMING: 1, CLOSED: 2 };

// The same evaluation can be assigned several times (one per group or window): show the active one,
// then the next upcoming one, then the most recent closed one.
export function findIntroEvaluation(evaluations: readonly MyEvaluation[], evaluationId: string): MyEvaluation | null {
  const matches = evaluations.filter((item) => item.evaluationId === evaluationId);

  if (matches.length === 0) {
    return null;
  }

  return [...matches].sort((a, b) => {
    const byState = STATE_PRIORITY[a.state] - STATE_PRIORITY[b.state];

    if (byState !== 0) {
      return byState;
    }

    return a.state === "CLOSED" ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt);
  })[0] ?? null;
}

export function findInProgressAttempt(evaluation: MyEvaluation): AttemptSummary | null {
  return evaluation.attempts.find((attempt) => attempt.status === "IN_PROGRESS") ?? null;
}

export function findLastSubmittedAttempt(evaluation: MyEvaluation): AttemptSummary | null {
  const submitted = evaluation.attempts.filter((attempt) => attempt.status !== "IN_PROGRESS");

  return submitted[submitted.length - 1] ?? null;
}

export function findLastAttempt(evaluation: MyEvaluation): AttemptSummary | null {
  return evaluation.attempts[evaluation.attempts.length - 1] ?? null;
}

export type IntroAction =
  | { kind: "start" }
  | { kind: "continue", attemptId: string }
  | { kind: "blocked", reason: string };

// TODO(i18n): move to an evaluations namespace in src/i18n.
export const BLOCKED_REASONS = {
  upcoming: (startsAt: string) => `Disponible desde el ${formatDateTime(startsAt)}.`,
  closed: "La evaluación ya cerró.",
  noAttempts: "Ya usaste todos tus intentos.",
  // July re-entry text; with several attempts it names how many were allowed.
  alreadyTaken: (submittedAt: string, allowed: number) => (allowed <= 1
    ? `Ya realizaste esta evaluación el ${formatDate(submittedAt)}. Solo se permite un intento; contacta a tu docente si necesitas repetirla.`
    : `Ya realizaste esta evaluación el ${formatDate(submittedAt)}. Usaste los ${allowed} intentos permitidos; contacta a tu docente si necesitas repetirla.`),
  unavailable: "No puedes iniciar esta evaluación en este momento.",
} as const;

// canStart comes from the backend (active window and an open attempt or attempts left).
export function resolveIntroAction(evaluation: MyEvaluation): IntroAction {
  if (evaluation.canStart) {
    const inProgress = findInProgressAttempt(evaluation);

    return inProgress ? { kind: "continue", attemptId: inProgress.id } : { kind: "start" };
  }

  if (evaluation.state === "UPCOMING") {
    return { kind: "blocked", reason: BLOCKED_REASONS.upcoming(evaluation.startsAt) };
  }

  if (evaluation.state === "CLOSED") {
    return { kind: "blocked", reason: BLOCKED_REASONS.closed };
  }

  if (evaluation.attempts.length >= evaluation.attemptsAllowed) {
    const submittedAt = findLastSubmittedAttempt(evaluation)?.submittedAt;

    return {
      kind: "blocked",
      reason: submittedAt ? BLOCKED_REASONS.alreadyTaken(submittedAt, evaluation.attemptsAllowed) : BLOCKED_REASONS.noAttempts,
    };
  }

  return { kind: "blocked", reason: BLOCKED_REASONS.unavailable };
}

// "Intento x de N" of the attempt the button starts or continues; null with a single attempt allowed.
export function attemptOrdinalLabel(evaluation: MyEvaluation, action: IntroAction): string | null {
  if (evaluation.attemptsAllowed <= 1 || action.kind === "blocked") {
    return null;
  }

  const inProgress = action.kind === "continue" ? findInProgressAttempt(evaluation) : null;
  const number = inProgress?.attemptNumber ?? evaluation.attempts.length + 1;

  return `Intento ${number} de ${evaluation.attemptsAllowed}`;
}
