/*
* Funcionalidad: Grading service
* Descripción: API path constants of the grading feature (teachers and admins). G1 reads the grading queue (`GET /api/evaluation-grading/queue`, PENDING_REVIEW attempts only, filters evaluationId and groupId, paginated) with useApiQuery, plus the READY evaluations and the active student groups that fill its filters. The attempt, answer, publish, feedback and evaluation stats paths are declared here for the grading detail and publish screens. GRADING_QUERY_PATHS lists the cached reads every grading mutation must refresh (the queue key also feeds the pending-count badge). Depends on nothing at runtime. v1.1 (G2): mutations of the grade-attempt page through @shared/api-client: gradeAnswer (`PUT .../answers/{questionId}` with {manualScore, comment?}), publishAttemptGrade (`POST .../publish`, idempotent) and regenerateFeedback (`POST .../feedback/regenerate`, 202 PENDING). Also depends on the grading DTOs. v1.2 (G3): the evaluation results page reads the evaluation assignments (`GET /api/evaluation-assignments?evaluationId`, group, state and attempt counts) and the group dashboard (`GET /api/analytics/groups/{groupId}/dashboard`, published grades per student) and bulk-publishes with publishEvaluationGrades (`POST /api/evaluation-grading/publish` {evaluationId, groupId?} → {publishedCount}); both reads join GRADING_QUERY_PATHS.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPost, apiPut } from "@shared/api-client/api-request";
import type {
  GradeAnswerBodyDTO,
  GradeAnswerResponseDTO,
  GradeFeedbackRegenerationDTO,
  PublishAttemptGradeResponseDTO,
  PublishEvaluationGradesDTO,
  PublishGradesResponseDTO,
} from "../dtos/grading.dto";

export const GRADING_QUEUE_PATH = "/api/evaluation-grading/queue";
export const GRADING_ATTEMPT_PATH = "/api/evaluation-grading/attempts/{attemptId}";
export const GRADING_ANSWER_PATH = "/api/evaluation-grading/attempts/{attemptId}/answers/{questionId}";
export const GRADING_PUBLISH_ATTEMPT_PATH = "/api/evaluation-grading/attempts/{attemptId}/publish";
export const GRADING_PUBLISH_EVALUATION_PATH = "/api/evaluation-grading/publish";
export const GRADING_FEEDBACK_PATH = "/api/evaluation-grading/attempts/{attemptId}/feedback";
export const GRADING_FEEDBACK_REGENERATE_PATH = "/api/evaluation-grading/attempts/{attemptId}/feedback/regenerate";
export const EVALUATION_STATS_PATH = "/api/analytics/evaluations/{evaluationId}/stats";
// Filter options of the queue: the evaluations the caller can see and the student groups they manage.
export const GRADING_EVALUATIONS_PATH = "/api/evaluations";
export const GRADING_GROUPS_PATH = "/api/groups";
// Results page: the assignments of one evaluation (per-group attempt counts) and the published grades of a group.
export const EVALUATION_ASSIGNMENTS_PATH = "/api/evaluation-assignments";
export const GROUP_DASHBOARD_PATH = "/api/analytics/groups/{groupId}/dashboard";

// Grading or publishing changes the queue (and the pending badge), the attempt, its feedback, the evaluation stats,
// the attempt counts of the assignments and the published grades of the group dashboard.
export const GRADING_QUERY_PATHS = [
  GRADING_QUEUE_PATH,
  GRADING_ATTEMPT_PATH,
  GRADING_FEEDBACK_PATH,
  EVALUATION_STATS_PATH,
  EVALUATION_ASSIGNMENTS_PATH,
  GROUP_DASHBOARD_PATH,
] as const;

export async function gradeAnswer(attemptId: string, questionId: string, body: GradeAnswerBodyDTO): Promise<GradeAnswerResponseDTO> {
  const result = await apiPut(GRADING_ANSWER_PATH, { params: { attemptId, questionId }, body });

  return result.data;
}

export async function publishAttemptGrade(attemptId: string): Promise<PublishAttemptGradeResponseDTO> {
  const result = await apiPost(GRADING_PUBLISH_ATTEMPT_PATH, { params: { attemptId } });

  return result.data;
}

export async function regenerateFeedback(attemptId: string): Promise<GradeFeedbackRegenerationDTO> {
  const result = await apiPost(GRADING_FEEDBACK_REGENERATE_PATH, { params: { attemptId } });

  return result.data;
}

export async function publishEvaluationGrades(body: PublishEvaluationGradesDTO): Promise<PublishGradesResponseDTO> {
  const result = await apiPost(GRADING_PUBLISH_EVALUATION_PATH, { body });

  return result.data;
}
