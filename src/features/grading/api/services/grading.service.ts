/*
* Funcionalidad: Grading service
* Descripción: API path constants of the grading feature (teachers and admins). G1 reads the grading queue (`GET /api/evaluation-grading/queue`, PENDING_REVIEW attempts only, filters evaluationId and groupId, paginated) with useApiQuery, plus the READY evaluations and the active student groups that fill its filters. The attempt, answer, publish, feedback and evaluation stats paths are declared here for the grading detail and publish screens. GRADING_QUERY_PATHS lists the cached reads every grading mutation must refresh (the queue key also feeds the pending-count badge). Depends on nothing at runtime.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

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

// Grading or publishing changes the queue (and the pending badge), the attempt, its feedback and the evaluation stats.
export const GRADING_QUERY_PATHS = [
  GRADING_QUEUE_PATH,
  GRADING_ATTEMPT_PATH,
  GRADING_FEEDBACK_PATH,
  EVALUATION_STATS_PATH,
] as const;
