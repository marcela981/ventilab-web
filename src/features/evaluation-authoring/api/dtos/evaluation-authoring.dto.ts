/*
* Funcionalidad: Evaluation authoring DTOs
* Descripción: Type aliases over the generated OpenAPI schemas used by the evaluation authoring feature: the evaluation summary of `GET /api/evaluations`, the id returned by create and duplicate, and the status change body. Depends on @shared/api-client. v1.1 (A2): adds the builder schemas: the evaluation detail (scenarios, questions, options, media, readiness issues, usage), the create/update bodies of evaluations, scenarios, questions and options, and the reorder items. v1.2 (A3): ClinicalCaseListItemDTO of `GET /api/clinical-cases` for the case selector of SIMULATION questions. v1.3 (A4): the assignment schemas (EvaluationAssignmentDTO, its attempt counts, the activation body and the created ids) and GroupDTO of `GET /api/groups` for the activation dialog.
* Versión: 1.3
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

export type EvaluationDetailDTO = Schemas["EvaluationDetailDTO"];
export type EvaluationScenarioDTO = Schemas["EvaluationScenarioDTO"];
export type EvaluationQuestionDTO = Schemas["EvaluationQuestionDTO"];
export type EvaluationOptionDTO = Schemas["EvaluationOptionDTO"];
export type EvaluationMediaDTO = Schemas["EvaluationMediaDTO"];
export type EvaluationReadinessIssueDTO = Schemas["EvaluationReadinessIssueDTO"];
export type CreateEvaluationDTO = Schemas["CreateEvaluationDTO"];
export type UpdateEvaluationDTO = Schemas["UpdateEvaluationDTO"];
export type CreateEvaluationScenarioDTO = Schemas["CreateEvaluationScenarioDTO"];
export type UpdateEvaluationScenarioDTO = Schemas["UpdateEvaluationScenarioDTO"];
export type CreateEvaluationQuestionDTO = Schemas["CreateEvaluationQuestionDTO"];
export type UpdateEvaluationQuestionDTO = Schemas["UpdateEvaluationQuestionDTO"];
export type CreateEvaluationOptionDTO = Schemas["CreateEvaluationOptionDTO"];
export type UpdateEvaluationOptionDTO = Schemas["UpdateEvaluationOptionDTO"];
export type QuestionReorderItemDTO = Schemas["QuestionReorderItemDTO"];
export type ReorderItemDTO = Schemas["ReorderItemDTO"];
export type ClinicalCaseListItemDTO = Schemas["ClinicalCaseListItemDTO"];
export type EvaluationAssignmentDTO = Schemas["EvaluationAssignmentDTO"];
export type EvaluationAssignmentAttemptCountsDTO = Schemas["EvaluationAssignmentAttemptCountsDTO"];
export type CreateEvaluationAssignmentsDTO = Schemas["CreateEvaluationAssignmentsDTO"];
export type EvaluationAssignmentIdsDTO = Schemas["EvaluationAssignmentIdsDTO"];
export type GroupDTO = Schemas["GroupDTO"];
