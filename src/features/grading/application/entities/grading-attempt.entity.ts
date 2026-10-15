/*
* Funcionalidad: Grading attempt entities
* Descripción: View models and pure rules of the grade-attempt page /grading/attempts/[attemptId]: the attempt as the staff sees it (evaluation, student id, status, grade, passing grade, publication), each graded item (question as the evaluations feature renders it, the student answer, the correct options, automatic, manual and earned scores, pending flag, teacher comment and the practical score of a SIMULATION answer with its rubric breakdown), the per-answer grading draft (score text and comment) and its rules mirroring the backend: the score is a number in [0, points] with up to two decimals (the backend rounds to two), and a comment is required whenever the answer already has an automatic or manual score (422 evaluation.grade_override_comment_required); whether a draft changed, the request body, the pass/fail state from `passed` or the passingGrade of the API (never a hardcoded threshold) and the feedback items with their spaced polling delays. Depends on the evaluations barrel types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AttemptAnswer, AttemptQuestion, AttemptScenario, AttemptStatus } from "@features/evaluations";

export type RubricBreakdownRow = {
  criterion: string
  value: number | null
  threshold: number | null
  points: number | null
  weightedPoints: number | null
  justification: string | null
};

export type PracticalScore = {
  available: boolean
  // 0..1 as computed by the server.
  score: number | null
  breakdown: RubricBreakdownRow[]
  reason: string | null
};

export type GradingItem = {
  question: AttemptQuestion
  answer: AttemptAnswer | null
  correctOptionIds: string[]
  explanation: string | null
  autoScore: number | null
  manualScore: number | null
  earnedScore: number | null
  pending: boolean
  teacherComment: string | null
  practicalScore: PracticalScore | null
};

export type GradingAttempt = {
  id: string
  attemptNumber: number
  evaluationId: string
  evaluationTitle: string
  studentId: string
  status: AttemptStatus
  submittedAt: string | null
  score: number | null
  maxScore: number | null
  grade: number | null
  passed: boolean | null
  passingGrade: number
  publishedAt: string | null
  legacy: boolean
  scenarios: AttemptScenario[]
  items: GradingItem[]
};

export type GradeDraft = {
  score: string
  comment: string
};

export type GradeDraftErrors = Partial<Record<"score" | "comment" | "general", string>>;

export const MAX_TEACHER_COMMENT_LENGTH = 2000;

// TODO(i18n): move to a grading namespace in src/i18n.
export const GRADE_DRAFT_ERRORS = {
  scoreRequired: "Indica el puntaje.",
  scoreNumber: "Escribe un número con máximo dos decimales.",
  scoreRange: (points: number) => `El puntaje debe estar entre 0 y ${String(points).replace(".", ",")}.`,
  commentRequired: "Escribe un comentario: esta respuesta ya tenía un puntaje y lo estás cambiando.",
  commentTooLong: `El comentario no puede superar ${MAX_TEACHER_COMMENT_LENGTH} caracteres.`,
} as const;

const SCORE_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

function scoreText(value: number | null): string {
  return value === null ? "" : String(value).replace(".", ",");
}

// The draft a card starts from: the score that counts now and the current comment.
export function initialDraft(item: GradingItem): GradeDraft {
  return { score: scoreText(item.manualScore ?? item.autoScore), comment: item.teacherComment ?? "" };
}

// Accepts "2", "2.5" or "2,5"; null when it is not a number with up to two decimals.
export function parseScore(text: string): number | null {
  const trimmed = text.trim();

  return SCORE_PATTERN.test(trimmed) ? Number(trimmed.replace(",", ".")) : null;
}

// The backend asks for a comment whenever an existing automatic or manual score is replaced.
export function requiresComment(item: GradingItem): boolean {
  return item.autoScore !== null || item.manualScore !== null;
}

export function isDraftDirty(item: GradingItem, draft: GradeDraft): boolean {
  const initial = initialDraft(item);

  if (draft.comment.trim() !== initial.comment.trim()) {
    return true;
  }

  const parsed = parseScore(draft.score);
  const current = item.manualScore ?? item.autoScore;

  if (parsed === null) {
    return draft.score.trim() !== initial.score.trim();
  }

  return parsed !== current;
}

export function validateDraft(item: GradingItem, draft: GradeDraft): GradeDraftErrors {
  const errors: GradeDraftErrors = {};
  const points = item.question.points;

  if (draft.score.trim() === "") {
    errors.score = GRADE_DRAFT_ERRORS.scoreRequired;
  } else {
    const parsed = parseScore(draft.score);

    if (parsed === null) {
      errors.score = GRADE_DRAFT_ERRORS.scoreNumber;
    } else if (parsed < 0 || parsed > points) {
      errors.score = GRADE_DRAFT_ERRORS.scoreRange(points);
    }
  }

  const comment = draft.comment.trim();

  if (comment.length > MAX_TEACHER_COMMENT_LENGTH) {
    errors.comment = GRADE_DRAFT_ERRORS.commentTooLong;
  } else if (comment === "" && requiresComment(item)) {
    errors.comment = GRADE_DRAFT_ERRORS.commentRequired;
  }

  return errors;
}

export function hasErrors(errors: GradeDraftErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export type GradeAnswerBody = { manualScore: number, comment?: string };

// null while the draft is invalid.
export function toGradeAnswerBody(item: GradingItem, draft: GradeDraft): GradeAnswerBody | null {
  const manualScore = parseScore(draft.score);

  if (manualScore === null || hasErrors(validateDraft(item, draft))) {
    return null;
  }

  const comment = draft.comment.trim();

  return comment ? { manualScore, comment } : { manualScore };
}

export type PassState = "passed" | "failed" | "none";

// `passed` comes from the API; passingGrade (also from the API) only covers a missing flag.
export function passState(attempt: Pick<GradingAttempt, "grade" | "passed" | "passingGrade">): PassState {
  if (attempt.grade === null) {
    return "none";
  }

  const passed = attempt.passed ?? attempt.grade >= attempt.passingGrade;

  return passed ? "passed" : "failed";
}

export function canPublish(attempt: Pick<GradingAttempt, "status" | "publishedAt" | "legacy">): boolean {
  return attempt.status === "GRADED" && attempt.publishedAt === null && !attempt.legacy;
}

export type FeedbackStatus = "PENDING" | "READY" | "FAILED";

export type FeedbackItem = {
  id: string
  questionId: string | null
  status: FeedbackStatus
  source: "LLM" | "DETERMINISTIC" | null
  content: string
  provider: string | null
  model: string | null
  updatedAt: string
};

export type GradingFeedback = {
  overall: FeedbackItem | null
  questions: FeedbackItem[]
};

export function hasPendingFeedback(feedback: GradingFeedback | null): boolean {
  if (!feedback) {
    return false;
  }

  return feedback.overall?.status === "PENDING" || feedback.questions.some((item) => item.status === "PENDING");
}

// 3 s, 6 s, 12 s, 24 s, then every 30 s.
export const FEEDBACK_POLL_DELAYS_MS = [3_000, 6_000, 12_000, 24_000, 30_000] as const;
export const FEEDBACK_MAX_POLLS = 20;

export function nextFeedbackPollDelay(step: number): number {
  const last = FEEDBACK_POLL_DELAYS_MS[FEEDBACK_POLL_DELAYS_MS.length - 1] ?? 30_000;

  return FEEDBACK_POLL_DELAYS_MS[step] ?? last;
}
