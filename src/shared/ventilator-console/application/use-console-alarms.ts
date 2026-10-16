/*
* Funcionalidad: Console alarm hooks
* Descripción: Stateful pieces of the ventilator console alarms bar. useAlarmHistory keeps the session history inside the console by diffing each adapter alarm update (onset/clear events stamped with the injectable console clock, newest first, capped). useAlarmSilence mutes the sound for 2 minutes with a countdown ticking every second (timers come from the environment, so fake timers drive it in tests) and counts the silences that ran out on their own. useAlarmSound beeps once per new high or medium alarm while the user-enabled sound is on and not silenced, and beeps once more when a silence runs out on its own while a high or medium alarm is still active (a manual resume does not beep); the Web Audio context is created lazily inside the enabling click (autoplay rules) and closed on unmount. createWebAudioBeeper is the default short-beep factory (no audio files). Depends on React and the alarm helpers.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { ALARM_HISTORY_MAX_EVENTS, ALARM_SILENCE_MS } from "./config/console-controls.config";
import { diffAlarms } from "./console-alarms";
import type { ConsoleAlarm, ConsoleAlarmEvent } from "./ventilator-console.entity";

export type ConsoleClock = { now: () => number };

export const SYSTEM_CLOCK: ConsoleClock = { now: () => Date.now() };

export type AlarmBeeper = { beep: () => void, close: () => void };

/** Returns `null` when the browser has no Web Audio. */
export type AlarmBeeperFactory = () => AlarmBeeper | null;

const BEEP_HZ = 880;
const BEEP_SECONDS = 0.18;
const BEEP_GAIN = 0.15;

export const createWebAudioBeeper: AlarmBeeperFactory = () => {
  if (typeof window === "undefined" || typeof window.AudioContext !== "function") {
    return null;
  }

  const context = new window.AudioContext();

  return {
    beep: () => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = BEEP_HZ;
      gain.gain.value = BEEP_GAIN;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + BEEP_SECONDS);
    },
    close: () => {
      void context.close();
    },
  };
};

type TrackedHistory = { alarms: readonly ConsoleAlarm[], events: readonly ConsoleAlarmEvent[] };

export function useAlarmHistory(alarms: readonly ConsoleAlarm[], clock: ConsoleClock): readonly ConsoleAlarmEvent[] {
  const [tracked, setTracked] = useState<TrackedHistory>(() => ({ alarms, events: diffAlarms([], alarms, clock.now()).reverse() }));

  // Adjust state during render when the adapter delivers a new alarm list (no effect, no extra commit).
  if (tracked.alarms !== alarms) {
    const fresh = diffAlarms(tracked.alarms, alarms, clock.now()).reverse();
    const events = fresh.length > 0 ? [...fresh, ...tracked.events].slice(0, ALARM_HISTORY_MAX_EVENTS) : tracked.events;
    setTracked({ alarms, events });
  }

  return tracked.events;
}

export type AlarmSilence = {
  silenced: boolean
  remainingMs: number
  /** Count of silences that ran out on their own (a manual resume does not count). */
  expirations: number
  silence: () => void
  resume: () => void
};

export function useAlarmSilence(clock: ConsoleClock): AlarmSilence {
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => clock.now());
  const [expirations, setExpirations] = useState(0);

  useEffect(() => {
    if (until === null) {
      return undefined;
    }

    const timer = setInterval(() => {
      const current = clock.now();
      setNow(current);

      if (current >= until) {
        setUntil(null);
        setExpirations((count) => count + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [until, clock]);

  const silence = useCallback(() => {
    const current = clock.now();
    setNow(current);
    setUntil(current + ALARM_SILENCE_MS);
  }, [clock]);

  const resume = useCallback(() => setUntil(null), []);
  const remainingMs = until === null ? 0 : Math.max(0, until - now);

  return { silenced: remainingMs > 0, remainingMs, expirations, silence, resume };
}

export type AlarmSound = {
  enabled: boolean
  /** Must run inside a user gesture: it creates the audio context. */
  toggle: () => void
};

/**
 * `silenceExpirations` is AlarmSilence.expirations: when it grows (the silence ran out on its own) and a high or
 * medium alarm is still active, the sound beeps once as a reminder that the alarm was muted, not resolved.
 */
export function useAlarmSound(
  alarms: readonly ConsoleAlarm[],
  silenced: boolean,
  factory: AlarmBeeperFactory,
  silenceExpirations = 0,
): AlarmSound {
  const [enabled, setEnabled] = useState(false);
  const beeper = useRef<AlarmBeeper | null>(null);
  const known = useRef<ReadonlySet<string>>(new Set(alarms.map((alarm) => alarm.id)));
  const seenExpirations = useRef(silenceExpirations);

  useEffect(() => {
    const fresh = alarms.some((alarm) => alarm.priority !== "low" && !known.current.has(alarm.id));
    const expired = silenceExpirations !== seenExpirations.current;
    known.current = new Set(alarms.map((alarm) => alarm.id));
    seenExpirations.current = silenceExpirations;

    const audible = alarms.some((alarm) => alarm.priority !== "low");

    if ((fresh || (expired && audible)) && enabled && !silenced) {
      beeper.current?.beep();
    }
  }, [alarms, enabled, silenced, silenceExpirations]);

  useEffect(
    () => () => {
      beeper.current?.close();
      beeper.current = null;
    },
    [],
  );

  const toggle = useCallback(() => {
    if (enabled) {
      setEnabled(false);

      return;
    }

    beeper.current ??= factory();
    setEnabled(beeper.current !== null);
  }, [enabled, factory]);

  return { enabled, toggle };
}
