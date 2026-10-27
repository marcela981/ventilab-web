/*
* Funcionalidad: Simulator session entry point
* Descripción: Public entry point of the running session (W4, Bloque 1): the session console page of
*   /simulator/sessions/[sessionId] and the hostable session runtime (SimSessionHost, useSimSessionHost, the
*   store-based useSimSession and useSimSessionSlice) the /simulador workspace mounts. Routes import this file instead
*   of the feature barrel, so the session chunk never carries the catalog, the replay or the result page. Depends on
*   the simulator application layer. v0.2 (W6, Bloque 1): the session view shared with the workspace Monitoreo tab
*   (SessionMonitor), the own patient entity with its Spanish labels and the replay URL builder.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { SESSION_PAGE_COPY, SessionConsolePage } from "./application/pages/session-console.page";
export type { AssistSlotContext, SessionConsolePageProps } from "./application/pages/session-console.page";
export { SessionMonitor } from "./application/components/session-monitor";
export type { SessionMonitorProps } from "./application/components/session-monitor";
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
export { buildSessionReplayUrl } from "./application/config/simulator.routes";
export { DIFFICULTY_LABELS } from "./application/config/simulator.config";
export {
  BREATHING_PATTERN_LABELS,
  PATIENT_CONDITION_LABELS,
  PATIENT_SEX_LABELS,
} from "./application/entities/sim-patient.entity";
export type { SessionPatient, SessionPatientVitals } from "./application/entities/sim-patient.entity";
