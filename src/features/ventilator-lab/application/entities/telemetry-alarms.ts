/*
* Funcionalidad: Real ventilator alarms
* Descripción: Console alarms of the real ventilator from three origins. (1) The device `ventilator:alarm` event
*   (`VentilatorAlarmDTO`): one alarm per type, its severity mapped to the console priorities CRITICAL and HIGH → high,
*   MEDIUM → medium, LOW → low (unknown → medium, never under-prioritised), a Spanish label per backend type with the
*   measured value and threshold when reported (unknown types keep the backend message), the onset time kept while
*   active, and `active: false` clearing it. (2) The alarm codes of the latest frame that carries `alarms` (no severity
*   in the frame: the console default type map, unknown → medium). (3) The synthetic high-priority "Equipo sin datos"
*   alarm the adapter raises while the device sends no data. A frame code already raised by the device event is shown
*   once. Pure. Depends on the realtime event types and the console alarm contract. v1.1: label and severity maps read with own-key lookups only.
*   v1.2 (W10, Bloque 1): the merge also takes the alarms of the client alarm limits (real-alarm-limits), shown after the
*   device and frame alarms unless the device already raised that type.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { RealtimeEventMap } from "@shared/realtime";
import { resolveAlarmPriority } from "@shared/ventilator-console";
import type { ConsoleAlarm, ConsoleAlarmPriority } from "@shared/ventilator-console";

export type DeviceAlarm = RealtimeEventMap["ventilator:alarm"];

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
/** Backend alarm types (`ventilator-alarm.ts` ALARM_TYPE_VALUES). */
export const DEVICE_ALARM_LABELS: Readonly<Record<string, string>> = {
  HIGH_PRESSURE: "Presión alta",
  LOW_PRESSURE: "Presión baja",
  HIGH_VOLUME: "Volumen alto",
  LOW_VOLUME: "Volumen bajo",
  APNEA: "Apnea",
  DISCONNECTION: "Desconexión",
  POWER_FAILURE: "Falla de energía",
  TECHNICAL_FAULT: "Falla técnica",
};

export const NO_DATA_ALARM_ID = "source:no-data";
export const NO_DATA_ALARM_MESSAGE = "Equipo sin datos";

const SEVERITY_PRIORITIES: Readonly<Record<string, ConsoleAlarmPriority>> = {
  CRITICAL: "high",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

/** Own keys only: an inherited key ("constructor", "toString") is not an entry. */
function ownEntry<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

export function severityToPriority(severity: string): ConsoleAlarmPriority {
  return ownEntry(SEVERITY_PRIORITIES, severity) ?? "medium";
}

function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function deviceMessage(alarm: DeviceAlarm): string {
  const label = ownEntry(DEVICE_ALARM_LABELS, alarm.type);

  if (label === undefined) {
    return alarm.message;
  }

  if (typeof alarm.currentValue === "number" && Number.isFinite(alarm.currentValue)) {
    const limit = typeof alarm.thresholdValue === "number" && Number.isFinite(alarm.thresholdValue)
      ? ` (límite ${formatNumber(alarm.thresholdValue)})`
      : "";

    return `${label}: ${formatNumber(alarm.currentValue)}${limit}`;
  }

  return label;
}

/** Applies one device alarm event to the active device alarms. */
export function applyDeviceAlarm(active: readonly ConsoleAlarm[], alarm: DeviceAlarm): ConsoleAlarm[] {
  const id = `device:${alarm.type}`;
  const existing = active.find((item) => item.id === id);

  if (!alarm.active) {
    return active.filter((item) => item.id !== id);
  }

  const next: ConsoleAlarm = {
    id,
    type: alarm.type,
    priority: severityToPriority(alarm.severity),
    message: deviceMessage(alarm),
    since: existing?.since ?? alarm.timestamp,
  };

  return existing ? active.map((item) => (item.id === id ? next : item)) : [...active, next];
}

/** The frame alarm codes as console alarms; a code still active keeps its onset time. */
export function frameAlarmsToConsole(codes: readonly string[], now: number, previous: readonly ConsoleAlarm[] = []): ConsoleAlarm[] {
  const since = new Map(previous.map((alarm) => [alarm.id, alarm.since]));

  return [...new Set(codes)].map((code) => ({
    id: `frame:${code}`,
    type: code,
    priority: resolveAlarmPriority(code),
    message: ownEntry(DEVICE_ALARM_LABELS, code) ?? code,
    since: since.get(`frame:${code}`) ?? now,
  }));
}

export function noDataAlarm(since: number): ConsoleAlarm {
  return { id: NO_DATA_ALARM_ID, type: "NO_DATA", priority: "high", message: NO_DATA_ALARM_MESSAGE, since };
}

/** No-data first, then device alarms, then the frame codes and the client limit alarms the device event has not raised. */
export function mergeConsoleAlarms(
  device: readonly ConsoleAlarm[],
  frame: readonly ConsoleAlarm[],
  noData: ConsoleAlarm | null,
  limit: readonly ConsoleAlarm[] = [],
): ConsoleAlarm[] {
  const deviceTypes = new Set(device.map((alarm) => alarm.type));
  const notRaised = (alarm: ConsoleAlarm) => !deviceTypes.has(alarm.type);

  return [...(noData ? [noData] : []), ...device, ...frame.filter(notRaised), ...limit.filter(notRaised)];
}
