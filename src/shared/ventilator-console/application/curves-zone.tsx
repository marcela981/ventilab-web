/*
* Funcionalidad: Console curves zone
* Descripción: Curves area of the ventilator console: one SweepCanvas with stacked pressure (cmH2O), flow (L/min) and volume (mL) lanes colored by the console curve tokens, plus a toolbar with the sweep/scroll toggle, the time-window selector, the freeze button (the frozen trace exposes the measurement cursor) and the P-V / F-V loop toggle rendered by LoopCanvas. Reads the waveform ring buffer directly. v1.1: an optional frame-source `status`; with `no-data` the last curves stay greyed under an overlay (role status) with the source message or a generic default, and the zone exposes `data-source-status`. Depends on React, MUI icons, @shared/waveforms and the console config. v1.2 (W3, Bloque 1): the sweep and loop canvases draw at the display refresh rate (no 30 fps cap) and by time, DEFAULT_PLAYBACK_DELAY_MS behind the newest sample, so the curves advance smoothly between the 30 Hz data batches.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AcUnitIcon from "@mui/icons-material/AcUnit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useState } from "react";
import { cx } from "@shared/lib/class-names";
import { DEFAULT_PLAYBACK_DELAY_MS, DISPLAY_REFRESH_FPS, LoopCanvas, SweepCanvas } from "@shared/waveforms";
import type { LoopAxis, SweepChannel, WaveformDisplayMode, WaveformRingBuffer } from "@shared/waveforms";
import { CONSOLE_CURVES, CONSOLE_NO_DATA_MESSAGE, CONSOLE_WINDOW_SECONDS, DEFAULT_CONSOLE_WINDOW_SECONDS } from "./config/console.config";
import type { CurveId } from "./config/console.config";
import type { ConsoleFrameStatus } from "./ventilator-console.entity";
import styles from "../UI/curves-zone.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const CURVES_COPY = {
  title: "Curvas",
  chartLabel: "Curvas de presión, flujo y volumen",
  displayMode: "Modo de trazado",
  sweep: "Barrido",
  scroll: "Desplazamiento",
  window: "Ventana de tiempo",
  freeze: "Congelar",
  resume: "Reanudar",
  freezeHint: "Curvas congeladas: mueve el cursor con el puntero o las flechas para medir.",
  loops: "Bucles",
  loopNone: "Sin bucle",
  loopPv: "P-V",
  loopFv: "F-V",
  pvLabel: "Bucle presión-volumen",
  fvLabel: "Bucle flujo-volumen",
} as const;

export type LoopKind = "none" | "pv" | "fv";

type LoopSetup = { x: LoopAxis<CurveId>, y: LoopAxis<CurveId>, colorVar: string, label: string };

const SWEEP_CHANNELS: readonly SweepChannel<CurveId>[] = CONSOLE_CURVES.map((curve) => ({ ...curve }));

const VOLUME_AXIS: LoopAxis<CurveId> = { key: "volume", label: "Volumen", unit: "mL" };

const LOOPS: Readonly<Record<Exclude<LoopKind, "none">, LoopSetup>> = {
  pv: {
    x: VOLUME_AXIS,
    y: { key: "pressure", label: "Presión", unit: "cmH2O" },
    colorVar: "--vl-console-curve-pressure",
    label: CURVES_COPY.pvLabel,
  },
  fv: {
    x: VOLUME_AXIS,
    y: { key: "flow", label: "Flujo", unit: "L/min" },
    colorVar: "--vl-console-curve-flow",
    label: CURVES_COPY.fvLabel,
  },
};

const DISPLAY_MODES: ReadonlyArray<{ id: WaveformDisplayMode, label: string }> = [
  { id: "sweep", label: CURVES_COPY.sweep },
  { id: "scroll", label: CURVES_COPY.scroll },
];

const LOOP_OPTIONS: ReadonlyArray<{ id: LoopKind, label: string }> = [
  { id: "none", label: CURVES_COPY.loopNone },
  { id: "pv", label: CURVES_COPY.loopPv },
  { id: "fv", label: CURVES_COPY.loopFv },
];

export type CurvesZoneProps = {
  buffer: WaveformRingBuffer<CurveId>
  /** Frame-source status (default `live`); `no-data` greys the curves under an overlay. */
  status?: ConsoleFrameStatus | undefined
  /** Overlay text while there is no data (default CONSOLE_NO_DATA_MESSAGE). */
  statusMessage?: string | undefined
  className?: string
};

type ToggleGroupProps<T extends string | number> = {
  label: string
  options: ReadonlyArray<{ id: T, label: string }>
  value: T
  onChange: (value: T) => void
};

function ToggleGroup<T extends string | number>({ label, options, value, onChange }: ToggleGroupProps<T>) {
  return (
    <div className={cx(styles.group)} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cx(styles.toggle)}
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const WINDOW_OPTIONS = CONSOLE_WINDOW_SECONDS.map((seconds) => ({ id: seconds as number, label: `${seconds} s` }));

export function CurvesZone({ buffer, status = "live", statusMessage, className }: CurvesZoneProps) {
  const [mode, setMode] = useState<WaveformDisplayMode>("sweep");
  const [windowSeconds, setWindowSeconds] = useState<number>(DEFAULT_CONSOLE_WINDOW_SECONDS);
  const [frozen, setFrozen] = useState(false);
  const [loop, setLoop] = useState<LoopKind>("none");
  const loopSetup = loop === "none" ? null : LOOPS[loop];

  return (
    <section className={cx(styles.zone, className)} aria-label={CURVES_COPY.title} data-source-status={status}>
      <div className={cx(styles.toolbar)}>
        <ToggleGroup label={CURVES_COPY.displayMode} options={DISPLAY_MODES} value={mode} onChange={setMode} />
        <ToggleGroup label={CURVES_COPY.window} options={WINDOW_OPTIONS} value={windowSeconds} onChange={setWindowSeconds} />
        <ToggleGroup label={CURVES_COPY.loops} options={LOOP_OPTIONS} value={loop} onChange={setLoop} />
        <button
          type="button"
          className={cx(styles.freeze)}
          aria-pressed={frozen}
          onClick={() => setFrozen((value) => !value)}
        >
          {frozen ? <PlayArrowIcon fontSize="small" /> : <AcUnitIcon fontSize="small" />}
          {frozen ? CURVES_COPY.resume : CURVES_COPY.freeze}
        </button>
      </div>
      {frozen ? <p className={cx(styles.hint)}>{CURVES_COPY.freezeHint}</p> : null}
      <div className={cx(styles.plots, loopSetup ? styles.withLoop : undefined)}>
        {status === "no-data" ? (
          <p className={cx(styles.overlay)} role="status">{statusMessage ?? CONSOLE_NO_DATA_MESSAGE}</p>
        ) : null}
        <SweepCanvas
          buffer={buffer}
          channels={SWEEP_CHANNELS}
          label={CURVES_COPY.chartLabel}
          mode={mode}
          windowSeconds={windowSeconds}
          frozen={frozen}
          fps={DISPLAY_REFRESH_FPS}
          playbackDelayMs={DEFAULT_PLAYBACK_DELAY_MS}
          className={cx(styles.sweep)}
        />
        {loopSetup ? (
          <LoopCanvas
            buffer={buffer}
            x={loopSetup.x}
            y={loopSetup.y}
            colorVar={loopSetup.colorVar}
            label={loopSetup.label}
            frozen={frozen}
            fps={DISPLAY_REFRESH_FPS}
            playbackDelayMs={DEFAULT_PLAYBACK_DELAY_MS}
            className={cx(styles.loop)}
          />
        ) : null}
      </div>
    </section>
  );
}
