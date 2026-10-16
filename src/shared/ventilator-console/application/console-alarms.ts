/*
* Funcionalidad: Console alarm helpers
* Descripción: Pure helpers of the ventilator console alarms bar: sort the active alarms by priority (high > medium > low, newest first within a priority), derive the session history events (onset and clear) by diffing two consecutive alarm lists by id, format the silence countdown (m:ss) and the wall-clock time of a history event. Depends only on the console contract types and the controls/alarms config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ALARM_PRIORITY_ORDER } from "./config/console-controls.config";
import type { ConsoleAlarm, ConsoleAlarmEvent, ConsoleAlarmEventKind } from "./ventilator-console.entity";

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
