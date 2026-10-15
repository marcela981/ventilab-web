/*
* Funcionalidad: Evaluation authoring DTOs
* Descripción: Type aliases over the generated OpenAPI schemas used by the evaluation authoring feature: the evaluation summary of `GET /api/evaluations`, the id returned by create and duplicate, and the status change body. Depends on @shared/api-client.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type EvaluationSummaryDTO = Schemas["EvaluationSummaryDTO"];
export type EvaluationIdDTO = Schemas["EvaluationIdDTO"];
export type ChangeEvaluationStatusDTO = Schemas["ChangeEvaluationStatusDTO"];
