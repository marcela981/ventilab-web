/*
* Funcionalidad: useExamPractical
* Descripción: Start and continue actions of the EXAM practical slot (T9). "Iniciar parte práctica" loads the exam
*   start module on demand (dynamic import: the session store and the sim-engine guards stay out of the exam page),
*   creates the EXAM session, hands the answer with its `simulationSessionId` to the attempt player through
*   `onChange` (player state + autosave), saves that answer explicitly with PUT /answers and awaits it, and only then
*   navigates to the console. A failed save keeps the student on the exam with the message; "Continuar parte
*   práctica" saves the link again (idempotent) and opens the console of the existing session. A busy guard prevents a
*   second session from a double click. Dependencies are injectable for tests. Depends on next/router, the exam
*   attempt service, the exam return store, the routes and the simulator error messages.
*   v1.1 (review of eb3c21b): a successful explicit PUT navigates WITHOUT handing the answer to the player (`onChange`
*   would schedule a second, debounced PUT of the same link that, resent stale after the deadline, could get a
*   spurious 409); the answer goes to the player only when the save (or the navigation) fails, so the slot keeps
*   "Continuar parte práctica". On return the attempt is read again and the slot reads `question.answer`.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useCallback, useRef, useState } from "react";
import type { AttemptAnswer, AttemptQuestion } from "@features/evaluations";
import { saveExamSimulationAnswer } from "../../api/services/exam-attempt.service";
import { buildSessionUrl } from "../config/simulator.routes";
import type { AssistancePolicyValue } from "../entities/sim-assist.entity";
import type { StartedSession } from "../entities/simulator.entity";
import { getSimulatorErrorMessage } from "../entities/simulator-error-messages";
import { examReturnStore } from "../session/exam-return-store";
import type { ExamReturnStore } from "../session/exam-return-store";
import type { ExamStartRequest } from "../session/exam-session-start";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const EXAM_PRACTICAL_COPY = {
  startFailed: (detail: string) => `No se pudo iniciar la parte práctica: ${detail}`,
  saveFailed: (detail: string) =>
    `La sesión se creó, pero no se pudo guardar en tu examen: ${detail} Usa "Continuar parte práctica" para reintentar.`,
} as const;

type StartExamSession = (request: ExamStartRequest) => Promise<StartedSession>;

export type ExamPracticalDeps = {
  /** Loads the start routine (default: dynamic import of the exam start module). */
  loadStart?: (() => Promise<StartExamSession>) | undefined
  saveAnswer?: ((attemptId: string, questionId: string, sessionId: string) => Promise<void>) | undefined
  examReturn?: ExamReturnStore | undefined
};

export type UseExamPracticalOptions = {
  question: AttemptQuestion
  answer: AttemptAnswer | null
  onChange: (answer: AttemptAnswer) => void
  attemptId: string | null
  evaluationId: string | null
  returnUrl: string
  assistancePolicy: AssistancePolicyValue | null
  deps?: ExamPracticalDeps | undefined
};

export type UseExamPracticalResult = {
  busy: boolean
  error: string | null
  start: () => Promise<void>
  continueSession: (sessionId: string) => Promise<void>
};

const EMPTY_ANSWER: AttemptAnswer = { selectedOptionIds: [], textAnswer: null, simulationSessionId: null };

const defaultLoadStart = (): Promise<StartExamSession> =>
  import("../session/exam-session-start").then((module) => (request: ExamStartRequest) => module.startExamSession(request));

export function useExamPractical(options: UseExamPracticalOptions): UseExamPracticalResult {
  const { question, answer, onChange, attemptId, evaluationId, returnUrl, assistancePolicy, deps } = options;
  const router = useRouter();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async(task: () => Promise<void>) => {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setError(null);

    try {
      await task();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  /**
   * Saves the link with an explicit PUT and opens the console. `onSaveFailed` runs when the student stays on the exam
   * (failed save or navigation), so the player keeps the link and the slot offers "Continuar".
   */
  const saveAndOpen = useCallback(async(sessionId: string, onStay?: () => void): Promise<void> => {
    if (!attemptId) {
      return;
    }

    try {
      await (deps?.saveAnswer ?? saveExamSimulationAnswer)(attemptId, question.id, sessionId);
    } catch (caught) {
      onStay?.();
      setError(EXAM_PRACTICAL_COPY.saveFailed(getSimulatorErrorMessage(caught)));

      return;
    }

    try {
      await router.push(buildSessionUrl(sessionId));
    } catch (caught) {
      // The session and the answer exist: "Continuar parte práctica" opens it again.
      onStay?.();
      console.warn("The exam simulation session could not be opened:", caught);
    }
  }, [attemptId, deps, question.id, router]);

  const start = useCallback(() => run(async() => {
    if (!attemptId) {
      return;
    }

    let session: StartedSession;

    try {
      const startSession = await (deps?.loadStart ?? defaultLoadStart)();

      session = await startSession({
        attemptId,
        questionId: question.id,
        evaluationId,
        caseId: question.clinicalCaseId,
        returnUrl,
        assistancePolicy,
      });
    } catch (caught) {
      setError(EXAM_PRACTICAL_COPY.startFailed(getSimulatorErrorMessage(caught)));

      return;
    }

    // Saved explicitly before leaving; the player only gets the link when the student stays on the exam (one PUT).
    await saveAndOpen(session.id, () => onChange({ ...(answer ?? EMPTY_ANSWER), simulationSessionId: session.id }));
  }), [answer, assistancePolicy, attemptId, deps, evaluationId, onChange, question.clinicalCaseId, question.id, returnUrl, run, saveAndOpen]);

  const continueSession = useCallback((sessionId: string) => run(async() => {
    if (attemptId && evaluationId) {
      (deps?.examReturn ?? examReturnStore).save(sessionId, { evaluationId, attemptId });
    }

    await saveAndOpen(sessionId);
  }), [attemptId, deps, evaluationId, run, saveAndOpen]);

  return { busy, error, start, continueSession };
}
