/*
* Funcionalidad: Teacher general tab service
* Descripción: API path constants of the General tab of /teacher (TEACHER, ADMIN), read with useApiQuery: platform statistics (`GET /api/admin/statistics`) and the most recently active students (`GET /api/admin/students?limit=5&sortBy=lastActivity&sortOrder=desc`, plus `myGroups=true` for teachers). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const PLATFORM_STATISTICS_PATH = "/api/admin/statistics";
export const ADMIN_STUDENTS_PATH = "/api/admin/students";
