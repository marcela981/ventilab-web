/*
* Funcionalidad: Simulator workspace feature barrel
* Descripción: Public surface of the unified simulator workspace (/simulador, home of every role): the workspace page and its tab keys. v0.1 (W1): a placeholder page that loads the existing page of each tab; W5 builds the workspace shell. The only import surface for the thin page. Depends on the workspace page and tab entity. v0.2 (W5, Bloque 1): the page is the workspace shell (session and lab connection providers above the bottom tabs, panels mounted once).
*   v0.3 (Bloque 5, C5): useMonitorCardsPref, the per-user preference of the July value cards (the `cards` prop of the July console), and its storage key.
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { SimulatorWorkspacePage } from "./application/pages/simulator-workspace.page";
export { useMonitorCardsPref } from "./application/hooks/use-monitor-cards-pref";
export { monitorCardsStorageKey } from "./application/entities/monitor-cards-pref.entity";
