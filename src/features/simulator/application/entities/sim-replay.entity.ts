/*
* Funcionalidad: Simulation replay entities
* Descripción: Pure rules of the session replay page (T8): the playback length (the simulated time the server
*   replays, or the last recorded event), the time bar marks of the recorded events (parameter changes, AI assist
*   requests, alarm acknowledgements, case events) and of the alarm onsets found in a local replay timeline, each
*   positioned as a percentage of the playback length, the engine version warning (recorded vs current server
*   version, or vs the version bundled in this browser) and the seek clamp. Depends on the sim-engine public API,
*   the session entities and the result config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ENGINE_VERSION } from "@shared/sim-engine";
import type { EngineMetrics } from "@shared/sim-engine";
import { ALARM_LABELS } from "../config/sim-console.config";
import { EVENT_MARK_KINDS, MARK_LABELS } from "../config/sim-result.config";
import type { TimelineMarkKind } from "../config/sim-result.config";
import type { RecordedSessionEvent, SessionReplay } from "./sim-session.entity";

export type TimelineMark = {
  id: string
  kind: TimelineMarkKind
  simTimeMs: number
  /** Position on the time bar, 0–100 (% of the playback length). */
  position: number
  label: string
};

/** Playback length: the simulated time the server replays for the session, or the last recorded event. */
export function replayDurationMs(serverSimTimeMs: number | null, events: readonly RecordedSessionEvent[]): number {
  const lastEventMs = events.reduce((latest, event) => (Number.isFinite(event.simTimeMs) ? Math.max(latest, event.simTimeMs) : latest), 0);

  return Math.max(0, serverSimTimeMs ?? 0, lastEventMs);
}

export function markPosition(simTimeMs: number, durationMs: number): number {
  if (!(durationMs > 0) || !Number.isFinite(simTimeMs)) {
    return 0;
  }

  return Math.round(Math.min(100, Math.max(0, (simTimeMs / durationMs) * 100)) * 100) / 100;
}

export function clampSeek(simTimeMs: number, durationMs: number): number {
  return Number.isFinite(simTimeMs) ? Math.min(Math.max(0, Math.round(simTimeMs)), Math.max(0, durationMs)) : 0;
}

function describeChanges(event: RecordedSessionEvent): string {
  const changes = event.payload.changes;
  const keys = typeof changes === "object" && changes !== null ? Object.keys(changes) : [];

  return keys.length > 0 ? `${MARK_LABELS.param} (${keys.length})` : MARK_LABELS.param;
}

function alarmLabel(code: unknown): string {
  return typeof code === "string" ? `${MARK_LABELS.alarmAck}: ${ALARM_LABELS[code as keyof typeof ALARM_LABELS] ?? code}` : MARK_LABELS.alarmAck;
}

/** Marks of the recorded events the time bar shows, in simulated-time order. */
export function eventMarks(events: readonly RecordedSessionEvent[], durationMs: number): TimelineMark[] {
  return events
    .flatMap((event) => {
      const kind = EVENT_MARK_KINDS[event.type];

      if (kind === undefined || !Number.isFinite(event.simTimeMs)) {
        return [];
      }

      const label = kind === "param" ? describeChanges(event) : kind === "alarmAck" ? alarmLabel(event.payload.alarmCode) : MARK_LABELS[kind];

      return [{ id: event.id, kind, simTimeMs: event.simTimeMs, position: markPosition(event.simTimeMs, durationMs), label }];
    })
    .sort((a, b) => a.simTimeMs - b.simTimeMs);
}

/** One mark per alarm onset (an alarm code absent in the previous snapshot and present in this one). */
export function alarmOnsetMarks(timeline: readonly EngineMetrics[], durationMs: number): TimelineMark[] {
  const marks: TimelineMark[] = [];
  let previous = new Set<string>();

  timeline.forEach((snapshot) => {
    const current = new Set(snapshot.alarms.map((alarm) => alarm.code));

    current.forEach((code) => {
      if (!previous.has(code)) {
        marks.push({
          id: `alarm-${code}-${snapshot.simTimeMs}`,
          kind: "alarm",
          simTimeMs: snapshot.simTimeMs,
          position: markPosition(snapshot.simTimeMs, durationMs),
          label: `${MARK_LABELS.alarm}: ${ALARM_LABELS[code] ?? code}`,
        });
      }
    });
    previous = current;
  });

  return marks;
}

// TODO(i18n): move to a simulator namespace in src/i18n.
export const REPLAY_VERSION_COPY = {
  mismatch: (recorded: string, current: string) =>
    `Esta sesión se grabó con el motor ${recorded} y el motor actual es ${current}. La repetición puede no coincidir con lo que ocurrió.`,
} as const;

/** Warning when the recorded engine differs from the server's current one or from the engine of this browser. */
export function replayVersionWarning(replay: Pick<SessionReplay, "engineVersion" | "currentEngineVersion" | "engineVersionMismatch" | "warning">, bundled: string = ENGINE_VERSION): string | null {
  if (replay.engineVersionMismatch === true) {
    return replay.warning ?? REPLAY_VERSION_COPY.mismatch(replay.engineVersion, replay.currentEngineVersion ?? bundled);
  }

  return replay.engineVersion === bundled ? null : REPLAY_VERSION_COPY.mismatch(replay.engineVersion, bundled);
}
