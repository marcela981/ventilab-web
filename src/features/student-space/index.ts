/*
* Funcionalidad: Student space feature barrel
* Descripción: Public surface of the student space (STUDENT only): the lazy StudentHomePage (/me, one GET /api/me/summary), MyNotesPage (/me/notes, notes grouped by module and lesson with edit, delete and AI analysis reusing the learning notes components) and MyGradesPage (/me/grades, published grades) plus their URLs. The only import surface for the thin pages and other features. Depends on the student space lazy pages and routes.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { MY_GRADES_URL, MY_NOTES_URL, STUDENT_HOME_URL } from "./application/config/student-space.routes";
export { MyGradesPage, MyNotesPage, StudentHomePage } from "./application/pages/lazy-student-space-pages";
export type { StudentHomePageProps } from "./application/pages/student-home.page";
