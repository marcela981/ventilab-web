/*
* Funcionalidad: Grading DTOs
* Descripción: Type aliases over the generated OpenAPI schemas used by the grading feature: the grading queue item and its student, plus the evaluation summaries and groups read to fill the queue filters. Types only. Depends on @shared/api-client/generated/schema.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type GradingQueueItemDTO = Schemas["GradingQueueItemDTO"];
export type GradingStudentDTO = Schemas["GradingStudentDTO"];
export type EvaluationSummaryDTO = Schemas["EvaluationSummaryDTO"];
export type GroupDTO = Schemas["GroupDTO"];
