/*
* Funcionalidad: Simulator catalog entry point
* Descripción: Public entry point of the case catalog with "Mis sesiones" (W4, Bloque 1), lazy loaded by the Simular and
*   Sesiones tabs of /simulador, so that chunk never carries the session console, the replay or the result. Depends on
*   the simulator application layer. v0.2 (W5, Bloque 1): also the catalog query and the start of a FREE practice
*   (useCaseCatalog, useStartPractice with its `onStarted` option), so a workspace panel starts a session without the
*   catalog page.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { SimulatorCatalogPage } from "./application/pages/simulator-catalog.page";
export { useCaseCatalog } from "./application/hooks/use-case-catalog";
export { useStartPractice } from "./application/hooks/use-start-practice";
export type { UseStartPracticeOptions, UseStartPracticeResult } from "./application/hooks/use-start-practice";
