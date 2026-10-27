/*
* Funcionalidad: Simulator result entry point
* Descripción: Public entry point of the session result page (/simulator/sessions/[sessionId]/result, W4, Bloque 1),
*   so that route loads only the result. Depends on the simulator application layer.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { RESULT_PAGE_COPY, SessionResultPage } from "./application/pages/session-result.page";
export type { SessionResultPageProps } from "./application/pages/session-result.page";
