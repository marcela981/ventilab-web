/*
* Funcionalidad: Student home blocks entry point
* Descripción: Public entry of the student home blocks shared by /me and the Inicio tab of /learn (W8, Bloque 2; DISENO_BLOQUE2 §2.12 DRY rule): SummaryCard, the summary blocks Inicio reuses (ContinueLearningBlock, EvaluationsBlock, NotificationsBlock) and their copy, the error message helper and the route builders the merged recent activity links to. Imported by the lazy Inicio panel only, never by a page first load. Depends on the student space components, entities and routes.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { SummaryCard } from "./application/components/summary-card";
export {
  ContinueLearningBlock,
  EvaluationsBlock,
  NotificationsBlock,
  SUMMARY_COPY,
} from "./application/components/summary-blocks";
export { getStudentSpaceErrorMessage } from "./application/entities/student-space-error-messages";
export {
  buildAttemptResultUrl,
  buildConversationUrl,
  buildEvaluationUrl,
  buildLessonUrl,
  buildModuleUrl,
  buildSimulationResultUrl,
  buildSimulationSessionUrl,
} from "./application/config/student-space.routes";
