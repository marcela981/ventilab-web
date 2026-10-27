/*
* Funcionalidad: Simulator history entry point
* Descripción: Public entry point of the simulation session history (W9, Bloque 1) for the Mis sesiones tab of
*   /simulador: the sessions started inside one date window with their case titles (useSessionHistoryRange), the row
*   type and the Spanish labels and formats of a row (mode, status, score, duration, own patient name), plus the URL
*   of the session console that hosts an EXAM. It carries no console, replay or result, so the tab list stays light.
*   Depends on the simulator application layer.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { SESSION_HISTORY_RANGE_LIMIT, useSessionHistoryRange } from "./application/hooks/use-session-history";
export type {
  SessionHistoryRange,
  SessionHistoryRow,
  UseSessionHistoryRangeResult,
} from "./application/hooks/use-session-history";
export { formatScore, formatSessionDuration, sessionStatusLabel, simulationModeLabel } from "./application/entities/simulator.entity";
export { getSimulatorErrorMessage } from "./application/entities/simulator-error-messages";
export { buildSessionUrl } from "./application/config/simulator.routes";
