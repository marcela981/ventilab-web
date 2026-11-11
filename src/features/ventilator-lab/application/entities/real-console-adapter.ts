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
*   v1.4 (W10, Bloque 1): optional alarm limits and their change callback (the AlarmLimitsPanel of the real console).
*   v1.5 (Bloque 5, C4): the derived metrics add Pmedia and the flow extremes of the last breath (July value cards).
*   v1.6 (Ajustes A, A2): optional auto-send input: `desired` values and mode (queued or in flight) shown over the reported ones until they settle, `sendStatus` per parameter, and `onCancel` / `onApplyNow` (Escape / Enter of the July console).
*   v1.7 (2026-11-10, reverts A-1 to A-4): `onCancel` / `onApplyNow` removed (the July console sends explicitly with Enviar).
*   v1.8 (2026-11-10, real mode without reported settings): optional `sentBase` (the last snapshot the backend
*   accepted, console units) is shown as the settings and mode the device does not report (device values always win;
*   not confirmed by the device), and optional `proposal` (the initial configuration, Digital defaults) is offered to
*   the console only while the device reports no settings, nothing was sent and nothing is queued or in flight.
* Versión: 1.8
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type {
  ConsoleAlarm,
  ConsoleAlarmLimit,
  ConsoleAlarmLimitChange,
  ConsoleConfirmation,
  ConsoleFrameSource,
  ConsoleFrameStatus,
  ConsoleLimits,
  ConsoleMetrics,
  ConsoleModeOption,
  ConsolePatient,
  ConsoleProposal,
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

/** Ajustes A (A2): what the operator asked for and the device does not run yet (console units). */
export type RealDesiredSettings = { values: Readonly<Record<string, number>>, mode: string | null };

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
  /** Ajustes A (A2): command queue status per parameter (shown next to each control, never blocks editing). */
  sendStatus?: ConsoleSettings["sendStatus"]
  /** Ajustes A (A2): values and mode queued or in flight, shown over the reported ones until they settle. */
  desired?: RealDesiredSettings
  /** v1.8: the last snapshot sent (console units), shown for what the device does not report. */
  sentBase?: RealDesiredSettings | null
  /** v1.8: the initial configuration to confirm while the device reports no settings and nothing was sent. */
  proposal?: ConsoleProposal | null
  onConfirm?: (confirmation: ConsoleConfirmation) => void
  /** Mode options for the reported mode (default: every mode the backend accepts). */
  modeOptionsFor?: (reportedMode: string | null) => readonly ConsoleModeOption[]
  /** W10: alarm limits of the console (client-side, real-alarm-limits) and their change callback. */
  alarmLimits?: readonly ConsoleAlarmLimit[]
  onAlarmLimitsChange?: (changes: readonly ConsoleAlarmLimitChange[]) => void
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
    meanPressure: { value: metrics.meanPressure, derived: true },
    peakInspiratoryFlow: { value: metrics.peakInspiratoryFlow, derived: true },
    peakExpiratoryFlow: { value: metrics.peakExpiratoryFlow, derived: true },
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
  const sentBase = input.sentBase ?? null;
  // v1.8: device values win; the last snapshot sent stands in only while the device reports no settings (no mode).
  const reportedSettings = input.reported.settings ?? sentBase?.values ?? {};
  const reportedMode = input.reported.mode ?? sentBase?.mode ?? null;
  const desired = input.desired;
  const desiredValues = desired !== undefined && Object.keys(desired.values).length > 0;
  // The values the operator asked for replace the reported ones only while they are queued or in flight.
  const shown = desired && desiredValues ? { ...reportedSettings, ...desired.values } : reportedSettings;
  const patient = patientOf(input.reported);
  // v1.8: the initial configuration only while nothing reported, sent, queued or in flight stands for the settings.
  const proposal = input.proposal ?? null;
  const proposing = proposal !== null && input.reported.settings === null && sentBase === null && !desiredValues && (desired?.mode ?? null) === null;

  return {
    frames: {
      ...input.frames,
      status: input.status,
      ...(input.sampleRateHz === undefined ? {} : { sampleRateHz: input.sampleRateHz }),
      ...(input.statusMessage === undefined ? {} : { statusMessage: input.statusMessage }),
    },
    settings: {
      current: shown,
      applied: shown,
      ...(input.inFlight === undefined ? {} : { inFlight: input.inFlight }),
      ...(input.sendStatus === undefined ? {} : { sendStatus: input.sendStatus }),
    },
    mode: { current: desired?.mode ?? reportedMode ?? UNKNOWN_MODE, options: input.modeOptionsFor ? input.modeOptionsFor(input.reported.mode) : REAL_MODE_OPTIONS },
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
    ...(input.alarmLimits === undefined ? {} : { alarmLimits: input.alarmLimits }),
    ...(input.onAlarmLimitsChange === undefined ? {} : { onAlarmLimitsChange: input.onAlarmLimitsChange }),
    ...(proposing && proposal !== null ? { proposal } : {}),
  };
}
