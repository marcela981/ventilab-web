/*
* Funcionalidad: Clinical cases service (simulator)
* Descripción: Clinical case endpoints the simulator reads, all present in openapi/openapi.json: the paginated list GET /api/clinical-cases (only published cases for students; server-side pathology, difficulty and ids filters) and the full definition GET /api/clinical-cases/{caseId}/definition (requires clinical-cases:manage, minimum TEACHER). Paths are the generated OpenAPI keys; the shared client resolves them against the backend origin. v1.1 (T6): fetchClinicalCase → GET /api/clinical-cases/{caseId} (basic fields, every role) for the session case panel. v1.2: the catalog query always sends status=PUBLISHED, so staff (clinical-cases:manage) do not see DRAFT or ARCHIVED cases in the catalog. v1.3 (B3.10): the unused fetchClinicalCase is removed; the case panel and the exam slot read CLINICAL_CASE_PATH through useApiQuery. Depends on the api-client request helpers, the simulator DTOs and the catalog query entity.
*   v1.4 (W8, Bloque 1): fetchCasePatientPreset reads the case detail GET /api/clinical-cases/{caseId} (its `patient`
*   block is readable by students) and maps it to the patient preset that fills the Simular Paciente form.
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGet } from "@shared/api-client/api-request";
import type { CasePatientPreset } from "../../application/entities/sim-patient.entity";
import type { CatalogQuery } from "../../application/entities/simulator.entity";
import type { ClinicalCaseDefinitionDTO, ClinicalCasesQueryDTO } from "../dtos/simulator.dto";
import { toCasePatientPreset } from "../mappers/simulator.mapper";

export const CLINICAL_CASES_PATH = "/api/clinical-cases";
export const CLINICAL_CASE_PATH = "/api/clinical-cases/{caseId}";
export const CLINICAL_CASE_DEFINITION_PATH = "/api/clinical-cases/{caseId}/definition";

/**
 * Catalog query: always asks for PUBLISHED cases. The contract accepts `status` from every caller (students always get
 * published cases anyway), and without it holders of clinical-cases:manage would also get DRAFT and ARCHIVED cases.
 */
export function clinicalCasesQuery(query: CatalogQuery): ClinicalCasesQueryDTO {
  return { ...query, status: "PUBLISHED" };
}

/** Query of the published cases with these ids (comma-separated, as the contract accepts). */
export function clinicalCasesByIdsQuery(caseIds: readonly string[]): ClinicalCasesQueryDTO {
  return { ids: caseIds.join(","), page: 1, limit: caseIds.length };
}

export async function fetchCaseDefinition(caseId: string): Promise<ClinicalCaseDefinitionDTO> {
  const result = await apiGet(CLINICAL_CASE_DEFINITION_PATH, { params: { caseId } });

  return result.data;
}

/** Patient of a published clinical case (GET /api/clinical-cases/{caseId}, every role) for "Cargar caso". */
export async function fetchCasePatientPreset(caseId: string): Promise<CasePatientPreset> {
  const result = await apiGet(CLINICAL_CASE_PATH, { params: { caseId } });

  return toCasePatientPreset(result.data);
}
