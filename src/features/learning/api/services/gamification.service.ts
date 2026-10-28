/*
* Funcionalidad: Gamification service
* Descripción: SWR keys (paths) of the server-side gamification reads used with useApiQuery: the stats (`GET /api/progress/gamification`) and the recent activity of the ledger (`GET /api/progress/activity/recent?limit`, 1 to 50). The client never computes XP: every value comes from these reads. No dependencies.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const GAMIFICATION_PATH = "/api/progress/gamification";
export const RECENT_ACTIVITY_PATH = "/api/progress/activity/recent";
