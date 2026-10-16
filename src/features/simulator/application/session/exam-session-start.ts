/*
* Funcionalidad: Exam session start
* Descripción: Starts the EXAM session of a SIMULATION question (T9): POST /api/simulation/sessions with
*   `{ mode: "EXAM", attemptId, questionId, timeMultiplier, caseId? }` (the server takes the case from the question and
*   ignores caseId in EXAM; the multiplier is the fixed exam one) while GET /evaluation-attempts/{id} reads the server
*   time to measure the clock offset of the console countdown (its failure only leaves the offset at 0). The start
*   response is stored in the session store as a fresh EXAM record with its deadline and the exam context (attempt,
*   question, evaluation, return URL, assistance policy, offset), and the exam return record is written for the result
*   page. Loaded with a dynamic import when the student starts the practical part, so the session store (and the
*   sim-engine guards it uses) never weigh on the exam page. Dependencies are injectable for tests. Depends on the
*   simulator services, entities, stores and the exam config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fetchAttemptClock } from "../../api/services/exam-attempt.service";
import type { AttemptClock } from "../../api/services/exam-attempt.service";
import { startSimulationSession } from "../../api/services/simulation-sessions.service";
import { EXAM_TIME_MULTIPLIER } from "../config/sim-exam.config";
import type { AssistancePolicyValue } from "../entities/sim-assist.entity";
import { measureServerOffsetMs } from "../entities/sim-exam.entity";
import { isEngineCase, toTimeMultiplier } from "../entities/sim-session.entity";
import type { StartedSession } from "../entities/simulator.entity";
import { examReturnStore } from "./exam-return-store";
import type { ExamReturnStore } from "./exam-return-store";
import { sessionStore } from "./session-store";
import type { SessionStore } from "./session-store";

export type ExamStartRequest = {
  attemptId: string
  questionId: string
  evaluationId: string | null
  /** The question case; informative only (the server ignores it in EXAM). */
  caseId: string | null
  returnUrl: string
  assistancePolicy: AssistancePolicyValue | null
};

export type ExamStartDeps = {
  start?: typeof startSimulationSession | undefined
  fetchClock?: ((attemptId: string) => Promise<AttemptClock>) | undefined
  store?: SessionStore | undefined
  examReturn?: ExamReturnStore | undefined
  now?: (() => number) | undefined
};

export async function startExamSession(request: ExamStartRequest, deps: ExamStartDeps = {}): Promise<StartedSession> {
  const now = deps.now ?? Date.now;
  const start = deps.start ?? startSimulationSession;
  const fetchClock = deps.fetchClock ?? fetchAttemptClock;
  const { attemptId, questionId, evaluationId, caseId } = request;
  const sentAtMs = now();
  const [session, clock] = await Promise.all([
    start({
      mode: "EXAM",
      attemptId,
      questionId,
      timeMultiplier: EXAM_TIME_MULTIPLIER,
      ...(caseId ? { caseId } : {}),
    }),
    // Only the offset depends on it: a failure keeps the client clock.
    fetchClock(attemptId).catch(() => null),
  ]);
  const receivedAtMs = now();

  if (isEngineCase(session.engineCase)) {
    (deps.store ?? sessionStore).save({
      id: session.id,
      mode: "EXAM",
      seed: session.seed,
      engineVersion: session.engineVersion,
      timeMultiplier: toTimeMultiplier(session.timeMultiplier),
      expiresAt: session.expiresAt ?? clock?.deadlineAt ?? null,
      startedAt: session.startedAt,
      engineCase: session.engineCase,
      caseId: caseId ?? session.engineCase.id,
      fresh: true,
      exam: {
        attemptId,
        questionId,
        evaluationId,
        returnUrl: request.returnUrl,
        assistancePolicy: request.assistancePolicy,
        serverOffsetMs: clock ? measureServerOffsetMs(clock.serverNow, sentAtMs, receivedAtMs) : 0,
      },
    });
  }

  if (evaluationId) {
    (deps.examReturn ?? examReturnStore).save(session.id, { evaluationId, attemptId });
  }

  return session;
}
