/*
* Funcionalidad: Monitor mode and status
* Descripción: The Digital/Real mode of the Monitoreo tab and its status chip (FLUJOS_JULIO a.6): "Sin señal" without
*   data, "Simulando" while a digital session runs (running or paused) and "Conectado (Físico)" in real mode while the
*   lab connection is CONNECTED. Pure functions over low-frequency state only (session status, connection state); W10
*   may refine the real status with the stale-telemetry signal. No dependencies.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type MonitorMode = "digital" | "real";

export type MonitorStatus = "no-signal" | "simulating" | "connected";

export const MONITOR_STATUS_LABELS = {
  "no-signal": "Sin señal",
  simulating: "Simulando",
  connected: "Conectado (Físico)",
} as const satisfies Record<MonitorStatus, string>;

export type MonitorStatusInput = {
  mode: MonitorMode
  /** Status of the digital session; null without one. */
  sessionStatus: string | null
  /** The lab connection is CONNECTED. */
  connected: boolean
};

/** A digital session produces data while it runs or is paused (its curves stay on screen). */
export function isSimulating(sessionStatus: string | null): boolean {
  return sessionStatus === "running" || sessionStatus === "paused";
}

export function deriveMonitorStatus({ mode, sessionStatus, connected }: MonitorStatusInput): MonitorStatus {
  if (mode === "real") {
    return connected ? "connected" : "no-signal";
  }

  return isSimulating(sessionStatus) ? "simulating" : "no-signal";
}
