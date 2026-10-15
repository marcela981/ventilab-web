/*
* Funcionalidad: BarChart
* Descripción: Shared accessible bar chart (vertical or horizontal) for static data such as grade histograms or per-question indices; meant to be reused by other dashboards. Chart.js is loaded lazily on mount (loadBarChart), the chart is rebuilt when its data changes and destroyed on unmount; bar, grid and text colors come from the MUI palette CSS variables at runtime. The figure has a visible title, the canvas is hidden from assistive technology and a visually hidden table (caption, description, one row per label, one column per dataset) carries the same values for screen readers. Loading and error (with retry) overlays. Depends on React, chart.js (lazy), the design-system loading and error states, @shared/lib and the CSS Module.
* Versión: 1.0
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
import { loadBarChart } from "./load-bar-chart";
import styles from "./UI/bar-chart.module.css";

type BarValues = (number | null)[];
type BarChartInstance = Chart<"bar", BarValues, string>;
type ChartStatus = "loading" | "ready" | "error";

// TODO(i18n): move the copy to an i18next namespace once src/i18n is in scope.
export const BAR_CHART_COPY = {
  loading: "Cargando gráfica…",
  errorTitle: "No se pudo cargar la gráfica",
  errorDescription: "Revisa tu conexión e inténtalo de nuevo.",
  category: "Categoría",
} as const;

const defaultFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

export type BarChartProps = {
  title: string
  description?: string
  labels: readonly string[]
  datasets: readonly BarDataset[]
  // Axis titles: the category axis and the value axis.
  categoryAxisLabel?: string
  valueAxisLabel?: string
  horizontal?: boolean
  // Upper bound of the value axis (e.g. 1 for a 0–1 index); the axis always starts at 0.
  valueMax?: number
  formatValue?: (value: number) => string
  className?: string
};

type ChartInput = {
  labels: readonly string[]
  datasets: readonly BarDataset[]
  categoryAxisLabel: string | undefined
  valueAxisLabel: string | undefined
  horizontal: boolean | undefined
  valueMax: number | undefined
  formatValue: ((value: number) => string) | undefined
};

function axisTitle(text: string | undefined, color: string) {
  return text ? { display: true, text, color } : { display: false };
}

function buildConfig(input: ChartInput, chrome: BarChartChrome): ChartConfiguration<"bar", BarValues, string> {
  const format = input.formatValue ?? ((value: number) => defaultFormat.format(value));
  const categoryAxis = {
    type: "category" as const,
    title: axisTitle(input.categoryAxisLabel, chrome.text),
    ticks: { color: chrome.text },
    grid: { display: false },
  };
  const valueAxis = {
    type: "linear" as const,
    beginAtZero: true,
    ...(input.valueMax === undefined ? {} : { max: input.valueMax }),
    title: axisTitle(input.valueAxisLabel, chrome.text),
    ticks: { color: chrome.text, callback: (value: string | number) => format(Number(value)) },
    grid: { color: chrome.grid },
  };

  return {
    type: "bar",
    data: {
      labels: [...input.labels],
      datasets: input.datasets.map((dataset, index) => {
        const color = chrome.colors[resolveBarTone(dataset, index)];

        return { label: dataset.label, data: [...dataset.values], backgroundColor: color, borderColor: color };
      }),
    },
    options: {
      indexAxis: input.horizontal ? "y" : "x",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: input.datasets.length > 1, labels: { color: chrome.text } },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label ?? ""}: ${formatBarValue(input.horizontal ? context.parsed.x : context.parsed.y, format)}`,
          },
        },
      },
      scales: input.horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis },
    },
  };
}

export function BarChart({ title, description, className, ...input }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<ChartStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const titleId = useId();
  const format = input.formatValue ?? ((value: number) => defaultFormat.format(value));
  const { labels, datasets, categoryAxisLabel, valueAxisLabel, horizontal, valueMax, formatValue } = input;

  useEffect(() => {
    let cancelled = false;
    let chart: BarChartInstance | null = null;

    loadBarChart()
      .then((ChartConstructor) => {
        const canvas = canvasRef.current;

        if (cancelled || !canvas) {
          return;
        }

        const config = buildConfig(
          { labels, datasets, categoryAxisLabel, valueAxisLabel, horizontal, valueMax, formatValue },
          readBarChartChrome(),
        );

        chart = new ChartConstructor(canvas, config) as BarChartInstance;
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
  }, [labels, datasets, categoryAxisLabel, valueAxisLabel, horizontal, valueMax, formatValue, attempt]);

  const retry = () => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  };

  return (
    <figure className={cx(styles.figure, className)} aria-labelledby={titleId}>
      <figcaption id={titleId} className={cx(styles.title)}>{title}</figcaption>
      <div className={cx(styles.plot, horizontal && styles.plotHorizontal)}>
        <canvas ref={canvasRef} aria-hidden="true" className={cx(styles.canvas)} />
        {status === "loading" ? (
          <div className={cx(styles.overlay)}>
            <LoadingState label={BAR_CHART_COPY.loading} />
          </div>
        ) : null}
        {status === "error" ? (
          <div className={cx(styles.overlay)}>
            <ErrorState title={BAR_CHART_COPY.errorTitle} description={BAR_CHART_COPY.errorDescription} onRetry={retry} />
          </div>
        ) : null}
      </div>
      <table className={cx(styles.visuallyHidden)}>
        <caption>{description ? `${title}. ${description}` : title}</caption>
        <thead>
          <tr>
            <th scope="col">{categoryAxisLabel ?? BAR_CHART_COPY.category}</th>
            {datasets.map((dataset) => <th key={dataset.label} scope="col">{dataset.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, row) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {datasets.map((dataset) => (
                <td key={dataset.label}>{formatBarValue(dataset.values[row] ?? null, format)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
