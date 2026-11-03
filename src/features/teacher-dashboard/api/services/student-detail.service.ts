/*
* Funcionalidad: Student detail service
* Descripción: API path constants of the extra reads of /teacher/students/[userId] (TEACHER, ADMIN; every one scoped by the backend, 403 `groups.student_out_of_scope` outside the caller's groups), read with useApiQuery: the students directory (`GET /api/admin/students?search`, for the student code and active groups of the header), gamification stats (`GET /api/progress/users/{userId}/gamification`), unlocked achievements (`GET /api/progress/users/{userId}/achievements`) and the real ventilator recordings (`GET /api/ventilator/telemetry/recordings?userId`). None of them carries personal notes or AI conversations. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const DIRECTORY_STUDENTS_PATH = "/api/admin/students";
export const STUDENT_GAMIFICATION_PATH = "/api/progress/users/{userId}/gamification";
export const STUDENT_ACHIEVEMENTS_PATH = "/api/progress/users/{userId}/achievements";
export const TELEMETRY_RECORDINGS_PATH = "/api/ventilator/telemetry/recordings";
