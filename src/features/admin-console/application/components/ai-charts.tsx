/*
* Funcionalidad: AI analytics charts
* Descripción: Charts of /admin/ai drawn with the shared LineChart and BarChart: per UTC day of `GET /api/admin/ai-telemetry/stats` (`days[]` exactly as returned, in API order) calls and provider calls, latency p50/p95, time to first token p50/p95 (a day without the percentile leaves a gap), error and fallback rates (the API 0–1 rate shown as a percentage), input/output tokens and estimated cost; and the helpful rate of each rating group of `GET /api/admin/ai-ratings/stats` (horizontal bars). Nothing is computed, only labeled and formatted. Loaded lazily so Chart.js stays in a deferred chunk. Depends on React, @shared/charts and the admin console entities and DTOs.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import { BarChart, LineChart } from "@shared/charts";
import type { BarDataset } from "@shared/charts";
import type { AiTelemetryDayMetricsDTO } from "../../api/dtos/admin-console.dto";
import { formatCount, formatMs, formatUsd, formatUtcDay } from "../entities/admin-format";
import { ratingGroupLabel } from "../entities/ai-analytics.entity";
import type { AiRatingGroup } from "../entities/ai-analytics.entity";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const AI_CHARTS_COPY = {
  day: "Día (UTC)",
  callsTitle: "Llamadas por día",
  calls: "Llamadas registradas",
  providerCalls: "Llamadas a proveedor",
  latencyTitle: "Latencia por día",
  ttftTitle: "Tiempo al primer token por día",
  p50: "p50",
  p95: "p95",
  ms: "Milisegundos",
  ratesTitle: "Tasa de error y de respaldo por día",
  errorRate: "Error",
  fallbackRate: "Respaldo",
  percent: "Porcentaje",
  tokensTitle: "Tokens por día",
  inputTokens: "Entrada",
  outputTokens: "Salida",
  tokens: "Tokens",
  costTitle: "Costo estimado por día",
  cost: "USD",
  helpfulTitle: "Calificaciones útiles por grupo",
  helpfulDescription: "Porcentaje de calificaciones marcadas como útiles en cada grupo (calculado por el servidor).",
  helpful: "Útil",
  group: "Grupo",
} as const;

const formatPercentValue = (value: number): string => `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value)} %`;

function series(days: readonly AiTelemetryDayMetricsDTO[], read: (day: AiTelemetryDayMetricsDTO) => number | undefined): (number | null)[] {
  return days.map((day) => read(day) ?? null);
}

export type AiTelemetryChartsProps = {
  days: readonly AiTelemetryDayMetricsDTO[]
};

export function AiTelemetryCharts({ days }: AiTelemetryChartsProps) {
  const labels = useMemo(() => days.map((day) => formatUtcDay(day.day)), [days]);
  const calls = useMemo<BarDataset[]>(() => [
    { label: AI_CHARTS_COPY.calls, values: series(days, (day) => day.calls), tone: "primary" },
    { label: AI_CHARTS_COPY.providerCalls, values: series(days, (day) => day.providerCalls), tone: "secondary" },
  ], [days]);
  const latency = useMemo<BarDataset[]>(() => [
    { label: AI_CHARTS_COPY.p50, values: series(days, (day) => day.latencyP50Ms), tone: "primary" },
    { label: AI_CHARTS_COPY.p95, values: series(days, (day) => day.latencyP95Ms), tone: "warning" },
  ], [days]);
  const ttft = useMemo<BarDataset[]>(() => [
    { label: AI_CHARTS_COPY.p50, values: series(days, (day) => day.ttftP50Ms), tone: "primary" },
    { label: AI_CHARTS_COPY.p95, values: series(days, (day) => day.ttftP95Ms), tone: "warning" },
  ], [days]);
  // Display only: the API 0–1 rates as percentages.
  const rates = useMemo<BarDataset[]>(() => [
    { label: AI_CHARTS_COPY.errorRate, values: series(days, (day) => day.errorRate * 100), tone: "error" },
    { label: AI_CHARTS_COPY.fallbackRate, values: series(days, (day) => day.fallbackRate * 100), tone: "warning" },
  ], [days]);
  const tokens = useMemo<BarDataset[]>(() => [
    { label: AI_CHARTS_COPY.inputTokens, values: series(days, (day) => day.inputTokens), tone: "primary" },
    { label: AI_CHARTS_COPY.outputTokens, values: series(days, (day) => day.outputTokens), tone: "secondary" },
  ], [days]);
  const cost = useMemo<BarDataset[]>(() => [
    { label: AI_CHARTS_COPY.cost, values: series(days, (day) => day.costUsd), tone: "primary" },
  ], [days]);

  return (
    <>
      <LineChart title={AI_CHARTS_COPY.callsTitle} labels={labels} datasets={calls} categoryAxisLabel={AI_CHARTS_COPY.day} formatValue={formatCount} valueMin={0} />
      <LineChart title={AI_CHARTS_COPY.latencyTitle} labels={labels} datasets={latency} categoryAxisLabel={AI_CHARTS_COPY.day} valueAxisLabel={AI_CHARTS_COPY.ms} formatValue={formatMs} valueMin={0} />
      <LineChart title={AI_CHARTS_COPY.ttftTitle} labels={labels} datasets={ttft} categoryAxisLabel={AI_CHARTS_COPY.day} valueAxisLabel={AI_CHARTS_COPY.ms} formatValue={formatMs} valueMin={0} />
      <LineChart
        title={AI_CHARTS_COPY.ratesTitle}
        labels={labels}
        datasets={rates}
        categoryAxisLabel={AI_CHARTS_COPY.day}
        valueAxisLabel={AI_CHARTS_COPY.percent}
        formatValue={formatPercentValue}
        valueMin={0}
        valueMax={100}
      />
      <BarChart title={AI_CHARTS_COPY.tokensTitle} labels={labels} datasets={tokens} categoryAxisLabel={AI_CHARTS_COPY.day} valueAxisLabel={AI_CHARTS_COPY.tokens} formatValue={formatCount} />
      <BarChart title={AI_CHARTS_COPY.costTitle} labels={labels} datasets={cost} categoryAxisLabel={AI_CHARTS_COPY.day} valueAxisLabel={AI_CHARTS_COPY.cost} formatValue={formatUsd} />
    </>
  );
}

export type AiHelpfulChartProps = {
  groups: readonly AiRatingGroup[]
};

export function AiHelpfulChart({ groups }: AiHelpfulChartProps) {
  const labels = useMemo(() => groups.map(ratingGroupLabel), [groups]);
  // Display only: the API helpfulRate (0–1) as a percentage.
  const datasets = useMemo<BarDataset[]>(
    () => [{ label: AI_CHARTS_COPY.helpful, values: groups.map((group) => group.helpfulRate * 100), tone: "success" }],
    [groups],
  );

  return (
    <BarChart
      title={AI_CHARTS_COPY.helpfulTitle}
      description={AI_CHARTS_COPY.helpfulDescription}
      labels={labels}
      datasets={datasets}
      categoryAxisLabel={AI_CHARTS_COPY.group}
      valueAxisLabel={AI_CHARTS_COPY.helpful}
      valueMax={100}
      formatValue={formatPercentValue}
      horizontal
    />
  );
}
