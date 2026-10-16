/*
* Funcionalidad: Case editor service
* Descripción: Backend calls of the case editor through the typed api-client (teachers and admins hold
*   clinical-cases:manage): the SWR keys of the read endpoints (GET /api/clinical-cases list with the status,
*   pathology and difficulty filters and pagination; GET /api/clinical-cases/{caseId}/definition), the keys every
*   case mutation invalidates, and the writes: create (POST, returns the new id), replace (PUT), duplicate
*   (POST /duplicate, returns the id of the copy) and change the status (PATCH /status). Errors reject with ApiError.
*   Test-run, expert validation and delete belong to T12. Depends on @shared/api-client and the case editor DTOs.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPatch, apiPost, apiPut } from "@shared/api-client/api-request";
import type { ChangeClinicalCaseStatusDTO, UpsertClinicalCaseDTO } from "../dtos/case-editor.dto";

export const CASES_PATH = "/api/clinical-cases";
export const CASE_PATH = "/api/clinical-cases/{caseId}";
export const CASE_DEFINITION_PATH = "/api/clinical-cases/{caseId}/definition";
export const CASE_DUPLICATE_PATH = "/api/clinical-cases/{caseId}/duplicate";
export const CASE_STATUS_PATH = "/api/clinical-cases/{caseId}/status";

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
