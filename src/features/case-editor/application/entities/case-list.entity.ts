/*
* Funcionalidad: Case list entities
* Descripción: Pure rules of the staff case list: the filters (status, pathology, difficulty; "" = all) and their
*   server query (GET /api/clinical-cases accepts status, pathology, difficulty, page, limit and sortOrder; staff get
*   every status unless filtered), the row read model and the row status. The list summary has no status and no
*   expert-validation flag (BACKEND GAP: only GET /definition has them, and fetching it per row is not done), so a row
*   knows its status only while the list is filtered by one status, and there is no validation filter or badge. The
*   status actions offered per known status. Depends on the case editor config and DTOs.
*   v1.1 (review of 50ed812): an unknown status (unfiltered list) offers no status action; the page asks to filter by
*   status to publish or archive, since the change could otherwise target a case already in that status.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ClinicalCaseListItemDTO, ClinicalCasesQueryDTO } from "../../api/dtos/case-editor.dto";
import type { CaseDifficulty, CasePathology, CaseStatus } from "../config/case-editor.config";

export type CaseListFilters = {
  status: CaseStatus | ""
  pathology: CasePathology | ""
  difficulty: CaseDifficulty | ""
};

export const NO_CASE_LIST_FILTERS: CaseListFilters = { status: "", pathology: "", difficulty: "" };

export function hasCaseListFilters(filters: CaseListFilters): boolean {
  return filters.status !== "" || filters.pathology !== "" || filters.difficulty !== "";
}

export function toCaseListQuery(filters: CaseListFilters, page: number, limit: number): ClinicalCasesQueryDTO {
  const query: ClinicalCasesQueryDTO = { page, limit, sortOrder: "desc" };

  if (filters.status !== "") {
    query.status = filters.status;
  }

  if (filters.pathology !== "") {
    query.pathology = filters.pathology;
  }

  if (filters.difficulty !== "") {
    query.difficulty = filters.difficulty;
  }

  return query;
}

export type CaseListRow = {
  id: string
  title: string
  description: string
  pathology: string
  difficulty: string
  mainDiagnosis: string
  /** Known only while the list is filtered by one status (the summary has no status). */
  status: CaseStatus | null
};

export function toCaseListRow(item: ClinicalCaseListItemDTO, statusFilter: CaseStatus | ""): CaseListRow {
  const { clinicalCase } = item;

  return {
    id: clinicalCase.id,
    title: clinicalCase.title,
    description: clinicalCase.description,
    pathology: clinicalCase.pathology,
    difficulty: clinicalCase.difficulty,
    mainDiagnosis: clinicalCase.mainDiagnosis,
    status: statusFilter === "" ? null : statusFilter,
  };
}

export type StatusAction = "publish" | "archive";

export const STATUS_ACTION_TARGET: Readonly<Record<StatusAction, CaseStatus>> = { publish: "PUBLISHED", archive: "ARCHIVED" };

/**
 * Status changes offered for a row: a draft can be published or archived, a published case archived, an archived one
 * published again. An unknown status (the unfiltered list) offers none.
 */
export function statusActionsFor(status: CaseStatus | null): StatusAction[] {
  if (status === null) {
    return [];
  }

  if (status === "PUBLISHED") {
    return ["archive"];
  }

  if (status === "ARCHIVED") {
    return ["publish"];
  }

  return ["publish", "archive"];
}
