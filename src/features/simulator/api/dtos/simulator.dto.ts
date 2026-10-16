/*
* Funcionalidad: Simulator DTOs
* Descripción: Backend contract types of the simulator feature, taken from the generated OpenAPI types (no hand-written shapes): the clinical case list item and summary, the full case definition, the simulation session start request/response and the session history item, plus the query parameters of the case list and the session history operations. Depends on the generated api-client schema.
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
export type CaseUserAttemptsDTO = Schemas["CaseUserAttemptsDTO"];
export type ClinicalCaseDefinitionDTO = Schemas["ClinicalCaseDefinitionDTO"];
export type StartSimulationSessionDTO = Schemas["StartSimulationSessionDTO"];
export type StartedSimulationSessionDTO = Schemas["StartedSimulationSessionDTO"];
export type SimulationSessionDTO = Schemas["SimulationSessionDTO"];

export type ClinicalCasesQueryDTO = NonNullable<operations["getClinicalCases"]["parameters"]["query"]>;
export type SimulationSessionsQueryDTO = NonNullable<operations["getSimulationSessions"]["parameters"]["query"]>;
