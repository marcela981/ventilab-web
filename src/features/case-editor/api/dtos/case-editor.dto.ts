/*
* Funcionalidad: Case editor DTOs
* Descripción: Contract types of the case editor feature, taken from the generated OpenAPI schema (never written by v1.2 (B3.10): unused aliases removed (ClinicalCaseHistoryDTO, ClinicalCaseVentilatorSettingsDTO, ClinicalCaseInitialStateDTO, CaseTargetRangeDTO, ClinicalCaseIdDTO).
*   hand): the list item and its query, the editable definition (GET /clinical-cases/{id}/definition), the create /
*   replace body (UpsertClinicalCaseDTO) and its blocks (history, mechanics, initial ventilator settings, initial
*   state, events, targets, rubric), the status change body and the id of a created or duplicated case. Depends on
*   the generated api-client schema. v1.1 (T12): the test-run request and result.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components, operations } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type ClinicalCaseListItemDTO = Schemas["ClinicalCaseListItemDTO"];
export type ClinicalCaseSummaryDTO = Schemas["ClinicalCaseSummaryDTO"];
export type ClinicalCaseDefinitionDTO = Schemas["ClinicalCaseDefinitionDTO"];
export type UpsertClinicalCaseDTO = Schemas["UpsertClinicalCaseDTO"];
export type ClinicalCaseMechanicsDTO = Schemas["ClinicalCaseMechanicsDTO"];
export type ClinicalCaseEventDTO = Schemas["ClinicalCaseEventDTO"];
export type ClinicalCaseTargetsDTO = Schemas["ClinicalCaseTargetsDTO"];
export type ClinicalCaseRubricDTO = Schemas["ClinicalCaseRubricDTO"];
export type ChangeClinicalCaseStatusDTO = Schemas["ChangeClinicalCaseStatusDTO"];
export type ClinicalCaseTestRunRequestDTO = Schemas["ClinicalCaseTestRunRequestDTO"];
export type ClinicalCaseTestRunDTO = Schemas["ClinicalCaseTestRunDTO"];

export type ClinicalCasesQueryDTO = NonNullable<operations["getClinicalCases"]["parameters"]["query"]>;
