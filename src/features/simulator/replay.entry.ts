/*
* Funcionalidad: Simulator replay entry point
* Descripción: Public entry point of the session replay page (/simulator/sessions/[sessionId]/replay, W4, Bloque 1),
*   so that route loads only the replay and its console. Depends on the simulator application layer.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { REPLAY_PAGE_COPY, SessionReplayPage } from "./application/pages/session-replay.page";
export type { SessionReplayPageProps } from "./application/pages/session-replay.page";
