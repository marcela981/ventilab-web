/*
* Funcionalidad: Evaluations DTOs
* Descripción: Type aliases over the generated OpenAPI schemas of the student evaluation endpoints: my evaluations (MyEvaluationDTO with its summary and attempts), my published grades, the attempt start result, the attempt detail with its scenarios, questions, options, answers and media, the answer body and the AI feedback of a published attempt. Type-only module; depends on the generated api-client schema.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type MyEvaluationDTO = Schemas["MyEvaluationDTO"];
export type MyEvaluationSummaryDTO = Schemas["MyEvaluationSummaryDTO"];
export type MyEvaluationAttemptDTO = Schemas["MyEvaluationAttemptDTO"];
export type MyEvaluationGradeDTO = Schemas["MyEvaluationGradeDTO"];
export type StudentAttemptStartDTO = Schemas["StudentAttemptStartDTO"];
export type StudentAttemptDetailDTO = Schemas["StudentAttemptDetailDTO"];
export type StudentAttemptEvaluationDTO = Schemas["StudentAttemptEvaluationDTO"];
export type StudentScenarioDTO = Schemas["StudentScenarioDTO"];
export type StudentQuestionDTO = Schemas["StudentQuestionDTO"];
export type StudentOptionDTO = Schemas["StudentOptionDTO"];
export type StudentAnswerDTO = Schemas["StudentAnswerDTO"];
export type EvaluationMediaDTO = Schemas["EvaluationMediaDTO"];
export type SaveEvaluationAnswerDTO = Schemas["SaveEvaluationAnswerDTO"];
export type SubmitEvaluationAttemptResponseDTO = Schemas["SubmitEvaluationAttemptResponseDTO"];
export type StudentGradeFeedbackDTO = Schemas["StudentGradeFeedbackDTO"];
export type StudentGradeFeedbackItemDTO = Schemas["StudentGradeFeedbackItemDTO"];
