/*
* Funcionalidad: Case editor service
* Descripción: Backend calls of the case editor through the typed api-client (teachers and admins hold
*   clinical-cases:manage): the SWR keys of the read endpoints (GET /api/clinical-cases list with the status,
*   pathology and difficulty filters and pagination; GET /api/clinical-cases/{caseId}/definition), the keys every
*   case mutation invalidates, and the writes: create (POST, returns the new id), replace (PUT), duplicate
*   (POST /duplicate, returns the id of the copy) and change the status (PATCH /status). Errors reject with ApiError.
*   Depends on @shared/api-client and the case editor DTOs. v1.1 (T12): delete (DELETE, 409 when the case is in use),
*   mark as validated by an expert (PATCH /expert-validation, no body, clinical-cases:validate) and the test run
*   (POST /test-run with the simulated seconds and an optional seed; returns the metrics timeline of the stored case).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiDelete, apiPatch, apiPost, apiPut } from "@shared/api-client/api-request";
import type {
  ChangeClinicalCaseStatusDTO,
  ClinicalCaseTestRunDTO,
  ClinicalCaseTestRunRequestDTO,
  UpsertClinicalCaseDTO,
} from "../dtos/case-editor.dto";

export const CASES_PATH = "/api/clinical-cases";
export const CASE_PATH = "/api/clinical-cases/{caseId}";
export const CASE_DEFINITION_PATH = "/api/clinical-cases/{caseId}/definition";
export const CASE_DUPLICATE_PATH = "/api/clinical-cases/{caseId}/duplicate";
export const CASE_STATUS_PATH = "/api/clinical-cases/{caseId}/status";
export const CASE_VALIDATION_PATH = "/api/clinical-cases/{caseId}/expert-validation";
export const CASE_TEST_RUN_PATH = "/api/clinical-cases/{caseId}/test-run";

/** Read keys refreshed after every case mutation (list, detail and definition). */
export const CASE_EDITOR_QUERY_PATHS = [CASES_PATH, CASE_PATH, CASE_DEFINITION_PATH] as const;

export async function createClinicalCase(body: UpsertClinicalCaseDTO): Promise<string> {
  const result = await apiPost(CASES_PATH, { body });

  return result.data.id;
}

export async function replaceClinicalCase(caseId: string, body: UpsertClinicalCaseDTO): Promise<void> {
  await apiPut(CASE_PATH, { params: { caseId }, body });
}

export async function duplicateClinicalCase(caseId: string): Promise<string> {
  const result = await apiPost(CASE_DUPLICATE_PATH, { params: { caseId } });

  return result.data.id;
}

export async function changeClinicalCaseStatus(caseId: string, status: ChangeClinicalCaseStatusDTO["status"]): Promise<void> {
  await apiPatch(CASE_STATUS_PATH, { params: { caseId }, body: { status } });
}

export async function deleteClinicalCase(caseId: string): Promise<void> {
  await apiDelete(CASE_PATH, { params: { caseId } });
}

export async function validateClinicalCase(caseId: string): Promise<void> {
  await apiPatch(CASE_VALIDATION_PATH, { params: { caseId } });
}

/** Up to 1800 simulated seconds run on the server: the slow timeout applies, and the caller may abort. */
export async function runClinicalCaseTest(
  caseId: string,
  body: ClinicalCaseTestRunRequestDTO,
  signal?: AbortSignal,
): Promise<ClinicalCaseTestRunDTO> {
  const result = await apiPost(CASE_TEST_RUN_PATH, { params: { caseId }, body, timeout: "slow", ...(signal ? { signal } : {}) });

  return result.data;
}
