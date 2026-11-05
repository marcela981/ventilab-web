/*
* Funcionalidad: Console alarm helpers
* Descripción: Pure helpers of the ventilator console alarms bar: sort the active alarms by priority (high > medium > low, newest first within a priority), derive the session history events (onset and clear) by diffing two consecutive alarm lists by id, format the silence countdown (m:ss) and the wall-clock time of a history event. v1.1 (Bloque A): the short label of an alarm and the help target of an alarm or a history event. Depends only on the console contract types and the controls/alarms config.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ALARM_PRIORITY_ORDER } from "./config/console-controls.config";
import type { ConsoleAlarm, ConsoleAlarmEvent, ConsoleAlarmEventKind, ConsoleAlarmHelpTarget } from "./ventilator-console.entity";

/** The short name of an alarm: its label, else its message before the first colon ("Presión alta: 42 (límite 40)"). */
export function alarmLabelOf(alarm: Pick<ConsoleAlarm, "message"> & { label?: string | undefined }): string {
  if (alarm.label) {
    return alarm.label;
  }

  const colon = alarm.message.indexOf(":");

  return (colon > 0 ? alarm.message.slice(0, colon) : alarm.message).trim();
}

/** What the "¿Cómo estabilizar?" help receives for an active alarm or a history event. */
export function alarmHelpTarget(alarm: ConsoleAlarm | ConsoleAlarmEvent): ConsoleAlarmHelpTarget {
  return { code: alarm.type, label: alarmLabelOf(alarm), message: alarm.message };
}

export function sortAlarms(alarms: readonly ConsoleAlarm[]): ConsoleAlarm[] {
  return [...alarms].sort(
    (a, b) => ALARM_PRIORITY_ORDER.indexOf(a.priority) - ALARM_PRIORITY_ORDER.indexOf(b.priority) || b.since - a.since,
  );
}

function toEvent(alarm: ConsoleAlarm, kind: ConsoleAlarmEventKind, atMs: number): ConsoleAlarmEvent {
  return {
    id: `${alarm.id}:${kind}:${atMs}`,
    alarmId: alarm.id,
    type: alarm.type,
    priority: alarm.priority,
    message: alarm.message,
    kind,
    atMs,
  };
}

/** Onset for ids that appear, clear for ids that disappear; newest-first order is the caller's concern. */
export function diffAlarms(previous: readonly ConsoleAlarm[], next: readonly ConsoleAlarm[], atMs: number): ConsoleAlarmEvent[] {
  const previousIds = new Set(previous.map((alarm) => alarm.id));
  const nextIds = new Set(next.map((alarm) => alarm.id));
  const cleared = previous.filter((alarm) => !nextIds.has(alarm.id)).map((alarm) => toEvent(alarm, "clear", atMs));
  const started = next.filter((alarm) => !previousIds.has(alarm.id)).map((alarm) => toEvent(alarm, "onset", atMs));

  return [...cleared, ...started];
}

export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatEventTime(atMs: number): string {
  const date = new Date(atMs);

  return [date.getHours(), date.getMinutes(), date.getSeconds()].map((part) => String(part).padStart(2, "0")).join(":");
}
