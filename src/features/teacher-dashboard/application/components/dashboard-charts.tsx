/*
* Funcionalidad: DashboardCharts
* Descripción: Charts of /teacher drawn with the shared BarChart: the grade distribution of the selected evaluation exactly as the API buckets it (`GET /api/analytics/evaluations/{id}/stats` histogram, labels such as "3,0–3,5", graded attempts per bucket; the passing grade of the API in the description) and the module progress of the selected student (each module percentage straight from the dashboard row, in curriculum order, on a 0–100 axis). Nothing is computed here, only labeled and formatted. Loaded lazily so Chart.js stays in a deferred chunk. Depends on React, @shared/charts, @shared/lib/format, the teacher dashboard entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import { BarChart } from "@shared/charts";
import type { BarDataset } from "@shared/charts";
import { formatGrade } from "@shared/lib/format";
import type { ModuleProgressPoint } from "../entities/curriculum-titles.entity";
import { formatCount, formatPercent } from "../entities/teacher-dashboard-labels";
import type { HistogramBin } from "../entities/teacher-dashboard.entity";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const DASHBOARD_CHARTS_COPY = {
  histogramTitle: (title: string) => `Distribución de notas: ${title}`,
  histogramDescription: (passingGrade: string) => `Intentos calificados por rango de nota (calculado por el servidor). Nota de aprobación: ${passingGrade}.`,
  histogramCategory: "Nota",
  histogramValue: "Intentos",
  modulesTitle: (name: string) => `Progreso por módulo: ${name}`,
  modulesDescription: "Porcentaje de lecciones completadas en cada módulo, según la API.",
  modulesCategory: "Módulo",
  modulesValue: "Progreso",
} as const;

export type GradeDistributionChartProps = {
  title: string
  passingGrade: number
  histogram: readonly HistogramBin[]
};

export function GradeDistributionChart({ title, passingGrade, histogram }: GradeDistributionChartProps) {
  const labels = useMemo(() => histogram.map((bin) => `${formatGrade(bin.from)}–${formatGrade(bin.to)}`), [histogram]);
  const datasets = useMemo<BarDataset[]>(
    () => [{ label: DASHBOARD_CHARTS_COPY.histogramValue, values: histogram.map((bin) => bin.count), tone: "primary" }],
    [histogram],
  );

  return (
    <BarChart
      title={DASHBOARD_CHARTS_COPY.histogramTitle(title)}
      description={DASHBOARD_CHARTS_COPY.histogramDescription(formatGrade(passingGrade))}
      labels={labels}
      datasets={datasets}
      categoryAxisLabel={DASHBOARD_CHARTS_COPY.histogramCategory}
      valueAxisLabel={DASHBOARD_CHARTS_COPY.histogramValue}
      formatValue={formatCount}
    />
  );
}

export type ModuleProgressChartProps = {
  studentName: string
  modules: readonly ModuleProgressPoint[]
};

export function ModuleProgressChart({ studentName, modules }: ModuleProgressChartProps) {
  const labels = useMemo(() => modules.map((module) => module.title), [modules]);
  const datasets = useMemo<BarDataset[]>(
    () => [{ label: DASHBOARD_CHARTS_COPY.modulesValue, values: modules.map((module) => module.percentage), tone: "secondary" }],
    [modules],
  );

  return (
    <BarChart
      title={DASHBOARD_CHARTS_COPY.modulesTitle(studentName)}
      description={DASHBOARD_CHARTS_COPY.modulesDescription}
      labels={labels}
      datasets={datasets}
      categoryAxisLabel={DASHBOARD_CHARTS_COPY.modulesCategory}
      valueAxisLabel={DASHBOARD_CHARTS_COPY.modulesValue}
      valueMax={100}
      formatValue={formatPercent}
      horizontal
    />
  );
}
