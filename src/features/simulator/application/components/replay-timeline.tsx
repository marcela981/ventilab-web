/*
* Funcionalidad: Replay timeline
* Descripción: Transport of the session replay (T8): play/pause, the local playback speed buttons (×1, ×2, ×4, ×8;
*   aria-pressed), the simulated clock with the playback length, and the time bar: a native range input (scrubbing
*   calls a debounced seek) over an SVG strip of event marks positioned by time (parameter changes, AI assist,
*   alarm acknowledgements, case events, alarm onsets; color by kind) plus an accessible list of the same marks that
*   jump to their time. The marks are positioned through SVG percentage attributes, never inline styles. Depends on
*   React, the result config, the replay entities, the time format and the replay CSS Module. v1.1: past
*   MARK_LIST_COLLAPSE_THRESHOLD marks the list is collapsed behind a native disclosure.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useId } from "react";
import { cx } from "@shared/lib/class-names";
import { MARK_LIST_COLLAPSE_THRESHOLD, REPLAY_SPEEDS } from "../config/sim-result.config";
import type { ReplaySpeed } from "../config/sim-result.config";
import type { TimelineMark } from "../entities/sim-replay.entity";
import type { ReplayPlaybackStatus } from "../hooks/use-replay-session";
import { formatSimTime } from "./time-controls";
import styles from "../../UI/session-replay.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const REPLAY_TIMELINE_COPY = {
  label: "Controles de la repetición",
  play: "Reproducir",
  replayAgain: "Repetir desde el inicio",
  pause: "Pausar",
  speed: "Velocidad de reproducción",
  speedHint: "Velocidad local de esta repetición; no cambia la sesión.",
  clock: "Tiempo simulado",
  position: "Posición de la repetición",
  events: "Eventos de la sesión",
  noEvents: "La sesión no registró eventos.",
  showEvents: (count: number) => `Eventos de la sesión (${count})`,
  jumpTo: (time: string, label: string) => `${time} — ${label}`,
} as const;

export type ReplayTimelineProps = {
  status: ReplayPlaybackStatus
  simTimeMs: number
  durationMs: number
  speed: ReplaySpeed
  marks: readonly TimelineMark[]
  disabled?: boolean
  onPlay: () => void
  onPause: () => void
  onSpeedChange: (speed: ReplaySpeed) => void
  onScrub: (simTimeMs: number) => void
  onJump: (simTimeMs: number) => void
};

export function ReplayTimeline({
  status,
  simTimeMs,
  durationMs,
  speed,
  marks,
  disabled = false,
  onPlay,
  onPause,
  onSpeedChange,
  onScrub,
  onJump,
}: ReplayTimelineProps) {
  const hintId = useId();
  const playing = status === "playing";
  const playLabel = status === "ended" ? REPLAY_TIMELINE_COPY.replayAgain : REPLAY_TIMELINE_COPY.play;

  return (
    <section className={cx(styles.transport)} aria-label={REPLAY_TIMELINE_COPY.label}>
      <div className={cx(styles.controls)}>
        <button
          type="button"
          className={cx(styles.button)}
          disabled={disabled || status === "starting"}
          onClick={playing ? onPause : onPlay}
        >
          {playing ? REPLAY_TIMELINE_COPY.pause : playLabel}
        </button>
        <div className={cx(styles.speed)} role="group" aria-label={REPLAY_TIMELINE_COPY.speed} aria-describedby={hintId}>
          {REPLAY_SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              className={cx(styles.speedButton)}
              aria-pressed={value === speed}
              disabled={disabled}
              onClick={() => onSpeedChange(value)}
            >
              {`×${value}`}
            </button>
          ))}
        </div>
        <p id={hintId} className={cx(styles.hint)}>{REPLAY_TIMELINE_COPY.speedHint}</p>
        <p className={cx(styles.clock)}>
          <span className={cx(styles.clockLabel)}>{REPLAY_TIMELINE_COPY.clock}</span>
          <span className={cx(styles.clockValue)}>{`${formatSimTime(simTimeMs)} / ${formatSimTime(durationMs)}`}</span>
        </p>
      </div>
      <div className={cx(styles.track)}>
        <svg className={cx(styles.marks)} aria-hidden="true" focusable="false">
          {marks.map((mark) => (
            <line
              key={mark.id}
              className={cx(styles.mark)}
              data-kind={mark.kind}
              data-mark-id={mark.id}
              x1={`${mark.position}%`}
              x2={`${mark.position}%`}
              y1="0"
              y2="100%"
            />
          ))}
        </svg>
        <input
          type="range"
          className={cx(styles.range)}
          min={0}
          max={Math.max(0, durationMs)}
          step={100}
          value={Math.min(simTimeMs, durationMs)}
          disabled={disabled || durationMs <= 0}
          aria-label={REPLAY_TIMELINE_COPY.position}
          aria-valuetext={formatSimTime(simTimeMs)}
          onChange={(event) => onScrub(Number(event.target.value))}
        />
      </div>
      <MarkList marks={marks} disabled={disabled} onJump={onJump} />
    </section>
  );
}

function MarkList({ marks, disabled, onJump }: Pick<ReplayTimelineProps, "marks" | "disabled" | "onJump">) {
  if (marks.length === 0) {
    return <p className={cx(styles.hint)}>{REPLAY_TIMELINE_COPY.noEvents}</p>;
  }

  const list = (
    <ol className={cx(styles.markList)} aria-label={REPLAY_TIMELINE_COPY.events}>
      {marks.map((mark) => (
        <li key={mark.id}>
          <button
            type="button"
            className={cx(styles.markButton)}
            data-kind={mark.kind}
            disabled={disabled}
            onClick={() => onJump(mark.simTimeMs)}
          >
            {REPLAY_TIMELINE_COPY.jumpTo(formatSimTime(mark.simTimeMs), mark.label)}
          </button>
        </li>
      ))}
    </ol>
  );

  // A long session can record hundreds of marks: past the threshold the list is collapsed (the bar still shows all).
  if (marks.length <= MARK_LIST_COLLAPSE_THRESHOLD) {
    return list;
  }

  return (
    <details className={cx(styles.markDisclosure)}>
      <summary className={cx(styles.markSummary)}>{REPLAY_TIMELINE_COPY.showEvents(marks.length)}</summary>
      {list}
    </details>
  );
}
