/*
* Funcionalidad: Simulation exam entities
* Descripción: Types and pure rules of the EXAM practical part (T9): the exam context a session record keeps (attempt,
*   question, evaluation, return URL, assistance policy and the server clock offset measured at start), its validation
*   when read back from storage, the state of the practical slot of a SIMULATION question (not started, in progress,
*   completed, checking) derived from the saved answer and the session status, the rubric rules a published question
*   exposes (criteria, weights, passing score, assistance policy and its penalty points) read from the opaque rubric
*   object, the time left to the attempt deadline on the server clock and its countdown text. No grade is computed
*   here: the score is always the server's. Has no runtime dependency on the sim-engine, so the exam slot chunk stays
*   light. Depends on the result config and the assist entity types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CRITERION_LABELS } from "../config/sim-result.config";
import type { AssistancePolicyValue } from "./sim-assist.entity";

/** Exam linkage of an EXAM session, kept with its session record. */
export type SessionExamContext = {
  attemptId: string
  questionId: string
  /** Null when the start did not know the evaluation (the return then goes to the evaluations list). */
  evaluationId: string | null
  /** Exam attempt URL the console returns to after the end (or the deadline). */
  returnUrl: string
  /** The rubric policy when the question exposes it; null = unknown (the console fails safe: assist disabled). */
  assistancePolicy: AssistancePolicyValue | null
  /** Server clock minus client clock (ms), measured from the attempt `serverNow` at start; 0 when unknown. */
  serverOffsetMs: number
};

const ASSISTANCE_POLICIES: ReadonlySet<string> = new Set<AssistancePolicyValue>(["DISABLED", "ALLOWED_WITH_PENALTY"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function toAssistancePolicy(value: unknown): AssistancePolicyValue | null {
  return typeof value === "string" && ASSISTANCE_POLICIES.has(value) ? value as AssistancePolicyValue : null;
}

/** Validates a stored exam context; anything malformed is dropped (the console then fails safe). */
export function parseExamContext(value: unknown): SessionExamContext | null {
  if (!isRecord(value) || !nonEmpty(value.attemptId) || !nonEmpty(value.questionId) || !nonEmpty(value.returnUrl)) {
    return null;
  }

  // Only an app-relative URL is followed, never an absolute one read back from storage.
  if (!value.returnUrl.startsWith("/") || value.returnUrl.startsWith("//")) {
    return null;
  }

  return {
    attemptId: value.attemptId,
    questionId: value.questionId,
    evaluationId: nonEmpty(value.evaluationId) ? value.evaluationId : null,
    returnUrl: value.returnUrl,
    assistancePolicy: toAssistancePolicy(value.assistancePolicy),
    serverOffsetMs: typeof value.serverOffsetMs === "number" && Number.isFinite(value.serverOffsetMs) ? value.serverOffsetMs : 0,
  };
}

/**
 * Server clock minus client clock from a server timestamp read between two client readings (the midpoint absorbs
 * the request latency). 0 when the timestamp cannot be parsed.
 */
export function measureServerOffsetMs(serverNowIso: string | null | undefined, sentAtMs: number, receivedAtMs: number): number {
  const serverNowMs = serverNowIso ? Date.parse(serverNowIso) : Number.NaN;

  return Number.isFinite(serverNowMs) ? Math.round(serverNowMs - (sentAtMs + receivedAtMs) / 2) : 0;
}

/** Milliseconds left to the deadline on the server clock (never negative); null without a valid deadline. */
export function deadlineRemainingMs(deadlineIso: string | null, clientNowMs: number, serverOffsetMs: number = 0): number | null {
  const deadlineMs = deadlineIso ? Date.parse(deadlineIso) : Number.NaN;

  return Number.isFinite(deadlineMs) ? Math.max(0, deadlineMs - (clientNowMs + serverOffsetMs)) : null;
}

/** 4:05 · 1:02:03 (rounded up, so 0:00 only once the deadline has passed). */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

export type PracticalSlotState =
  | { status: "not_started" }
  /** A session is linked but its status is still being read (or could not be read). */
  | { status: "checking", sessionId: string }
  | { status: "in_progress", sessionId: string }
  | { status: "completed", sessionId: string };

/** ACTIVE = still running; any other known status (ENDED, EXPIRED, …) = the practical part is over. */
export function practicalSlotState(sessionId: string | null | undefined, sessionStatus: string | null): PracticalSlotState {
  if (!sessionId) {
    return { status: "not_started" };
  }

  if (sessionStatus === null) {
    return { status: "checking", sessionId };
  }

  return sessionStatus === "ACTIVE" ? { status: "in_progress", sessionId } : { status: "completed", sessionId };
}

export type ExamRubricCriterion = {
  type: string
  label: string
  weight: number
  threshold: number | null
  penaltyPoints: number | null
  windowMinutes: number | null
};

export type ExamRubricRules = {
  criteria: readonly ExamRubricCriterion[]
  passingScore: number | null
  assistancePolicy: AssistancePolicyValue | null
  /** Points subtracted per AI assist request (AI_ASSIST_USAGE criterion), when the rubric states it. */
  assistPenaltyPoints: number | null
};

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export const AI_ASSIST_CRITERION = "AI_ASSIST_USAGE";

/**
 * Rules of the outcome rubric (ClinicalCaseRubricDTO) from the opaque question rubric. The student attempt only
 * carries it once the grade is published (BACKEND GAP); null when it is absent or has no valid criterion.
 */
export function readRubricRules(rubric: unknown): ExamRubricRules | null {
  if (!isRecord(rubric)) {
    return null;
  }

  const criteria = (Array.isArray(rubric.criteria) ? rubric.criteria : []).flatMap((item: unknown): ExamRubricCriterion[] => {
    if (!isRecord(item) || !nonEmpty(item.type) || finiteOrNull(item.weight) === null) {
      return [];
    }

    return [{
      type: item.type,
      label: CRITERION_LABELS[item.type] ?? item.type,
      weight: item.weight as number,
      threshold: finiteOrNull(item.threshold),
      penaltyPoints: finiteOrNull(item.penaltyPoints),
      windowMinutes: finiteOrNull(item.windowMinutes),
    }];
  });

  const assistancePolicy = toAssistancePolicy(rubric.assistancePolicy);

  if (criteria.length === 0 && assistancePolicy === null) {
    return null;
  }

  return {
    criteria,
    passingScore: finiteOrNull(rubric.passingScore),
    assistancePolicy,
    assistPenaltyPoints: criteria.find((criterion) => criterion.type === AI_ASSIST_CRITERION)?.penaltyPoints ?? null,
  };
}
