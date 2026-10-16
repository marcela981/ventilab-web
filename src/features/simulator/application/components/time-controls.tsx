/*
* Funcionalidad: Session time controls
* Descripción: Simulated clock and time controls of the running session. FREE: playback multiplier buttons (the
*   contract values of TIME_MULTIPLIERS; a value above the session multiplier is disabled because the server bounds
*   the simulated time by wall time × session multiplier) plus pause/resume. EXAM: the fixed multiplier as text and no
*   pause. Native buttons with aria-pressed on the dark console surface. Depends on MUI icons, the simulator config
*   and the simulator CSS. v1.1: the limit hint says the top speed was chosen when the practice started (catalog).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { cx } from "@shared/lib/class-names";
import { TIME_MULTIPLIER_LABELS, TIME_MULTIPLIERS } from "../config/simulator.config";
import type { SimulationMode, TimeMultiplier } from "../config/simulator.config";
import styles from "../../UI/session-console.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const TIME_CONTROLS_COPY = {
  label: "Control del tiempo",
  clock: "Tiempo simulado",
  speed: "Velocidad",
  pause: "Pausar",
  resume: "Reanudar",
  paused: "En pausa",
  fixed: (label: string) => `Velocidad fija ${label} (examen, sin pausa)`,
  limited: "La velocidad máxima se eligió al iniciar la práctica en el catálogo; aquí solo puedes bajarla.",
} as const;

/** 0:42 · 12:05 · 1:02:03. */
export function formatSimTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

export type TimeControlsProps = {
  mode: SimulationMode
  simTimeMs: number
  paused: boolean
  disabled: boolean
  multiplier: TimeMultiplier
  multiplierOptions: readonly TimeMultiplier[]
  onMultiplierChange: (multiplier: TimeMultiplier) => void
  onPause: () => void
  onResume: () => void
};

export function TimeControls({
  mode,
  simTimeMs,
  paused,
  disabled,
  multiplier,
  multiplierOptions,
  onMultiplierChange,
  onPause,
  onResume,
}: TimeControlsProps) {
  const free = mode === "FREE";
  const limited = free && TIME_MULTIPLIERS.some((value) => !multiplierOptions.includes(value));

  return (
    <div className={cx(styles.timeControls)} role="group" aria-label={TIME_CONTROLS_COPY.label}>
      <p className={cx(styles.clock)}>
        <span className={cx(styles.clockLabel)}>{TIME_CONTROLS_COPY.clock}</span>
        <output className={cx(styles.clockValue)} aria-live="off">{formatSimTime(simTimeMs)}</output>
        {paused ? <span className={cx(styles.pausedTag)}>{TIME_CONTROLS_COPY.paused}</span> : null}
      </p>
      {free ? (
        <>
          <div className={cx(styles.speed)} role="group" aria-label={TIME_CONTROLS_COPY.speed}>
            {TIME_MULTIPLIERS.map((value) => (
              <button
                key={value}
                type="button"
                className={cx(styles.speedButton)}
                aria-pressed={value === multiplier}
                disabled={disabled || !multiplierOptions.includes(value)}
                onClick={() => onMultiplierChange(value)}
              >
                {TIME_MULTIPLIER_LABELS[value]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={cx(styles.timeButton)}
            disabled={disabled}
            onClick={paused ? onResume : onPause}
          >
            {paused ? <PlayArrowIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
            <span>{paused ? TIME_CONTROLS_COPY.resume : TIME_CONTROLS_COPY.pause}</span>
          </button>
          {limited ? <p className={cx(styles.timeHint)}>{TIME_CONTROLS_COPY.limited}</p> : null}
        </>
      ) : (
        <p className={cx(styles.timeHint)}>{TIME_CONTROLS_COPY.fixed(TIME_MULTIPLIER_LABELS[multiplier])}</p>
      )}
    </div>
  );
}
