/*
* Funcionalidad: Simulator session entry point
* Descripción: Public entry point of the running session (W4, Bloque 1): the session console page of
*   /simulator/sessions/[sessionId] and the hostable session runtime (SimSessionHost, useSimSessionHost, the
*   store-based useSimSession and useSimSessionSlice) the /simulador workspace mounts. Routes import this file instead
*   of the feature barrel, so the session chunk never carries the catalog, the replay or the result page. Depends on
*   the simulator application layer.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { SESSION_PAGE_COPY, SessionConsolePage } from "./application/pages/session-console.page";
export type { AssistSlotContext, SessionConsolePageProps } from "./application/pages/session-console.page";
export { SimSessionHost, useSimSessionHost } from "./application/components/sim-session-host";
export type {
  SimSessionHostDeps,
  SimSessionHostProps,
  SimSessionHostValue,
  SimSessionPhase,
  SimSessionRunning,
} from "./application/components/sim-session-host";
export { useSimSession, useSimSessionSlice } from "./application/hooks/use-sim-session";
export type { SimSessionSnapshot, SimSessionStore, SimSessionView } from "./application/hooks/use-sim-session";
