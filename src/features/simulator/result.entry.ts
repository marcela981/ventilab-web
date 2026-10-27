/*
* Funcionalidad: Simulator result entry point
* Descripción: Public entry point of the session result page (/simulator/sessions/[sessionId]/result, W4, Bloque 1),
*   so that route loads only the result. Depends on the simulator application layer. v0.2 (W6, Bloque 1): also the
*   result without the page chrome (SessionResultSummary), lazy loaded by the /simulador result dialog.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { RESULT_PAGE_COPY, SessionResultPage, SessionResultSummary } from "./application/pages/session-result.page";
export type { SessionResultPageProps, SessionResultSummaryProps } from "./application/pages/session-result.page";
