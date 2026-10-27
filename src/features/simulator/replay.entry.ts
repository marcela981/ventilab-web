/*
* Funcionalidad: Simulator replay entry point
* Descripción: Public entry point of the session replay page (/simulator/sessions/[sessionId]/replay, W4, Bloque 1),
*   so that route loads only the replay and its console. Depends on the simulator application layer. v0.2 (W9,
*   Bloque 1): also the replay without the page chrome (SessionReplayView), lazy loaded by the Mis sesiones tab of
*   /simulador.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { REPLAY_PAGE_COPY, SessionReplayPage, SessionReplayView } from "./application/pages/session-replay.page";
export type { SessionReplayPageProps, SessionReplayViewProps } from "./application/pages/session-replay.page";
