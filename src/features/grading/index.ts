/*
* Funcionalidad: Grading feature barrel
* Descripción: Public surface of the grading feature (teachers and admins): the GradingQueuePage of /grading (lazy entry point, so importing the barrel does not bundle the page), the GradingPendingBadgeSync mounted once in pages/_app.js to feed the "Calificar" navigation badge (it lazy-loads its request code for staff only) and the grading URL builders. The only import surface for pages and other features. Depends on the grading pages, components and entities. v1.1 (G2): the lazy GradeAttemptPage of /grading/attempts/[attemptId]. v1.2 (G3): the lazy EvaluationResultsPage of /grading/evaluations/[evaluationId] and its URL builder.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { GradingPendingBadgeSync } from "./application/components/lazy-grading-pending-badge-sync";
export { buildGradingAttemptUrl, buildGradingEvaluationUrl, GRADING_URL } from "./application/entities/grading-urls";
export type { GradeAttemptPageProps } from "./application/pages/grade-attempt.page";
export { GradeAttemptPage } from "./application/pages/lazy-grade-attempt-page";
export type { EvaluationResultsPageProps } from "./application/pages/evaluation-results.page";
export { EvaluationResultsPage } from "./application/pages/lazy-evaluation-results-page";
export { GradingQueuePage } from "./application/pages/lazy-grading-queue-page";
export type { GradingQueuePageProps } from "./application/pages/grading-queue.page";
