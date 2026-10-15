/*
* Funcionalidad: Evaluations service
* Descripción: Backend calls of the student evaluations feature through the typed api-client: the SWR keys (paths) of the read endpoints used with useApiQuery (`GET /api/my-evaluations`, `/api/my-evaluations/grades`, `/api/evaluation-attempts/{attemptId}` and its `/feedback`), the answer and submit paths used by the attempt player, EVALUATION_QUERY_PATHS (keys refreshed after an attempt changes) and the startAttempt mutation (`POST /api/my-evaluations/{assignmentId}/attempts`, idempotent: it returns the attempt in progress when one exists). Errors reject with ApiError. Depends on @shared/api-client, the evaluations DTOs and mappers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPost } from "@shared/api-client/api-request";
import type { AttemptStart } from "../../application/entities/evaluation.entity";
import { toAttemptStart } from "../mappers/evaluations.mapper";

export const MY_EVALUATIONS_PATH = "/api/my-evaluations";
export const MY_GRADES_PATH = "/api/my-evaluations/grades";
export const START_ATTEMPT_PATH = "/api/my-evaluations/{assignmentId}/attempts";
export const ATTEMPT_PATH = "/api/evaluation-attempts/{attemptId}";
export const ATTEMPT_ANSWER_PATH = "/api/evaluation-attempts/{attemptId}/answers/{questionId}";
export const ATTEMPT_SUBMIT_PATH = "/api/evaluation-attempts/{attemptId}/submit";
export const ATTEMPT_FEEDBACK_PATH = "/api/evaluation-attempts/{attemptId}/feedback";

// Starting, submitting or a published grade can change any of these views (attempts, status, grade).
export const EVALUATION_QUERY_PATHS = [MY_EVALUATIONS_PATH, MY_GRADES_PATH, ATTEMPT_PATH] as const;

export async function startAttempt(assignmentId: string): Promise<AttemptStart> {
  const result = await apiPost(START_ATTEMPT_PATH, { params: { assignmentId } });

  return toAttemptStart(result.data);
}
