/*
* Funcionalidad: Evaluation authoring service
* Descripción: Backend calls of the evaluation authoring feature through the typed api-client: the SWR keys (paths) of the read endpoints used with useApiQuery (`GET /api/evaluations`, `/api/evaluations/{id}`, `/api/evaluations/{id}/assignments`), EVALUATION_AUTHORING_QUERY_PATHS (the keys every authoring mutation invalidates) and the list mutations: change the status (`PATCH /api/evaluations/{id}/status`, used to archive) and duplicate (`POST /api/evaluations/{id}/duplicate`, returns the id of the copy). Errors reject with ApiError. Depends on @shared/api-client and the authoring DTOs.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPatch, apiPost } from "@shared/api-client/api-request";
import type { ChangeEvaluationStatusDTO } from "../dtos/evaluation-authoring.dto";

export const EVALUATIONS_PATH = "/api/evaluations";
export const EVALUATION_PATH = "/api/evaluations/{id}";
export const EVALUATION_STATUS_PATH = "/api/evaluations/{id}/status";
export const EVALUATION_DUPLICATE_PATH = "/api/evaluations/{id}/duplicate";
export const EVALUATION_ASSIGNMENTS_PATH = "/api/evaluations/{id}/assignments";

// Every authoring mutation can change the list (status, counts, new copies), the detail and the activations.
export const EVALUATION_AUTHORING_QUERY_PATHS = [
  EVALUATIONS_PATH,
  EVALUATION_PATH,
  EVALUATION_ASSIGNMENTS_PATH,
] as const;

export async function changeEvaluationStatus(id: string, status: ChangeEvaluationStatusDTO["status"]): Promise<void> {
  await apiPatch(EVALUATION_STATUS_PATH, { params: { id }, body: { status } });
}

export async function duplicateEvaluation(id: string): Promise<string> {
  const result = await apiPost(EVALUATION_DUPLICATE_PATH, { params: { id } });

  return result.data.id;
}
