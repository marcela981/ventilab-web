/*
* Funcionalidad: Exam attempt service (simulator side)
* Descripción: The two evaluation-attempt endpoints the EXAM practical part needs, both present in
*   openapi/openapi.json and called through the shared typed api-client (the evaluations feature is not imported):
*   GET /api/evaluation-attempts/{attemptId} for the attempt deadline and the server time (the console countdown runs
*   on the server clock) and PUT /api/evaluation-attempts/{attemptId}/answers/{questionId} with
*   `{ simulationSessionId }`, so the answer that links the exam session is saved before leaving the attempt player
*   (the player autosave also sends it; the PUT is idempotent). Depends on the api-client request helpers.
*   v1.1 (review of 180a0a1): `fetchAttemptServerClock` reads the attempt `serverNow` BODY field (readable
*   cross-origin, unlike the `Date` header) as the fallback server clock of the EXAM resume.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGet, apiPut } from "@shared/api-client/api-request";
import { monotonicNow } from "../../application/entities/sim-session.entity";
import type { ServerClock } from "../../application/entities/sim-session.entity";
import { readServerClock } from "./simulation-sessions.service";

export const EXAM_ATTEMPT_PATH = "/api/evaluation-attempts/{attemptId}";
export const EXAM_ATTEMPT_ANSWER_PATH = "/api/evaluation-attempts/{attemptId}/answers/{questionId}";

export type AttemptClock = {
  deadlineAt: string | null
  serverNow: string
};

export async function fetchAttemptClock(attemptId: string): Promise<AttemptClock> {
  const result = await apiGet(EXAM_ATTEMPT_PATH, { params: { attemptId } });

  return { deadlineAt: result.data.deadlineAt, serverNow: result.data.serverNow };
}

/**
 * Server clock from the attempt body (`serverNow`), stamped with the monotonic time the response arrived (the server
 * time was read before it, so the estimate errs on the safe, earlier side); null when the field is unusable.
 */
export async function fetchAttemptServerClock(attemptId: string, now: () => number = monotonicNow): Promise<ServerClock | null> {
  const clock = await fetchAttemptClock(attemptId);

  return readServerClock(clock.serverNow, now());
}

export async function saveExamSimulationAnswer(attemptId: string, questionId: string, simulationSessionId: string): Promise<void> {
  await apiPut(EXAM_ATTEMPT_ANSWER_PATH, { params: { attemptId, questionId }, body: { simulationSessionId } });
}
