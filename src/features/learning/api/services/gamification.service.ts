/*
* Funcionalidad: Gamification service
* Descripción: SWR keys (paths) of the server-side gamification reads used with useApiQuery: the stats (`GET /api/progress/gamification`) and the recent activity of the ledger (`GET /api/progress/activity/recent?limit`, 1 to 50), the activity calendar (`GET /api/progress/activity?from&to`, YYYY-MM-DD America/Bogota, at most 366 days) and the unlocked achievements (`GET /api/progress/achievements`). GAMIFICATION_INVALIDATES lists the keys an XP-giving fact can change (page views of the viewer, the achievement toast). The client never computes XP: every value comes from these reads. No dependencies. v0.2 (W9): calendar and achievements paths and GAMIFICATION_INVALIDATES.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const GAMIFICATION_PATH = "/api/progress/gamification";
export const RECENT_ACTIVITY_PATH = "/api/progress/activity/recent";
export const ACTIVITY_CALENDAR_PATH = "/api/progress/activity";
export const ACHIEVEMENTS_PATH = "/api/progress/achievements";

// Keys an XP-giving fact (page view, completion, passed evaluation, unlocked achievement) can change.
export const GAMIFICATION_INVALIDATES = [GAMIFICATION_PATH, RECENT_ACTIVITY_PATH, ACTIVITY_CALENDAR_PATH, ACHIEVEMENTS_PATH] as const;
