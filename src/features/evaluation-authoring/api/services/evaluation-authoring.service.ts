/*
* Funcionalidad: Evaluation authoring service
* Descripción: Backend calls of the evaluation authoring feature through the typed api-client: the SWR keys (paths) of the read endpoints used with useApiQuery (`GET /api/evaluations`, `/api/evaluations/{id}`, `/api/evaluations/{id}/assignments`), EVALUATION_AUTHORING_QUERY_PATHS (the keys every authoring mutation invalidates) and the list mutations: change the status (`PATCH /api/evaluations/{id}/status`, used to archive) and duplicate (`POST /api/evaluations/{id}/duplicate`, returns the id of the copy). Errors reject with ApiError. Depends on @shared/api-client and the authoring DTOs. v1.1 (A2): adds the builder calls: create (`POST /api/evaluations`, returns the new id) and update (`PATCH /api/evaluations/{id}`) an evaluation; add, update and remove scenarios, questions and options (each add returns the new id); the batch reorders `PUT .../scenarios/order`, `PUT .../questions/order` (items may move a question to another scenario) and `PUT .../questions/{questionId}/options/order`. v1.2 (A3): CLINICAL_CASES_PATH (`GET /api/clinical-cases`) for the clinical case selector. v1.3 (A4): assignment calls: activate (`POST /api/evaluations/{id}/assignments` with {groupIds, startsAt, endsAt}, returns the created ids), close now (`POST .../assignments/{assignmentId}/close`) and delete (`DELETE .../assignments/{assignmentId}`, only without attempts); STAFF_GROUPS_PATH (`GET /api/groups`) for the groups the caller manages.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiDelete, apiPatch, apiPost, apiPut } from "@shared/api-client/api-request";
import type {
  ChangeEvaluationStatusDTO,
  CreateEvaluationAssignmentsDTO,
  CreateEvaluationDTO,
  CreateEvaluationOptionDTO,
  CreateEvaluationQuestionDTO,
  CreateEvaluationScenarioDTO,
  QuestionReorderItemDTO,
  ReorderItemDTO,
  UpdateEvaluationDTO,
  UpdateEvaluationOptionDTO,
  UpdateEvaluationQuestionDTO,
  UpdateEvaluationScenarioDTO,
} from "../dtos/evaluation-authoring.dto";

export const EVALUATIONS_PATH = "/api/evaluations";
export const EVALUATION_PATH = "/api/evaluations/{id}";
export const EVALUATION_STATUS_PATH = "/api/evaluations/{id}/status";
export const EVALUATION_DUPLICATE_PATH = "/api/evaluations/{id}/duplicate";
export const EVALUATION_ASSIGNMENTS_PATH = "/api/evaluations/{id}/assignments";
export const EVALUATION_ASSIGNMENT_PATH = "/api/evaluations/{id}/assignments/{assignmentId}";
export const EVALUATION_ASSIGNMENT_CLOSE_PATH = "/api/evaluations/{id}/assignments/{assignmentId}/close";
// Teachers get the student groups they created or supervise; admins get every group.
export const STAFF_GROUPS_PATH = "/api/groups";
export const EVALUATION_SCENARIOS_PATH = "/api/evaluations/{id}/scenarios";
export const EVALUATION_SCENARIO_PATH = "/api/evaluations/{id}/scenarios/{scenarioId}";
export const EVALUATION_SCENARIOS_ORDER_PATH = "/api/evaluations/{id}/scenarios/order";
export const EVALUATION_QUESTIONS_PATH = "/api/evaluations/{id}/questions";
export const EVALUATION_QUESTION_PATH = "/api/evaluations/{id}/questions/{questionId}";
export const EVALUATION_QUESTIONS_ORDER_PATH = "/api/evaluations/{id}/questions/order";
export const EVALUATION_OPTIONS_PATH = "/api/evaluations/{id}/questions/{questionId}/options";
export const EVALUATION_OPTION_PATH = "/api/evaluations/{id}/questions/{questionId}/options/{optionId}";
export const EVALUATION_OPTIONS_ORDER_PATH = "/api/evaluations/{id}/questions/{questionId}/options/order";
// Read with useApiQuery by the clinical case selector of SIMULATION questions (status=PUBLISHED, or ids for the chosen case).
export const CLINICAL_CASES_PATH = "/api/clinical-cases";

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

export async function createEvaluation(body: CreateEvaluationDTO): Promise<string> {
  const result = await apiPost(EVALUATIONS_PATH, { body });

  return result.data.id;
}

export async function updateEvaluation(id: string, body: UpdateEvaluationDTO): Promise<void> {
  await apiPatch(EVALUATION_PATH, { params: { id }, body });
}

export async function addScenario(id: string, body: CreateEvaluationScenarioDTO): Promise<string> {
  const result = await apiPost(EVALUATION_SCENARIOS_PATH, { params: { id }, body });

  return result.data.id;
}

export async function updateScenario(id: string, scenarioId: string, body: UpdateEvaluationScenarioDTO): Promise<void> {
  await apiPatch(EVALUATION_SCENARIO_PATH, { params: { id, scenarioId }, body });
}

export async function removeScenario(id: string, scenarioId: string): Promise<void> {
  await apiDelete(EVALUATION_SCENARIO_PATH, { params: { id, scenarioId } });
}

export async function reorderScenarios(id: string, items: ReorderItemDTO[]): Promise<void> {
  await apiPut(EVALUATION_SCENARIOS_ORDER_PATH, { params: { id }, body: { items } });
}

export async function addQuestion(id: string, body: CreateEvaluationQuestionDTO): Promise<string> {
  const result = await apiPost(EVALUATION_QUESTIONS_PATH, { params: { id }, body });

  return result.data.id;
}

export async function updateQuestion(id: string, questionId: string, body: UpdateEvaluationQuestionDTO): Promise<void> {
  await apiPatch(EVALUATION_QUESTION_PATH, { params: { id, questionId }, body });
}

export async function removeQuestion(id: string, questionId: string): Promise<void> {
  await apiDelete(EVALUATION_QUESTION_PATH, { params: { id, questionId } });
}

export async function reorderQuestions(id: string, items: QuestionReorderItemDTO[]): Promise<void> {
  await apiPut(EVALUATION_QUESTIONS_ORDER_PATH, { params: { id }, body: { items } });
}

export async function addOption(id: string, questionId: string, body: CreateEvaluationOptionDTO): Promise<string> {
  const result = await apiPost(EVALUATION_OPTIONS_PATH, { params: { id, questionId }, body });

  return result.data.id;
}

export async function updateOption(id: string, questionId: string, optionId: string, body: UpdateEvaluationOptionDTO): Promise<void> {
  await apiPatch(EVALUATION_OPTION_PATH, { params: { id, questionId, optionId }, body });
}

export async function removeOption(id: string, questionId: string, optionId: string): Promise<void> {
  await apiDelete(EVALUATION_OPTION_PATH, { params: { id, questionId, optionId } });
}

export async function reorderOptions(id: string, questionId: string, items: ReorderItemDTO[]): Promise<void> {
  await apiPut(EVALUATION_OPTIONS_ORDER_PATH, { params: { id, questionId }, body: { items } });
}

export async function activateEvaluation(id: string, body: CreateEvaluationAssignmentsDTO): Promise<string[]> {
  const result = await apiPost(EVALUATION_ASSIGNMENTS_PATH, { params: { id }, body });

  return result.data.ids;
}

export async function closeAssignment(id: string, assignmentId: string): Promise<void> {
  await apiPost(EVALUATION_ASSIGNMENT_CLOSE_PATH, { params: { id, assignmentId } });
}

export async function deleteAssignment(id: string, assignmentId: string): Promise<void> {
  await apiDelete(EVALUATION_ASSIGNMENT_PATH, { params: { id, assignmentId } });
}
