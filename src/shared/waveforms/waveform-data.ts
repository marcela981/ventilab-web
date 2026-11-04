/*
* Funcionalidad: Waveform data mapping
* Descripción: Pure functions that turn typed series into Chart.js line datasets: time-window slicing ending at the latest sample, `{x, y}` points (pre-parsed, as decimation needs), labels with units, tone resolution (pressure/flow/volume defaults) and the visible time range. Reads palette CSS variables at runtime for the chart colors. No Chart.js import. v1.1 (Bloque 5, D4): pressure/flow/volume series without an explicit tone take the console curve tokens (--vl-console-curve-*, July red/blue/green), read with the rest of the chrome, so Chart.js and the console canvases share one source; the previous error/info/success defaults are gone (a missing token falls back to the index tone).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { WAVEFORM_TONES } from "./waveform.entity";
import type { WaveformColors, WaveformPoint, WaveformRange, WaveformSeries, WaveformTone } from "./waveform.entity";

export type WaveformDataset = {
  label: string
  data: { x: number, y: number }[]
  borderColor: string
  backgroundColor: string
};

/** Curve tokens of the well-known series keys: the same colors as the console canvases (D4). */
const CURVE_COLOR_VARS: Record<string, string> = {
  pressure: "--vl-console-curve-pressure",
  flow: "--vl-console-curve-flow",
  volume: "--vl-console-curve-volume",
};

/** Resolved curve colors by series key (read from the CSS tokens at runtime). */
export type WaveformCurveColors = Partial<Record<string, string>>;

export function sliceToWindow(points: readonly WaveformPoint[], windowSeconds: number): WaveformPoint[] {
  const last = points[points.length - 1];

  if (!last) {
    return [];
  }

  const start = last.t - windowSeconds;

  return points.filter((point) => point.t >= start);
}

export function resolveTone(series: WaveformSeries, index: number): WaveformTone {
  return series.tone ?? WAVEFORM_TONES[index % WAVEFORM_TONES.length] ?? "primary";
}

export function formatSeriesLabel(series: WaveformSeries): string {
  return series.unit ? `${series.label} (${series.unit})` : series.label;
}

export function toChartDatasets(
  series: readonly WaveformSeries[],
  windowSeconds: number,
  colors: WaveformColors,
  curves: WaveformCurveColors = {},
): WaveformDataset[] {
  return series.map((item, index) => {
    // An explicit tone wins; otherwise a known curve key takes its console token.
    const curve = item.tone ? undefined : curves[item.key];
    const color = curve || colors[resolveTone(item, index)];

    return {
      label: formatSeriesLabel(item),
      data: sliceToWindow(item.points, windowSeconds).map((point) => ({ x: point.t, y: point.v })),
      borderColor: color,
      backgroundColor: color,
    };
  });
}

export function resolveTimeRange(series: readonly WaveformSeries[], windowSeconds: number): WaveformRange {
  const lastTimes = series.flatMap((item) => {
    const last = item.points[item.points.length - 1];

    return last ? [last.t] : [];
  });

  if (lastTimes.length === 0) {
    return { min: 0, max: windowSeconds };
  }

  const max = Math.max(windowSeconds, ...lastTimes);

  return { min: max - windowSeconds, max };
}

export type WaveformChrome = {
  colors: WaveformColors
  curves: WaveformCurveColors
  grid: string
  text: string
};

function readVariable(styles: CSSStyleDeclaration, name: string): string {
  return styles.getPropertyValue(name).trim();
}

export function readWaveformChrome(element: Element = document.documentElement): WaveformChrome {
  const styles = getComputedStyle(element);
  const colors = Object.fromEntries(
    WAVEFORM_TONES.map((tone) => [tone, readVariable(styles, `--mui-palette-${tone}-main`)]),
  ) as WaveformColors;

  const curves: WaveformCurveColors = Object.fromEntries(
    Object.entries(CURVE_COLOR_VARS).map(([key, name]) => [key, readVariable(styles, name)]),
  );

  return {
    colors,
    curves,
    grid: readVariable(styles, "--mui-palette-divider"),
    text: readVariable(styles, "--mui-palette-text-secondary"),
  };
}
