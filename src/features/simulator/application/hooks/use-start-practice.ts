/*
* Funcionalidad: useStartPractice
* Descripción: Starts a FREE practice of a clinical case (POST /api/simulation/sessions with mode FREE, the case id and the time multiplier, default ×1 from the contract) and navigates to the session console /simulator/sessions/[id]. One start at a time (a second call while pending returns busy); the pending case id drives the card's loading state and a failure is reported per case with its Spanish message. A started session revalidates the session history. v1.1 (T6): the start response is saved in the session store (fresh record with mode FREE and the clinical case id) before navigating, so the console boots without asking the server. Depends on next/router, SWR, the sessions service, the simulator routes, config and error messages.
* Versión: 1.1
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

export type StartPracticeError = { caseId: string, message: string };

export type UseStartPracticeResult = {
  pendingCaseId: string | null
  error: StartPracticeError | null
  start: (caseId: string, timeMultiplier?: TimeMultiplier) => Promise<StartPracticeOutcome>
};

export function useStartPractice(): UseStartPracticeResult {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const pendingRef = useRef(false);
  const [pendingCaseId, setPendingCaseId] = useState<string | null>(null);
  const [error, setError] = useState<StartPracticeError | null>(null);

  const start = useCallback(async(caseId: string, timeMultiplier: TimeMultiplier = DEFAULT_TIME_MULTIPLIER): Promise<StartPracticeOutcome> => {
    if (pendingRef.current) {
      return { status: "busy" };
    }

    pendingRef.current = true;
    setPendingCaseId(caseId);
    setError(null);

    try {
      const session = await startSimulationSession({ mode: "FREE", caseId, timeMultiplier });

      if (isEngineCase(session.engineCase)) {
        sessionStore.save({
          id: session.id,
          mode: "FREE",
          seed: session.seed,
          engineVersion: session.engineVersion,
          timeMultiplier: toTimeMultiplier(session.timeMultiplier),
          expiresAt: session.expiresAt,
          engineCase: session.engineCase,
          caseId,
          fresh: true,
        });
      }

      // The session exists; a failed refresh only leaves the history stale.
      await invalidateApiQueries(mutate, [SIMULATION_SESSION_HISTORY_PATH]).catch(() => undefined);
      await router.push(buildSessionUrl(session.id));

      return { status: "success", session };
    } catch (caught) {
      const message = getSimulatorErrorMessage(caught);
      setError({ caseId, message });

      return { status: "error", message };
    } finally {
      pendingRef.current = false;
      setPendingCaseId(null);
    }
  }, [mutate, router]);

  return { pendingCaseId, error, start };
}
