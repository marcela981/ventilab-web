/*
* Funcionalidad: Student summary entry point
* Descripción: Light public entry of the student summary (W8, Bloque 2): the useStudentSummary hook (`GET /api/me/summary`) and its entity types, so the /learn workspace can start the summary read with the Inicio panel chunk without pulling the summary blocks or the student space pages into its first load. Depends on the student summary hook and entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { useStudentSummary } from "./application/hooks/use-student-summary";
export type { UseStudentSummaryResult } from "./application/hooks/use-student-summary";
export type {
  ContinueLearning,
  StudentSummary,
  SummaryConversation,
  SummaryGrade,
  SummaryNote,
  SummarySimulationSession,
} from "./application/entities/student-summary.entity";
