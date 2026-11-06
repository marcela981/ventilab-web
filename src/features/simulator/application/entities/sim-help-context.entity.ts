/*
* Funcionalidad: Simulator AI help context
* Descripción: What the console sends with "Asesoría IA" and "¿Cómo estabilizar?" of a simulation session (fix
*   sim-assist-current-state): its current simulated time, whether the bounded flush of the event queue left changes
*   unsent, and a snapshot of what it shows (vitals, gases, severity and status, applied settings, active alarms with
*   their priority). The server rebuilds the state at that time by a deterministic replay and only compares the
*   snapshot with it. Also reads the analyzed state the server reports in the `done` frame (simulated time, severity
*   and status of a session; age of the latest frame in real mode) into the panel header ("Analizado en t = mm:ss ·
*   gravedad X %"), and the INCONSISTENT_STATE notice of an answer replaced by the deterministic suggestion. Pure (no
*   React); depends on the sim-engine types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { EngineMetrics, VentilatorSettings } from "@shared/sim-engine";

/** Bound of the flush of the pending events before a help request; after it the request goes out and says so. */
export const HELP_FLUSH_TIMEOUT_MS = 2000;

/** `done.notice` of an answer the AI kept contradicting: the deterministic suggestion was sent instead. */
export const INCONSISTENT_STATE_NOTICE = "INCONSISTENT_STATE";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const HELP_CONTEXT_COPY = {
  analyzedAt: (time: string) => `Analizado en t = ${time}`,
  severity: (percent: number) => `gravedad ${percent} %`,
  inconsistent: "La IA no pudo analizar el estado actual",
  unsent: "Algunos cambios recientes aún no se habían enviado: la asesoría puede no incluirlos.",
  realAge: (seconds: number) => `Datos del equipo de hace ${seconds} s`,
  realStale: (seconds: number) => `Sin datos del equipo desde hace ${seconds} s: la asesoría usa la última lectura.`,
} as const;

export type ClientSnapshotAlarm = { code: string, severity?: "HIGH" | "MEDIUM" | "LOW" | undefined };

/** SimulationHelpContextDTO.clientSnapshot (every field optional on the contract). */
export type ClientSimulationSnapshot = {
  spo2Percent?: number
  pao2MmHg?: number
  paco2MmHg?: number
  ph?: number
  mapMmHg?: number
  heartRateBpm?: number
  severity?: number
  status?: string
  alarms?: ClientSnapshotAlarm[]
  settings?: { mode?: string, tidalVolumeMl?: number, respiratoryRateBpm?: number, peepCmH2O?: number, fio2?: number }
};

/** The console context of one help request. */
export type SessionHelpContext = {
  simTimeMs: number
  unsentChanges: boolean
  clientSnapshot?: ClientSimulationSnapshot | undefined
};

/** The state the server analyzed, from `done.analysis`. */
export type HelpAnalysis = {
  simTimeMs?: number | undefined
  severity?: number | null | undefined
  patientStatus?: string | null | undefined
  dataAgeMs?: number | undefined
  stale?: boolean | undefined
};

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Only the defined fields: the contract rejects nulls and the server compares what is present. */
function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}

/** What the console shows, from its latest engine metrics and applied settings. */
export function buildClientSnapshot(metrics: EngineMetrics | null, applied: VentilatorSettings | null): ClientSimulationSnapshot | undefined {
  if (metrics === null) {
    return undefined;
  }

  const settings = applied === null
    ? undefined
    : compact({
      mode: applied.mode,
      tidalVolumeMl: finite(applied.tidalVolumeMl),
      respiratoryRateBpm: finite(applied.respiratoryRateBpm),
      peepCmH2O: finite(applied.peepCmH2O),
      fio2: finite(applied.fio2),
    });

  return compact({
    spo2Percent: finite(metrics.gasExchange.spo2Percent),
    pao2MmHg: finite(metrics.gasExchange.pao2MmHg),
    paco2MmHg: finite(metrics.gasExchange.paco2MmHg),
    ph: finite(metrics.gasExchange.ph),
    mapMmHg: finite(metrics.hemodynamics.meanArterialPressureMmHg),
    heartRateBpm: finite(metrics.hemodynamics.heartRateBpm),
    severity: finite(metrics.patient?.severity),
    status: metrics.patient?.status,
    alarms: metrics.alarms.slice(0, 20).map((alarm): ClientSnapshotAlarm => ({ code: alarm.code, severity: alarm.severity })),
    settings,
  }) as ClientSimulationSnapshot;
}

/** The help request body fields of a session (SimulationHelpContextDTO). */
export function helpContextBody(context: SessionHelpContext | null | undefined): Record<string, unknown> {
  if (!context) {
    return {};
  }

  return {
    simTimeMs: Math.max(0, Math.floor(context.simTimeMs)),
    ...(context.unsentChanges ? { unsentChanges: true } : {}),
    ...(context.clientSnapshot ? { clientSnapshot: context.clientSnapshot } : {}),
  };
}

/** `done.analysis`, or null when the server sent none (an older server). */
export function parseHelpAnalysis(done: unknown): HelpAnalysis | null {
  if (typeof done !== "object" || done === null) {
    return null;
  }

  const analysis = (done as { analysis?: unknown }).analysis;

  if (typeof analysis !== "object" || analysis === null) {
    return null;
  }

  const value = analysis as Record<string, unknown>;

  return {
    simTimeMs: finite(value.simTimeMs),
    severity: finite(value.severity) ?? null,
    patientStatus: typeof value.patientStatus === "string" ? value.patientStatus : null,
    dataAgeMs: finite(value.dataAgeMs),
    stale: value.stale === true,
  };
}

export function isInconsistentNotice(done: unknown): boolean {
  return typeof done === "object" && done !== null && (done as { notice?: unknown }).notice === INCONSISTENT_STATE_NOTICE;
}

/** "mm:ss" of a simulated time (minutes keep growing past 59), as the server formats it. */
export function formatSimTime(simTimeMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(simTimeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);

  return `${String(minutes).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

/** The header of an answer: "Analizado en t = 01:16 · gravedad 69 %" (session) or the frame age (real). */
export function analysisHeader(analysis: HelpAnalysis | null): string | null {
  if (analysis === null) {
    return null;
  }

  if (analysis.simTimeMs !== undefined) {
    const parts = [HELP_CONTEXT_COPY.analyzedAt(formatSimTime(analysis.simTimeMs))];

    if (typeof analysis.severity === "number") {
      parts.push(HELP_CONTEXT_COPY.severity(Math.round(Math.min(1, Math.max(0, analysis.severity)) * 100)));
    }

    return parts.join(" · ");
  }

  if (analysis.dataAgeMs !== undefined) {
    const seconds = Math.round(analysis.dataAgeMs / 1000);

    return analysis.stale ? HELP_CONTEXT_COPY.realStale(seconds) : HELP_CONTEXT_COPY.realAge(seconds);
  }

  return null;
}
