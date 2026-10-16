/*
* Funcionalidad: LineChart
* Descripción: Shared accessible line chart for values over an ordered category axis (e.g. a metric over sampled
*   times), the line counterpart of BarChart with the same contract: Chart.js is loaded lazily on mount
*   (loadLineChart), the chart is rebuilt when its data changes and destroyed on unmount; line, point, grid and text
*   colors come from the MUI palette CSS variables at runtime (readBarChartChrome). A missing value (null) leaves a gap
*   in the line (no interpolated point). The figure has a visible title, the canvas is hidden from assistive technology
*   and a visually hidden table (caption, description, one row per label, one column per dataset) carries the same
*   values for screen readers. Loading and error (with retry) overlays. It reuses the BarChart model, helpers and
*   figure styles, so both charts look the same. Depends on React, chart.js (lazy), the design-system loading and
*   error states, @shared/lib and the bar chart CSS Module. v1.1 (review of 180a0a1): the fallback table uses
*   index-based keys (repeated labels are valid), and `formatValue` is read through a ref, so a new function identity
*   (an inline arrow) never rebuilds the chart; the tooltip and ticks always use the latest formatter.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useId, useRef, useState } from "react";
import type { Chart, ChartConfiguration } from "chart.js";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { formatBarValue, readBarChartChrome, resolveBarTone } from "./bar-chart.entity";
import type { BarChartChrome, BarDataset } from "./bar-chart.entity";
import { loadLineChart } from "./load-line-chart";
import styles from "./UI/bar-chart.module.css";

type LineValues = (number | null)[];
type LineChartInstance = Chart<"line", LineValues, string>;
type ChartStatus = "loading" | "ready" | "error";

// TODO(i18n): move the copy to an i18next namespace once src/i18n is in scope.
export const LINE_CHART_COPY = {
  loading: "Cargando gráfica…",
  errorTitle: "No se pudo cargar la gráfica",
  errorDescription: "Revisa tu conexión e inténtalo de nuevo.",
  category: "Categoría",
} as const;

const defaultFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

export type LineChartProps = {
  title: string
  description?: string
  labels: readonly string[]
  datasets: readonly BarDataset[]
  // Axis titles: the category axis (x) and the value axis (y).
  categoryAxisLabel?: string
  valueAxisLabel?: string
  // Value axis bounds; without them Chart.js fits the data (a line does not need to start at 0).
  valueMin?: number
  valueMax?: number
  formatValue?: (value: number) => string
  className?: string
};

type ChartInput = {
  labels: readonly string[]
  datasets: readonly BarDataset[]
  categoryAxisLabel: string | undefined
  valueAxisLabel: string | undefined
  valueMin: number | undefined
  valueMax: number | undefined
  formatValue: ((value: number) => string) | undefined
};

function axisTitle(text: string | undefined, color: string) {
  return text ? { display: true, text, color } : { display: false };
}

function buildConfig(input: ChartInput, chrome: BarChartChrome): ChartConfiguration<"line", LineValues, string> {
  const format = input.formatValue ?? ((value: number) => defaultFormat.format(value));

  return {
    type: "line",
    data: {
      labels: [...input.labels],
      datasets: input.datasets.map((dataset, index) => {
        const color = chrome.colors[resolveBarTone(dataset, index)];

        return {
          label: dataset.label,
          data: [...dataset.values],
          borderColor: color,
          backgroundColor: color,
          pointBackgroundColor: color,
          borderWidth: 2,
          pointRadius: 3,
          tension: 0,
          spanGaps: false,
        };
      }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: input.datasets.length > 1, labels: { color: chrome.text } },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label ?? ""}: ${formatBarValue(context.parsed.y, format)}`,
          },
        },
      },
      scales: {
        x: {
          type: "category",
          title: axisTitle(input.categoryAxisLabel, chrome.text),
          ticks: { color: chrome.text },
          grid: { display: false },
        },
        y: {
          type: "linear",
          ...(input.valueMin === undefined ? {} : { min: input.valueMin }),
          ...(input.valueMax === undefined ? {} : { max: input.valueMax }),
          title: axisTitle(input.valueAxisLabel, chrome.text),
          ticks: { color: chrome.text, callback: (value: string | number) => format(Number(value)) },
          grid: { color: chrome.grid },
        },
      },
    },
  };
}

export function LineChart({ title, description, className, ...input }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<ChartStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const titleId = useId();
  const format = input.formatValue ?? ((value: number) => defaultFormat.format(value));
  const { labels, datasets, categoryAxisLabel, valueAxisLabel, valueMin, valueMax, formatValue } = input;
  // The chart reads the latest formatter through this ref, so its identity is not a rebuild dependency.
  const formatRef = useRef(formatValue);

  useEffect(() => {
    formatRef.current = formatValue;
  });

  useEffect(() => {
    let cancelled = false;
    let chart: LineChartInstance | null = null;

    loadLineChart()
      .then((ChartConstructor) => {
        const canvas = canvasRef.current;

        if (cancelled || !canvas) {
          return;
        }

        const latestFormat = (value: number): string => (formatRef.current ?? ((raw: number) => defaultFormat.format(raw)))(value);
        const config = buildConfig(
          { labels, datasets, categoryAxisLabel, valueAxisLabel, valueMin, valueMax, formatValue: latestFormat },
          readBarChartChrome(),
        );

        chart = new ChartConstructor(canvas, config) as LineChartInstance;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      chart?.destroy();
      chart = null;
    };
  }, [labels, datasets, categoryAxisLabel, valueAxisLabel, valueMin, valueMax, attempt]);

  const retry = () => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  };

  return (
    <figure className={cx(styles.figure, className)} aria-labelledby={titleId}>
      <figcaption id={titleId} className={cx(styles.title)}>{title}</figcaption>
      <div className={cx(styles.plot)}>
        <canvas ref={canvasRef} aria-hidden="true" className={cx(styles.canvas)} />
        {status === "loading" ? (
          <div className={cx(styles.overlay)}>
            <LoadingState label={LINE_CHART_COPY.loading} />
          </div>
        ) : null}
        {status === "error" ? (
          <div className={cx(styles.overlay)}>
            <ErrorState title={LINE_CHART_COPY.errorTitle} description={LINE_CHART_COPY.errorDescription} onRetry={retry} />
          </div>
        ) : null}
      </div>
      <table className={cx(styles.visuallyHidden)}>
        <caption>{description ? `${title}. ${description}` : title}</caption>
        <thead>
          <tr>
            <th scope="col">{categoryAxisLabel ?? LINE_CHART_COPY.category}</th>
            {datasets.map((dataset, column) => <th key={`${column}:${dataset.label}`} scope="col">{dataset.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, row) => (
            <tr key={`${row}:${label}`}>
              <th scope="row">{label}</th>
              {datasets.map((dataset, column) => (
                <td key={`${column}:${dataset.label}`}>{formatBarValue(dataset.values[row] ?? null, format)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
