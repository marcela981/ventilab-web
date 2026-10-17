/*
* Funcionalidad: Teacher dashboard feature barrel
* Descripción: Public surface of the teacher dashboard (TEACHER, ADMIN): the lazy TeacherDashboardPage (/teacher: group selector in ?groupId, summary cards, students table with risk highlight, charts and CSV export) and StudentDetailPage (/teacher/students/[userId]: header, progress tree, grades, simulation sessions and activity timeline) plus their URL builders. The only import surface for the thin pages and other features. Depends on the teacher dashboard lazy pages and routes.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { buildStudentDetailUrl, buildTeacherDashboardUrl, TEACHER_DASHBOARD_URL } from "./application/config/teacher-dashboard.routes";
export { StudentDetailPage, TeacherDashboardPage } from "./application/pages/lazy-teacher-dashboard-pages";
export type { StudentDetailPageProps } from "./application/pages/student-detail.page";
