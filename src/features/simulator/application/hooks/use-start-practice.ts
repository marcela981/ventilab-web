/*
* Funcionalidad: useStartPractice
* Descripción: Starts a FREE practice of a clinical case (POST /api/simulation/sessions with mode FREE, the case id and the time multiplier, default ×1 from the contract) and navigates to the session console /simulator/sessions/[id]. One start at a time (a second call while pending returns busy); the pending case id drives the card's loading state and a failure is reported per case with its Spanish message. A started session revalidates the session history. v1.1 (T6): the start response is saved in the session store (fresh record with mode FREE and the clinical case id) before navigating, so the console boots without asking the server. v1.2: only the POST belongs to the start error; once the session exists, a failed navigation is logged and the start still succeeds (the session can be resumed from "Mis sesiones"). v1.3: the stored record keeps `startedAt` (wall-clock resume after a reload). v1.4 (W5, Bloque 1): an optional `onStarted` replaces the navigation to the console (the /simulador workspace opens the session in its Monitoreo tab instead). v1.5 (W6, Bloque 1): the stored record keeps the own patient of the started session, when it has one. Depends on next/router, SWR, the sessions service, the simulator routes, config and error messages.
*   v1.6 (W8, Bloque 1): `startWithPatient(patient, { caseId? })` starts a FREE session with an own simulated patient
*   (without caseId the server picks the base case of its condition; the stored record then keeps the case id of the
*   returned engine case). Both starts share the one-at-a-time guard; `isPending` reports either, and the error of a
*   patient start without a case has `caseId: null`. `start(caseId)` keeps its behaviour.
* Versión: 1.6
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { useCallback, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import type { SimulatedPatientDTO, StartSimulationSessionDTO } from "../../api/dtos/simulator.dto";
import { SIMULATION_SESSION_HISTORY_PATH, startSimulationSession } from "../../api/services/simulation-sessions.service";
import { DEFAULT_TIME_MULTIPLIER } from "../config/simulator.config";
import type { TimeMultiplier } from "../config/simulator.config";
import { buildSessionUrl } from "../config/simulator.routes";
import type { StartedSession } from "../entities/simulator.entity";
import { isEngineCase, toTimeMultiplier } from "../entities/sim-session.entity";
import { getSimulatorErrorMessage } from "../entities/simulator-error-messages";
import { sessionStore } from "../session/session-store";

export type StartPracticeOutcome =
  | { status: "success", session: StartedSession }
  | { status: "error", message: string }
  | { status: "busy" };

/** A failed start: its case (null for an own patient started without a case) and the Spanish message. */
export type StartPracticeError = { caseId: string | null, message: string };

export type StartWithPatientOptions = {
  /** Base case loaded into the form; without it the server picks the base case of the patient's condition. */
  caseId?: string | undefined
  timeMultiplier?: TimeMultiplier | undefined
};

export type UseStartPracticeResult = {
  pendingCaseId: string | null
  /** A start (of a case or of an own patient) is in flight. */
  isPending: boolean
  error: StartPracticeError | null
  start: (caseId: string, timeMultiplier?: TimeMultiplier) => Promise<StartPracticeOutcome>
  startWithPatient: (patient: SimulatedPatientDTO, options?: StartWithPatientOptions) => Promise<StartPracticeOutcome>
};

export type UseStartPracticeOptions = {
  /** Replaces the navigation to the session console once the session exists (the workspace opens it in place). */
  onStarted?: ((session: StartedSession) => void | Promise<void>) | undefined
};

type StartRequest = { caseId?: string | undefined, timeMultiplier: TimeMultiplier, patient?: SimulatedPatientDTO | undefined };

function startBody({ caseId, timeMultiplier, patient }: StartRequest): StartSimulationSessionDTO {
  return {
    mode: "FREE",
    ...(caseId === undefined ? {} : { caseId }),
    timeMultiplier,
    ...(patient === undefined ? {} : { patient }),
  };
}

export function useStartPractice({ onStarted }: UseStartPracticeOptions = {}): UseStartPracticeResult {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const pendingRef = useRef(false);
  const [pendingCaseId, setPendingCaseId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<StartPracticeError | null>(null);

  const run = useCallback(async(request: StartRequest): Promise<StartPracticeOutcome> => {
    if (pendingRef.current) {
      return { status: "busy" };
    }

    const caseId = request.caseId ?? null;

    pendingRef.current = true;
    setPendingCaseId(caseId);
    setIsPending(true);
    setError(null);

    let session: StartedSession;

    // Only the POST can fail the start.
    try {
      session = await startSimulationSession(startBody(request));
    } catch (caught) {
      const message = getSimulatorErrorMessage(caught);

      setError({ caseId, message });
      pendingRef.current = false;
      setPendingCaseId(null);
      setIsPending(false);

      return { status: "error", message };
    }

    try {
      if (isEngineCase(session.engineCase)) {
        sessionStore.save({
          id: session.id,
          mode: "FREE",
          seed: session.seed,
          engineVersion: session.engineVersion,
          timeMultiplier: toTimeMultiplier(session.timeMultiplier),
          expiresAt: session.expiresAt,
          startedAt: session.startedAt,
          engineCase: session.engineCase,
          // An own patient without a case runs on the base case the server picked.
          caseId: caseId ?? session.engineCase.id,
          fresh: true,
          ...(session.patient ? { patient: session.patient } : {}),
        });
      }

      // The session exists; a failed refresh only leaves the history stale.
      await invalidateApiQueries(mutate, [SIMULATION_SESSION_HISTORY_PATH]).catch(() => undefined);
      if (onStarted) {
        await onStarted(session);
      } else {
        await router.push(buildSessionUrl(session.id));
      }
    } catch (caught) {
      // The session exists (it can be resumed from "Mis sesiones"): a navigation failure is not a start failure.
      console.warn("The simulation session started but the console could not be opened:", caught);
    } finally {
      pendingRef.current = false;
      setPendingCaseId(null);
      setIsPending(false);
    }

    return { status: "success", session };
  }, [mutate, onStarted, router]);

  const start = useCallback(
    (caseId: string, timeMultiplier: TimeMultiplier = DEFAULT_TIME_MULTIPLIER) => run({ caseId, timeMultiplier }),
    [run],
  );

  const startWithPatient = useCallback(
    (patient: SimulatedPatientDTO, { caseId, timeMultiplier = DEFAULT_TIME_MULTIPLIER }: StartWithPatientOptions = {}) =>
      run({ caseId, timeMultiplier, patient }),
    [run],
  );

  return { pendingCaseId, isPending, error, start, startWithPatient };
}
