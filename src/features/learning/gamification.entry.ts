/*
* Funcionalidad: Gamification entry point
* Descripción: Tiny public entry of the learning gamification keys (W9, Bloque 2): GAMIFICATION_INVALIDATES, the SWR paths an unlocked achievement changes (stats, recent activity, calendar, achievements). The app-shell AchievementToasts imports it to revalidate them without pulling any learning UI or request code into the shell. Depends on the gamification service (constants only).
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { GAMIFICATION_INVALIDATES } from "./api/services/gamification.service";
