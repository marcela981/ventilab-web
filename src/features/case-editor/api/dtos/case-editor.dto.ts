/*
* Funcionalidad: Case editor DTOs
* Descripción: Contract types of the case editor feature, taken from the generated OpenAPI schema (never written by
*   hand): the list item and its query, the editable definition (GET /clinical-cases/{id}/definition), the create /
*   replace body (UpsertClinicalCaseDTO) and its blocks (history, mechanics, initial ventilator settings, initial
*   state, events, targets, rubric), the status change body and the id of a created or duplicated case. Depends on
*   the generated api-client schema.
* Versión: 1.0
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
export type ClinicalCaseHistoryDTO = Schemas["ClinicalCaseHistoryDTO"];
export type ClinicalCaseMechanicsDTO = Schemas["ClinicalCaseMechanicsDTO"];
export type ClinicalCaseVentilatorSettingsDTO = Schemas["ClinicalCaseVentilatorSettingsDTO"];
export type ClinicalCaseInitialStateDTO = Schemas["ClinicalCaseInitialStateDTO"];
export type ClinicalCaseEventDTO = Schemas["ClinicalCaseEventDTO"];
export type ClinicalCaseTargetsDTO = Schemas["ClinicalCaseTargetsDTO"];
export type CaseTargetRangeDTO = Schemas["CaseTargetRangeDTO"];
export type ClinicalCaseRubricDTO = Schemas["ClinicalCaseRubricDTO"];
export type ChangeClinicalCaseStatusDTO = Schemas["ChangeClinicalCaseStatusDTO"];
export type ClinicalCaseIdDTO = Schemas["ClinicalCaseIdDTO"];

export type ClinicalCasesQueryDTO = NonNullable<operations["getClinicalCases"]["parameters"]["query"]>;
