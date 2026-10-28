/*
* Funcionalidad: Gamification DTOs
* Descripción: Backend contracts of the server-side gamification (Bloque 2, ventylab-server docs/bloque2/reglas-gamificacion.md): `GET /api/progress/gamification` → GamificationStatsDTO (XP, level, streaks, XP today) and `GET /api/progress/activity/recent` → RecentActivityItemDTO[] (latest lesson, module, evaluation and achievement facts of the activity ledger). Aliases of the generated OpenAPI schema. Depends on @shared/api-client. v0.2 (W9): the activity calendar (`GET /api/progress/activity` → ActivityCalendarDTO, days with activity in America/Bogota) and the unlocked achievements (`GET /api/progress/achievements` → AchievementsDTO).
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type GamificationStatsDTO = Schemas["GamificationStatsDTO"];

export type RecentActivityItemDTO = Schemas["RecentActivityItemDTO"];

export type ActivityCalendarDTO = Schemas["ActivityCalendarDTO"];

export type AchievementsDTO = Schemas["AchievementsDTO"];
