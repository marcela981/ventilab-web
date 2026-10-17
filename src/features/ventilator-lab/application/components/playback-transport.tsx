/*
* Funcionalidad: Recording playback transport
* Descripción: Presentational transport of a recording playback: play / pause, the local speed buttons (×0.5, ×1, ×2,
*   ×4, aria-pressed), the time bar (a range input in ms; a change seeks) and the clock "position / duration". Nothing
*   reaches the backend. Depends on MUI Button, the playback engine (speeds, clock format) and the recordings styles.
*   v1.1 (T11 review fix S1): the recording gaps are marked on the time bar (an SVG track under the range, positioned by
*   attributes, no inline style) and listed as text ("Intervalos sin datos: mm:ss–mm:ss"), so dead time is visible,
*   never compressed.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Button from "@mui/material/Button";
import { cx } from "@shared/lib/class-names";
import { formatPlaybackClock, PLAYBACK_SPEEDS } from "../entities/playback-engine";
import type { RecordingGap } from "../entities/recording-index";
import type { PlaybackSpeed } from "../entities/playback-engine";
import styles from "../../UI/lab-recordings.module.css";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const PLAYBACK_COPY = {
  transport: "Reproducción",
  play: "Reproducir",
  pause: "Pausar",
  speed: "Velocidad de reproducción",
  speedLabel: (speed: number) => `×${String(speed).replace(".", ",")}`,
  position: "Posición en la grabación",
  clock: "Tiempo de la grabación",
  gaps: (list: string) => `Intervalos sin datos: ${list}.`,
  gapRange: (from: string, to: string) => `${from}–${to}`,
} as const;

/** Width of the SVG gap track (viewBox units). */
const TRACK_WIDTH = 1000;

export type PlaybackTransportProps = {
  playing: boolean
  speed: PlaybackSpeed
  positionMs: number
  durationMs: number
  /** Time bar step (ms), e.g. the recording sample period. */
  stepMs: number
  onPlay: () => void
  onPause: () => void
  onSpeedChange: (speed: PlaybackSpeed) => void
  onSeek: (positionMs: number) => void
  /** Intervals without recorded frames, in playback ms. */
  gaps?: readonly RecordingGap[]
};

export function PlaybackTransport({
  playing,
  speed,
  positionMs,
  durationMs,
  stepMs,
  onPlay,
  onPause,
  onSpeedChange,
  onSeek,
  gaps = [],
}: PlaybackTransportProps) {
  const position = Math.min(positionMs, durationMs);
  const scale = (ms: number) => (durationMs > 0 ? (Math.min(Math.max(ms, 0), durationMs) / durationMs) * TRACK_WIDTH : 0);

  return (
    <section className={cx(styles.transport)} aria-label={PLAYBACK_COPY.transport}>
      <Button
        variant="contained"
        size="small"
        startIcon={playing ? <PauseIcon /> : <PlayArrowIcon />}
        onClick={playing ? onPause : onPlay}
        disabled={durationMs <= 0}
      >
        {playing ? PLAYBACK_COPY.pause : PLAYBACK_COPY.play}
      </Button>
      <div className={cx(styles.speed)} role="group" aria-label={PLAYBACK_COPY.speed}>
        {PLAYBACK_SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            className={cx(styles.speedButton)}
            aria-pressed={value === speed}
            onClick={() => onSpeedChange(value)}
          >
            {PLAYBACK_COPY.speedLabel(value)}
          </button>
        ))}
      </div>
      <div className={cx(styles.timeline)}>
        {gaps.length > 0 ? (
          <svg
            className={cx(styles.gapTrack)}
            viewBox={`0 0 ${TRACK_WIDTH} 1`}
            preserveAspectRatio="none"
            aria-hidden="true"
            data-testid="lab-recording-gaps"
          >
            {gaps.map((gap) => (
              <rect key={gap.startMs} className={cx(styles.gapMark)} x={scale(gap.startMs)} y={0} width={Math.max(1, scale(gap.endMs) - scale(gap.startMs))} height={1} />
            ))}
          </svg>
        ) : null}
        <input
          type="range"
          className={cx(styles.range)}
          min={0}
          max={Math.max(0, durationMs)}
          step={Math.max(1, stepMs)}
          value={position}
          disabled={durationMs <= 0}
          aria-label={PLAYBACK_COPY.position}
          aria-valuetext={formatPlaybackClock(position)}
          onChange={(event) => onSeek(Number(event.target.value))}
        />
      </div>
      <p className={cx(styles.clock)} aria-label={PLAYBACK_COPY.clock} data-testid="lab-recording-clock">
        {`${formatPlaybackClock(position)} / ${formatPlaybackClock(durationMs)}`}
      </p>
      {gaps.length > 0 ? (
        <p className={cx(styles.gapList)} data-testid="lab-recording-gap-list">
          {PLAYBACK_COPY.gaps(gaps.map((gap) => PLAYBACK_COPY.gapRange(formatPlaybackClock(gap.startMs), formatPlaybackClock(gap.endMs))).join(", "))}
        </p>
      ) : null}
    </section>
  );
}
