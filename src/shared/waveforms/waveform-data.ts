/*
* Funcionalidad: Waveform data mapping
* Descripción: Pure functions that turn typed series into Chart.js line datasets: time-window slicing ending at the latest sample, `{x, y}` points (pre-parsed, as decimation needs), labels with units, tone resolution (pressure/flow/volume defaults) and the visible time range. Reads palette CSS variables at runtime for the chart colors. No Chart.js import.
* Versión: 1.0
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

const DEFAULT_TONES: Record<string, WaveformTone> = {
  pressure: "error",
  flow: "info",
  volume: "success",
};

export function sliceToWindow(points: readonly WaveformPoint[], windowSeconds: number): WaveformPoint[] {
  const last = points[points.length - 1];

  if (!last) {
    return [];
  }

  const start = last.t - windowSeconds;

  return points.filter((point) => point.t >= start);
}

export function resolveTone(series: WaveformSeries, index: number): WaveformTone {
  return series.tone ?? DEFAULT_TONES[series.key] ?? WAVEFORM_TONES[index % WAVEFORM_TONES.length] ?? "primary";
}

export function formatSeriesLabel(series: WaveformSeries): string {
  return series.unit ? `${series.label} (${series.unit})` : series.label;
}

export function toChartDatasets(
  series: readonly WaveformSeries[],
  windowSeconds: number,
  colors: WaveformColors,
): WaveformDataset[] {
  return series.map((item, index) => {
    const color = colors[resolveTone(item, index)];

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

  return {
    colors,
    grid: readVariable(styles, "--mui-palette-divider"),
    text: readVariable(styles, "--mui-palette-text-secondary"),
  };
}
