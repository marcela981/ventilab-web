/*
* Funcionalidad: Grading DTOs
* Descripción: Type aliases over the generated OpenAPI schemas used by the grading feature: the grading queue item and its student, plus the evaluation summaries and groups read to fill the queue filters. Types only. Depends on @shared/api-client/generated/schema. v1.1 (G2): the grading attempt (answers with auto/manual/earned scores, practical score, questions, scenarios and media), the grade-answer body and response, the publish response and the staff feedback DTOs. v1.2 (G3): the evaluation analytics (histogram buckets, question stats), the evaluation assignments with their attempt counts, the bulk publish body and response and the group dashboard rows that carry the published grades per student.
* Versión: 1.2
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
export type GradingAttemptDTO = Schemas["GradingAttemptDTO"];
export type GradingAnswerDTO = Schemas["GradingAnswerDTO"];
export type PracticalScoreDTO = Schemas["PracticalScoreDTO"];
export type GradingQuestionDTO = Schemas["EvaluationQuestionDTO"];
export type GradingOptionDTO = Schemas["EvaluationOptionDTO"];
export type GradingScenarioDTO = Schemas["EvaluationScenarioDTO"];
export type GradingMediaDTO = Schemas["EvaluationMediaDTO"];
export type GradeAnswerBodyDTO = Schemas["GradeEvaluationAnswerDTO"];
export type GradeAnswerResponseDTO = Schemas["GradeEvaluationAnswerResponseDTO"];
export type PublishAttemptGradeResponseDTO = Schemas["PublishAttemptGradeResponseDTO"];
export type GradeFeedbackDTO = Schemas["GradeFeedbackDTO"];
export type GradeFeedbackItemDTO = Schemas["GradeFeedbackItemDTO"];
export type GradeFeedbackRegenerationDTO = Schemas["GradeFeedbackRegenerationDTO"];
export type EvaluationAnalyticsDTO = Schemas["EvaluationAnalyticsDTO"];
export type GradeHistogramBucketDTO = Schemas["GradeHistogramBucketDTO"];
export type QuestionStatsDTO = Schemas["QuestionStatsDTO"];
export type EvaluationAssignmentDTO = Schemas["EvaluationAssignmentDTO"];
export type EvaluationAssignmentAttemptCountsDTO = Schemas["EvaluationAssignmentAttemptCountsDTO"];
export type PublishEvaluationGradesDTO = Schemas["PublishEvaluationGradesDTO"];
export type PublishGradesResponseDTO = Schemas["PublishGradesResponseDTO"];
export type GroupDashboardDTO = Schemas["GroupDashboardDTO"];
export type StudentDashboardRowDTO = Schemas["StudentDashboardRowDTO"];
export type StudentEvaluationGradeDTO = Schemas["StudentEvaluationGradeDTO"];
