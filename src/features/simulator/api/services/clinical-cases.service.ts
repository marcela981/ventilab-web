/*
* Funcionalidad: Clinical cases service (simulator)
* Descripción: Clinical case endpoints the simulator reads, all present in openapi/openapi.json: the paginated list GET /api/clinical-cases (only published cases for students; server-side pathology, difficulty and ids filters) and the full definition GET /api/clinical-cases/{caseId}/definition (requires clinical-cases:manage, minimum TEACHER). Paths are the generated OpenAPI keys; the shared client resolves them against the backend origin. Depends on the api-client request helpers, the simulator DTOs and the catalog query entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGet } from "@shared/api-client/api-request";
import type { CatalogQuery } from "../../application/entities/simulator.entity";
import type { ClinicalCaseDefinitionDTO, ClinicalCasesQueryDTO } from "../dtos/simulator.dto";

export const CLINICAL_CASES_PATH = "/api/clinical-cases";
export const CLINICAL_CASE_DEFINITION_PATH = "/api/clinical-cases/{caseId}/definition";

export function clinicalCasesQuery(query: CatalogQuery): ClinicalCasesQueryDTO {
  return { ...query };
}

/** Query of the published cases with these ids (comma-separated, as the contract accepts). */
export function clinicalCasesByIdsQuery(caseIds: readonly string[]): ClinicalCasesQueryDTO {
  return { ids: caseIds.join(","), page: 1, limit: caseIds.length };
}

export async function fetchCaseDefinition(caseId: string): Promise<ClinicalCaseDefinitionDTO> {
  const result = await apiGet(CLINICAL_CASE_DEFINITION_PATH, { params: { caseId } });

  return result.data;
}
