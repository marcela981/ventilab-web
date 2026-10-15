/*
* Funcionalidad: Grading feature barrel
* Descripción: Public surface of the grading feature (teachers and admins): the GradingQueuePage of /grading (lazy entry point, so importing the barrel does not bundle the page), the GradingPendingBadgeSync mounted once in pages/_app.js to feed the "Calificar" navigation badge (it lazy-loads its request code for staff only) and the grading URL builders. The only import surface for pages and other features. Depends on the grading pages, components and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { GradingPendingBadgeSync } from "./application/components/lazy-grading-pending-badge-sync";
export { buildGradingAttemptUrl, GRADING_URL } from "./application/entities/grading-urls";
export { GradingQueuePage } from "./application/pages/lazy-grading-queue-page";
export type { GradingQueuePageProps } from "./application/pages/grading-queue.page";
