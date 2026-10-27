/*
* Funcionalidad: Real ventilator alarm limits
* Descripción: Alarm limits of the real-ventilator console (W10, Bloque 1; DISENO_BLOQUE1 §7b: the AlarmLimitsPanel is
*   shown only in real mode). The device protocol has no alarm-threshold command, so the limits are evaluated in the
*   browser against the metrics derived from the curves (breath detection) and raise console alarms of their own
*   (`limit:<type>`); they live only in the open console (not shared with the device, other viewers or the recording).
*   Defaults follow the simulation engine thresholds where they apply (peak pressure 40 cmH2O, respiratory rate
*   35 rpm) and fixed tidal volume bounds (the real patient's predicted weight is unknown). Pure. Depends on the console
*   alarm contract and the breath metrics type.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ConsoleAlarm, ConsoleAlarmLimit, ConsoleAlarmLimitChange, ConsoleAlarmPriority } from "@shared/ventilator-console";
import type { BreathMetrics } from "./breath-detection";

export type RealAlarmLimitId = "highPressure" | "lowTidalVolume" | "highTidalVolume" | "highRespiratoryRate";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const REAL_ALARM_LIMIT_LABELS = {
  highPressure: "Presión pico alta",
  lowTidalVolume: "Volumen corriente bajo",
  highTidalVolume: "Volumen corriente alto",
  highRespiratoryRate: "Frecuencia respiratoria alta",
} as const satisfies Record<RealAlarmLimitId, string>;

export const DEFAULT_REAL_ALARM_LIMITS: readonly ConsoleAlarmLimit[] = [
  { id: "highPressure", label: REAL_ALARM_LIMIT_LABELS.highPressure, value: 40, min: 10, max: 80, step: 1, unit: "cmH2O" },
  { id: "lowTidalVolume", label: REAL_ALARM_LIMIT_LABELS.lowTidalVolume, value: 200, min: 50, max: 1000, step: 10, unit: "mL" },
  { id: "highTidalVolume", label: REAL_ALARM_LIMIT_LABELS.highTidalVolume, value: 800, min: 100, max: 2000, step: 10, unit: "mL" },
  { id: "highRespiratoryRate", label: REAL_ALARM_LIMIT_LABELS.highRespiratoryRate, value: 35, min: 10, max: 80, step: 1, unit: "rpm" },
];

type LimitRule = {
  /** Same alarm type as the device event when there is one, so a device alarm of that type is shown once. */
  type: string
  priority: ConsoleAlarmPriority
  measure: (metrics: BreathMetrics) => number | null
  crosses: (value: number, limit: number) => boolean
};

const RULES: Readonly<Record<RealAlarmLimitId, LimitRule>> = {
  highPressure: { type: "HIGH_PRESSURE", priority: "high", measure: (metrics) => metrics.peakPressure, crosses: (value, limit) => value >= limit },
  lowTidalVolume: { type: "LOW_VOLUME", priority: "medium", measure: (metrics) => metrics.exhaledTidalVolume, crosses: (value, limit) => value <= limit },
  highTidalVolume: { type: "HIGH_VOLUME", priority: "medium", measure: (metrics) => metrics.exhaledTidalVolume, crosses: (value, limit) => value >= limit },
  highRespiratoryRate: { type: "HIGH_RESPIRATORY_RATE", priority: "medium", measure: (metrics) => metrics.respiratoryRate, crosses: (value, limit) => value > limit },
};

function ruleOf(id: string): LimitRule | undefined {
  return Object.prototype.hasOwnProperty.call(RULES, id) ? RULES[id as RealAlarmLimitId] : undefined;
}

function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** Applies the panel changes (already clamped by the panel); unknown ids are ignored. */
export function applyAlarmLimitChanges(
  limits: readonly ConsoleAlarmLimit[],
  changes: readonly ConsoleAlarmLimitChange[],
): readonly ConsoleAlarmLimit[] {
  const values = new Map(changes.map((change) => [change.id, change.value]));

  if (!limits.some((limit) => values.has(limit.id))) {
    return limits;
  }

  return limits.map((limit) => {
    const value = values.get(limit.id);

    return value === undefined || value === limit.value ? limit : { ...limit, value };
  });
}

/** Alarms of the limits the current metrics cross; an alarm still active keeps its onset time. */
export function evaluateAlarmLimits(
  limits: readonly ConsoleAlarmLimit[],
  metrics: BreathMetrics,
  now: number,
  previous: readonly ConsoleAlarm[] = [],
): ConsoleAlarm[] {
  const since = new Map(previous.map((alarm) => [alarm.id, alarm.since]));

  return limits.flatMap((limit) => {
    const rule = ruleOf(limit.id);
    const value = rule?.measure(metrics) ?? null;

    if (!rule || value === null || !Number.isFinite(value) || !rule.crosses(value, limit.value)) {
      return [];
    }

    const id = `limit:${limit.id}`;

    return [{
      id,
      type: rule.type,
      priority: rule.priority,
      message: `${limit.label}: ${formatNumber(value)} ${limit.unit} (límite ${formatNumber(limit.value)})`,
      since: since.get(id) ?? now,
    }];
  });
}
