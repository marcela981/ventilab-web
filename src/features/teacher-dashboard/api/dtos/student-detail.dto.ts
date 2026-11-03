/*
* Funcionalidad: Student detail DTOs
* Descripción: Response types of the extra reads of /teacher/students/[userId] (DISENO_BLOQUE4 §2.4), taken from the generated OpenAPI schema: the directory row of the student (`GET /api/admin/students?search`: student code and active groups), gamification stats (`GET /api/progress/users/{userId}/gamification`), unlocked achievements (`GET /api/progress/users/{userId}/achievements`) and the real ventilator recordings (`GET /api/ventilator/telemetry/recordings?userId`). Types only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type DirectoryStudentDTO = Schemas["AdminStudentListItemDTO"];
export type GamificationStatsDTO = Schemas["GamificationStatsDTO"];
export type AchievementsDTO = Schemas["AchievementsDTO"];
export type TelemetryRecordingSummaryDTO = Schemas["TelemetryRecordingSummaryDTO"];
