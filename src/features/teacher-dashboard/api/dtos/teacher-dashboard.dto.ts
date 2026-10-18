/*
* Funcionalidad: Teacher dashboard DTOs
* Descripción: Response types of the endpoints read by the teacher dashboard, taken from the generated OpenAPI schema: groups (`GET /api/groups`), group analytics dashboard rows (`GET /api/analytics/groups/{groupId}/dashboard`: progress, published grades, simulation, AI usage per use case, ventilator hours), evaluation stats (`GET /api/analytics/evaluations/{evaluationId}/stats`: histogram, passingGrade), student timeline (`GET /api/analytics/students/{userId}/timeline`), evaluation assignments, grading queue items, reservations calendar, student header (`GET /api/users/students/{id}`), learning progress summary (`GET /api/progress/users/{userId}/summary`) and the curriculum tree used for titles. Types only. v1.1 (closure B2): group module summary, a student's published grades (`GET /api/evaluation-grading/students/{userId}/grades`), simulation sessions (`GET /api/simulation/sessions/history?userId`) and the grading queue count (`GET /api/evaluation-grading/queue/count`). v1.2 (B3.10): unused aliases removed (StudentEvaluationGradeDTO, StudentAiUsageDTO, GradeHistogramBucketDTO, GradingQueueCountDTO).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type GroupDTO = Schemas["GroupDTO"];
export type GroupDashboardDTO = Schemas["GroupDashboardDTO"];
export type StudentDashboardRowDTO = Schemas["StudentDashboardRowDTO"];
export type AnalyticsProgressItemDTO = Schemas["ProgressItemDTO"];
export type EvaluationAnalyticsDTO = Schemas["EvaluationAnalyticsDTO"];
export type StudentTimelineDTO = Schemas["StudentTimelineDTO"];
export type TimelineEntryDTO = Schemas["TimelineEntryDTO"];
export type EvaluationAssignmentDTO = Schemas["EvaluationAssignmentDTO"];
export type GradingQueueItemDTO = Schemas["GradingQueueItemDTO"];
export type ReservationDetailDTO = Schemas["ReservationDetailDTO"];
export type ReservationSummaryDTO = Schemas["ReservationSummaryDTO"];
export type StudentDTO = Schemas["StudentDTO"];
export type LearningProgressSummaryDTO = Schemas["LearningProgressSummaryDTO"];
export type CurriculumTreeDTO = Schemas["StudentCurriculumTreeDTO"];
export type GroupModuleSummaryDTO = Schemas["GroupModuleSummaryDTO"];
export type StudentGradeDTO = Schemas["MyEvaluationGradeDTO"];
export type SimulationSessionDTO = Schemas["SimulationSessionDTO"];
