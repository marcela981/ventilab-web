/*
* Funcionalidad: AlarmsBar
* Descripción: Top alarms bar of the generic ventilator console. Shows the active alarms sorted by priority (high > medium > low), each with a priority color token, an icon and the priority text (never color alone); a 2-minute silence button with a visible countdown that mutes the sound only; an optional sound toggle, off by default, that beeps per new high/medium alarm; the session alarm history (derived inside the console from the adapter alarm updates, or the adapter's own history when provided) and the alarm limits panel, both as disclosure panels. Depends on React, MUI icons, the alarm helpers and hooks, AlarmLimitsPanel and the alarms bar styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ErrorIcon from "@mui/icons-material/Error";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useState } from "react";
import type { ComponentType } from "react";
import { cx } from "@shared/lib/class-names";
import { ALARM_PRIORITY_COPY } from "./config/console-controls.config";
import { AlarmLimitsPanel } from "./alarm-limits-panel";
import { formatCountdown, formatEventTime, sortAlarms } from "./console-alarms";
import { createWebAudioBeeper, SYSTEM_CLOCK, useAlarmHistory, useAlarmSilence, useAlarmSound } from "./use-console-alarms";
import type { AlarmBeeperFactory, ConsoleClock } from "./use-console-alarms";
import type {
  ConsoleAlarm,
  ConsoleAlarmEvent,
  ConsoleAlarmLimit,
  ConsoleAlarmLimitChange,
  ConsoleAlarmPriority,
} from "./ventilator-console.entity";
import styles from "../UI/alarms-bar.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const ALARMS_COPY = {
  title: "Alarmas",
  none: "Sin alarmas activas",
  silence: "Silenciar 2 min",
  silenced: (countdown: string) => `Silenciado ${countdown}`,
  resumeSound: "Reactivar sonido",
  soundOn: "Sonido activado",
  soundOff: "Sonido desactivado",
  history: "Historial de alarmas",
  historyEmpty: "Sin eventos de alarma en esta sesión.",
  onset: "Inicio",
  clear: "Fin",
  limits: "Límites",
} as const;

const PRIORITY_ICONS: Readonly<Record<ConsoleAlarmPriority, ComponentType<{ className?: string, "aria-hidden"?: boolean }>>> = {
  high: ErrorIcon,
  medium: WarningAmberIcon,
  low: InfoOutlinedIcon,
};

export type AlarmsBarProps = {
  alarms: readonly ConsoleAlarm[]
  /** Adapter-provided history; when absent the console derives it from the alarm updates. */
  history?: readonly ConsoleAlarmEvent[] | undefined
  limits?: readonly ConsoleAlarmLimit[] | undefined
  onLimitsChange?: ((changes: readonly ConsoleAlarmLimitChange[]) => void) | undefined
  readOnly: boolean
  clock?: ConsoleClock | undefined
  beeperFactory?: AlarmBeeperFactory | undefined
};

type Panel = "none" | "history" | "limits";

function PriorityIcon({ priority }: { priority: ConsoleAlarmPriority }) {
  const Icon = PRIORITY_ICONS[priority];

  return <Icon className={cx(styles.icon)} aria-hidden />;
}

export function AlarmsBar({
  alarms,
  history,
  limits,
  onLimitsChange,
  readOnly,
  clock = SYSTEM_CLOCK,
  beeperFactory = createWebAudioBeeper,
}: AlarmsBarProps) {
  const [panel, setPanel] = useState<Panel>("none");
  const derivedHistory = useAlarmHistory(alarms, clock);
  const silence = useAlarmSilence(clock);
  const sound = useAlarmSound(alarms, silence.silenced, beeperFactory);
  const events = history ?? derivedHistory;
  const sorted = sortAlarms(alarms);
  const hasLimits = limits !== undefined && limits.length > 0;
  const togglePanel = (next: Panel) => setPanel((current) => (current === next ? "none" : next));

  return (
    <section className={cx(styles.bar)} aria-label={ALARMS_COPY.title} data-silenced={silence.silenced}>
      <div className={cx(styles.row)}>
        {sorted.length === 0 ? (
          <p className={cx(styles.none)}>{ALARMS_COPY.none}</p>
        ) : (
          <ul className={cx(styles.list)} aria-live="assertive">
            {sorted.map((alarm) => (
              <li key={alarm.id} className={cx(styles.alarm)} data-priority={alarm.priority}>
                <PriorityIcon priority={alarm.priority} />
                <span className={cx(styles.priority)}>{ALARM_PRIORITY_COPY[alarm.priority]}</span>
                <span className={cx(styles.message)}>{alarm.message}</span>
              </li>
            ))}
          </ul>
        )}
        <div className={cx(styles.actions)}>
          {silence.silenced ? (
            <button type="button" className={cx(styles.action)} aria-pressed onClick={silence.resume} title={ALARMS_COPY.resumeSound}>
              <NotificationsOffIcon className={cx(styles.icon)} aria-hidden />
              {ALARMS_COPY.silenced(formatCountdown(silence.remainingMs))}
            </button>
          ) : (
            <button type="button" className={cx(styles.action)} aria-pressed={false} onClick={silence.silence}>
              <NotificationsOffIcon className={cx(styles.icon)} aria-hidden />
              {ALARMS_COPY.silence}
            </button>
          )}
          <button type="button" className={cx(styles.action)} aria-pressed={sound.enabled} onClick={sound.toggle}>
            {sound.enabled ? <VolumeUpIcon className={cx(styles.icon)} aria-hidden /> : <VolumeOffIcon className={cx(styles.icon)} aria-hidden />}
            {sound.enabled ? ALARMS_COPY.soundOn : ALARMS_COPY.soundOff}
          </button>
          <button type="button" className={cx(styles.action)} aria-expanded={panel === "history"} onClick={() => togglePanel("history")}>
            {`${ALARMS_COPY.history} (${events.length})`}
          </button>
          {hasLimits ? (
            <button type="button" className={cx(styles.action)} aria-expanded={panel === "limits"} onClick={() => togglePanel("limits")}>
              {ALARMS_COPY.limits}
            </button>
          ) : null}
        </div>
      </div>
      {panel === "history" ? (
        <section className={cx(styles.panel)} aria-label={ALARMS_COPY.history}>
          <h3 className={cx(styles.panelTitle)}>{ALARMS_COPY.history}</h3>
          {events.length === 0 ? (
            <p className={cx(styles.hint)}>{ALARMS_COPY.historyEmpty}</p>
          ) : (
            <ol className={cx(styles.history)}>
              {events.map((event) => (
                <li key={event.id} className={cx(styles.event)} data-priority={event.priority} data-kind={event.kind}>
                  <time className={cx(styles.time)}>{formatEventTime(event.atMs)}</time>
                  <span className={cx(styles.kind)}>{event.kind === "onset" ? ALARMS_COPY.onset : ALARMS_COPY.clear}</span>
                  <PriorityIcon priority={event.priority} />
                  <span className={cx(styles.priority)}>{ALARM_PRIORITY_COPY[event.priority]}</span>
                  <span className={cx(styles.message)}>{event.message}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
      {panel === "limits" && hasLimits ? <AlarmLimitsPanel limits={limits} onChange={onLimitsChange} readOnly={readOnly} /> : null}
    </section>
  );
}
