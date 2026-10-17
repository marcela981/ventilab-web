/*
* Funcionalidad: Real ventilator console adapter
* Descripción: Composes the generic console adapter (`VentilatorConsoleAdapter`) for the physical ventilator from data
*   the device and the curves give, nothing else: the stable frame source of the telemetry hub with the estimated
*   sample rate and the source status (`no-data` → greyed curves, controls disabled); the settings and mode reported by
*   the latest frames (the same values as current and applied, never optimistic; "—" without a reported mode), with the
*   optional in-flight state of commands; the derived breath metrics, every one marked `derived` (Ppico, Pplat, ΔP,
*   PEEP relabelled from "PEEP total" because it is end-expiratory pressure without a hold, Vte, VE, FR, I:E); the
*   metrics the curves cannot give (Vt/kg, auto-PEEP, FiO2, mechanical power) are left out and show "—"; the SpO2 and
*   PCO2 the frames report, with the patient monitor hidden when neither is reported; the merged alarms; read-only by
*   default (`canControl` false; control comes with T7/T8) with an optional reason, limits and confirm callback. Pure.
*   v1.1: ΔP described as Pplat minus the end-expiratory PEEP (not a total PEEP). v1.2 (T8): optional `modeOptionsFor(reportedMode)` narrows the mode selector to the modes a command may target. Depends on the breath metrics, the reported state and the console contract. v1.3 (T9): optional `pendingResetKey` passed to the console permissions.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type {
  ConsoleAlarm,
  ConsoleConfirmation,
  ConsoleFrameSource,
  ConsoleFrameStatus,
  ConsoleLimits,
  ConsoleMetrics,
  ConsoleModeOption,
  ConsolePatient,
  ConsoleSettings,
  VentilatorConsoleAdapter,
} from "@shared/ventilator-console";
import type { BreathMetrics } from "./breath-detection";
import { REAL_MODE_OPTIONS, UNKNOWN_MODE } from "./reported-settings";
import type { ReportedState } from "./reported-settings";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const DERIVED_PEEP_LABEL = { label: "PEEP", description: "PEEP medida al final de la espiración (sin pausa espiratoria)" } as const;

/** ΔP is computed on the end-expiratory PEEP, not on a total PEEP (no expiratory hold). */
export const DERIVED_DRIVING_PRESSURE_LABEL = {
  label: "ΔP",
  description: "Pplat menos la PEEP medida al final de la espiración (no es la PEEP total)",
} as const;

export type RealConsoleAdapterInput = {
  /** The stable hub source ({sourceId, subscribe}). */
  frames: ConsoleFrameSource
  sampleRateHz?: number | undefined
  status: ConsoleFrameStatus
  statusMessage?: string | undefined
  metrics: BreathMetrics
  reported: ReportedState
  alarms: readonly ConsoleAlarm[]
  /** Default false: the console is read-only until the operator control is wired (T7/T8). */
  canControl?: boolean
  readOnlyReason?: string | undefined
  /** Changing it drops the console's unconfirmed edits (T9: control lost or session revoked). */
  pendingResetKey?: string | number | undefined
  limits?: ConsoleLimits
  inFlight?: ConsoleSettings["inFlight"]
  onConfirm?: (confirmation: ConsoleConfirmation) => void
  /** Mode options for the reported mode (default: every mode the backend accepts). */
  modeOptionsFor?: (reportedMode: string | null) => readonly ConsoleModeOption[]
};

/** Every metric the breath detection gives, marked as derived; nothing else. */
export function toDerivedMetrics(metrics: BreathMetrics): ConsoleMetrics {
  return {
    peakPressure: { value: metrics.peakPressure, derived: true },
    plateauPressure: { value: metrics.plateauPressure, derived: true },
    drivingPressure: { value: metrics.drivingPressure, derived: true, ...DERIVED_DRIVING_PRESSURE_LABEL },
    totalPeep: { value: metrics.peep, derived: true, ...DERIVED_PEEP_LABEL },
    exhaledTidalVolume: { value: metrics.exhaledTidalVolume, derived: true },
    minuteVolume: { value: metrics.minuteVolume, derived: true },
    totalRespiratoryRate: { value: metrics.respiratoryRate, derived: true },
    ieRatio: { value: metrics.ieRatio, derived: true },
  };
}

function patientOf(reported: ReportedState): ConsolePatient {
  return {
    values: {
      ...(reported.spo2 === null ? {} : { spo2: reported.spo2 }),
      ...(reported.pco2 === null ? {} : { pco2: reported.pco2 }),
    },
  };
}

const IGNORE_CONFIRMATION = () => undefined;

export function buildRealConsoleAdapter(input: RealConsoleAdapterInput): VentilatorConsoleAdapter {
  const reportedSettings = input.reported.settings ?? {};
  const patient = patientOf(input.reported);

  return {
    frames: {
      ...input.frames,
      status: input.status,
      ...(input.sampleRateHz === undefined ? {} : { sampleRateHz: input.sampleRateHz }),
      ...(input.statusMessage === undefined ? {} : { statusMessage: input.statusMessage }),
    },
    settings: {
      current: reportedSettings,
      applied: reportedSettings,
      ...(input.inFlight === undefined ? {} : { inFlight: input.inFlight }),
    },
    mode: { current: input.reported.mode ?? UNKNOWN_MODE, options: input.modeOptionsFor ? input.modeOptionsFor(input.reported.mode) : REAL_MODE_OPTIONS },
    metrics: toDerivedMetrics(input.metrics),
    patient,
    capabilities: { patientMonitor: Object.keys(patient.values).length > 0 },
    alarms: input.alarms,
    permissions: {
      canControl: input.canControl ?? false,
      ...(input.readOnlyReason === undefined ? {} : { readOnlyReason: input.readOnlyReason }),
      ...(input.pendingResetKey === undefined ? {} : { pendingResetKey: input.pendingResetKey }),
    },
    limits: input.limits ?? {},
    onConfirm: input.onConfirm ?? IGNORE_CONFIRMATION,
  };
}
