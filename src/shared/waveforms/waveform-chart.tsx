/*
* Funcionalidad: WaveformChart
* Descripción: Single live line chart for pressure/flow/volume waveforms, shared by the simulator and the real ventilator. Chart.js is loaded lazily on mount; the chart is created once per mount and every new sample mutates its datasets and scales followed by `update("none")` (no re-creation, no animation). Colors come from the MUI palette CSS variables at runtime. Depends on chart.js (lazy), design-system and lib.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Chart, ChartConfiguration } from "chart.js";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { loadChart } from "./load-chart";
import { formatSeriesLabel, readWaveformChrome, resolveTimeRange, toChartDatasets } from "./waveform-data";
import type { WaveformChrome } from "./waveform-data";
import type { WaveformRange, WaveformSeries } from "./waveform.entity";
import styles from "./UI/waveform-chart.module.css";

type Point = { x: number, y: number };
type LineChart = Chart<"line", Point[]>;
type ScaleBounds = { min?: number, max?: number };
type ChartStatus = "loading" | "ready" | "error";

type ChartInput = {
  series: readonly WaveformSeries[]
  windowSeconds: number
  yRange: WaveformRange | undefined
};

export type WaveformChartProps = {
  series: readonly WaveformSeries[]
  windowSeconds?: number
  yRange?: WaveformRange
  label?: string
  className?: string
};

function buildConfig(input: ChartInput, chrome: WaveformChrome): ChartConfiguration<"line", Point[]> {
  const time = resolveTimeRange(input.series, input.windowSeconds);
  const axis = { ticks: { color: chrome.text, maxTicksLimit: 8 }, grid: { color: chrome.grid } };

  return {
    type: "line",
    data: { datasets: toChartDatasets(input.series, input.windowSeconds, chrome.colors) },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      normalized: true,
      interaction: { mode: "nearest", axis: "x", intersect: false },
      plugins: {
        legend: { display: input.series.length > 1, labels: { color: chrome.text } },
        decimation: { enabled: true, algorithm: "lttb", samples: 200 },
      },
      scales: {
        x: { type: "linear", min: time.min, max: time.max, ...axis },
        y: { type: "linear", ...(input.yRange ? { min: input.yRange.min, max: input.yRange.max } : {}), ...axis },
      },
      elements: { point: { radius: 0 }, line: { borderWidth: 1.8, tension: 0.15 } },
    },
  };
}

function setBounds(scale: ScaleBounds | undefined, range: WaveformRange | undefined) {
  if (!scale) {
    return;
  }

  if (range) {
    scale.min = range.min;
    scale.max = range.max;

    return;
  }

  delete scale.min;
  delete scale.max;
}

function applyInput(chart: LineChart, input: ChartInput, chrome: WaveformChrome) {
  const next = toChartDatasets(input.series, input.windowSeconds, chrome.colors);
  const current = chart.data.datasets;

  if (current.length === next.length) {
    next.forEach((dataset, index) => {
      const target = current[index];

      if (target) {
        target.data = dataset.data;
        target.label = dataset.label;
        target.borderColor = dataset.borderColor;
        target.backgroundColor = dataset.backgroundColor;
      }
    });
  } else {
    chart.data.datasets = next;
  }

  const scales = chart.options.scales as Record<string, ScaleBounds | undefined> | undefined;

  setBounds(scales?.["x"], resolveTimeRange(input.series, input.windowSeconds));
  setBounds(scales?.["y"], input.yRange);
  chart.update("none");
}

// TODO(i18n): move the copy to an i18next namespace once src/i18n is in scope.
export function WaveformChart({ series, windowSeconds = 10, yRange, label, className }: WaveformChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<LineChart | null>(null);
  const chromeRef = useRef<WaveformChrome | null>(null);
  const latestRef = useRef<ChartInput>({ series, windowSeconds, yRange });
  const [status, setStatus] = useState<ChartStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const ariaLabel = label ?? `Curva de ${series.map(formatSeriesLabel).join(", ")}`;

  useLayoutEffect(() => {
    latestRef.current = { series, windowSeconds, yRange };
  });

  useEffect(() => {
    let cancelled = false;

    loadChart()
      .then((ChartConstructor) => {
        const canvas = canvasRef.current;

        if (cancelled || !canvas) {
          return;
        }

        const chrome = readWaveformChrome();

        chromeRef.current = chrome;
        chartRef.current = new ChartConstructor(canvas, buildConfig(latestRef.current, chrome));
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    const chart = chartRef.current;
    const chrome = chromeRef.current;

    if (status !== "ready" || !chart || !chrome) {
      return;
    }

    applyInput(chart, { series, windowSeconds, yRange }, chrome);
  }, [series, windowSeconds, yRange, status]);

  const retry = () => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  };

  return (
    <div className={cx(styles.root, className)}>
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} className={styles.canvas}>
        {ariaLabel}
      </canvas>
      {status === "loading" ? (
        <div className={styles.overlay}>
          <LoadingState label="Cargando gráfica…" />
        </div>
      ) : null}
      {status === "error" ? (
        <div className={styles.overlay}>
          <ErrorState
            title="No se pudo cargar la gráfica"
            description="Revisa tu conexión e inténtalo de nuevo."
            onRetry={retry}
          />
        </div>
      ) : null}
    </div>
  );
}
