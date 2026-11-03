/*
* Funcionalidad: Grading entry point for the staff evaluation hub
* Descripción: What the staff evaluation hub (/evaluations?tab=calificar, evaluation-authoring feature) needs from grading without loading the barrel: the lazy GradingQueueBody (the queue chunk loads on the first visit of the tab) and usePendingGradingCount, the count of the Calificar badge (same SWR key as the navigation badge, so no extra request). Depends on the grading application layer.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { usePendingGradingCount } from "./application/hooks/use-pending-grading-count";
export { GradingQueueBody } from "./application/pages/lazy-grading-queue-page";
