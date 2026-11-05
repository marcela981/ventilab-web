/*
* Funcionalidad: Grading service
* Descripción: API path constants of the grading feature (teachers and admins). G1 reads the grading queue (`GET /api/evaluation-grading/queue`, PENDING_REVIEW attempts only, filters evaluationId and groupId, paginated) with useApiQuery, plus the READY evaluations and the active student groups that fill its filters. The attempt, answer, publish, feedback and evaluation stats paths are declared here for the grading detail and publish screens. GRADING_QUERY_PATHS lists the cached reads every grading mutation must refresh (the queue key also feeds the pending-count badge). Depends on nothing at runtime. v1.1 (G2): mutations of the grade-attempt page through @shared/api-client: gradeAnswer (`PUT .../answers/{questionId}` with {manualScore, comment?}), publishAttemptGrade (`POST .../publish`, idempotent) and regenerateFeedback (`POST .../feedback/regenerate`, 202 PENDING). Also depends on the grading DTOs. v1.2 (G3): the evaluation results page reads the evaluation assignments (`GET /api/evaluation-assignments?evaluationId`, group, state and attempt counts) and the group dashboard (`GET /api/analytics/groups/{groupId}/dashboard`, published grades per student) and bulk-publishes with publishEvaluationGrades (`POST /api/evaluation-grading/publish` {evaluationId, groupId?} → {publishedCount}); both reads join GRADING_QUERY_PATHS. v1.3 (closure B2): the queue takes `studentId`; the pending badge reads `GET /api/evaluation-grading/queue/count` (`{ pending }`), which joins GRADING_QUERY_PATHS; the group members of the student filter come from `GET /api/groups/{id}`. v1.4 (Bloque 3): GRADING_ATTEMPTS_PATH (`GET /api/evaluation-grading/attempts`, every attempt of one evaluation with counts per status; joins GRADING_QUERY_PATHS) and resetStudentAttempt (`POST .../students/{userId}/evaluations/{evaluationId}/reset` {reason}: one more attempt, nothing deleted). v1.5 (ajustes C1): publishAttemptGrade and publishEvaluationGrades send the release scope (GRADE: the grade alone; GRADE_AND_ANSWERS: also the answers, explanations and AI feedback).
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPost, apiPut } from "@shared/api-client/api-request";
import type { ReleaseScope } from "../../application/entities/results-release.entity";
import type {
  GradeAnswerBodyDTO,
  GradeAnswerResponseDTO,
  GradeFeedbackRegenerationDTO,
  PublishAttemptGradeResponseDTO,
  PublishEvaluationGradesDTO,
  PublishGradesResponseDTO,
  ResetEvaluationAttemptDTO,
} from "../dtos/grading.dto";

export const GRADING_QUEUE_PATH = "/api/evaluation-grading/queue";
export const GRADING_QUEUE_COUNT_PATH = "/api/evaluation-grading/queue/count";
// Every attempt of one evaluation (any status) with the counts per status: the list of the unified grading screen.
export const GRADING_ATTEMPTS_PATH = "/api/evaluation-grading/attempts";
export const GRADING_RESET_ATTEMPT_PATH = "/api/evaluation-grading/students/{userId}/evaluations/{evaluationId}/reset";
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
// Members of the chosen group: the options of the student filter.
export const GRADING_GROUP_DETAIL_PATH = "/api/groups/{id}";
// Results page: the assignments of one evaluation (per-group attempt counts) and the published grades of a group.
export const EVALUATION_ASSIGNMENTS_PATH = "/api/evaluation-assignments";
export const GROUP_DASHBOARD_PATH = "/api/analytics/groups/{groupId}/dashboard";

// Grading or publishing changes the queue (and the pending badge), the attempt, its feedback, the evaluation stats,
// the attempt counts of the assignments and the published grades of the group dashboard.
export const GRADING_QUERY_PATHS = [
  GRADING_QUEUE_PATH,
  GRADING_QUEUE_COUNT_PATH,
  GRADING_ATTEMPTS_PATH,
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

// Releases the grade alone (GRADE) or with the answers, explanations and AI feedback (GRADE_AND_ANSWERS). Idempotent.
export async function publishAttemptGrade(attemptId: string, scope: ReleaseScope): Promise<PublishAttemptGradeResponseDTO> {
  const result = await apiPost(GRADING_PUBLISH_ATTEMPT_PATH, { params: { attemptId }, body: { scope } });

  return result.data;
}

export async function regenerateFeedback(attemptId: string): Promise<GradeFeedbackRegenerationDTO> {
  const result = await apiPost(GRADING_FEEDBACK_REGENERATE_PATH, { params: { attemptId } });

  return result.data;
}

// Same scopes for every GRADED attempt of the evaluation (or one group); publishedCount counts the attempts whose release changed.
export async function publishEvaluationGrades(body: PublishEvaluationGradesDTO): Promise<PublishGradesResponseDTO> {
  const result = await apiPost(GRADING_PUBLISH_EVALUATION_PATH, { body });

  return result.data;
}

// Grants the student one more attempt (audited, nothing is deleted). 409 evaluation.attempt_in_progress or
// evaluation.assignment_not_active (data {assignmentId, startsAt, endsAt}).
export async function resetStudentAttempt(userId: string, evaluationId: string, body: ResetEvaluationAttemptDTO): Promise<void> {
  await apiPost(GRADING_RESET_ATTEMPT_PATH, { params: { userId, evaluationId }, body });
}
