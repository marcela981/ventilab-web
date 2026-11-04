/*
* Funcionalidad: Monitor value cards entry point
* Descripción: Public entry point of the per-user preference of the July value cards (useMonitorCardsPref) for the
*   hosts outside the /simulador workspace: the session console route (/simulator/sessions/[sessionId], EXAM and
*   direct links) passes it to the console, so EXAM applies the saved order and hidden cards read-only (D29). Kept
*   out of the feature barrel, which must not statically reach the ventilator console (lab-live.lazy-boundary.test).
*   v0.1 (Bloque 5, C6): first version.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { useMonitorCardsPref } from "./application/hooks/use-monitor-cards-pref";
