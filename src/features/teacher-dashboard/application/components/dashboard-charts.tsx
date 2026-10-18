/*
* Funcionalidad: DashboardCharts
* Descripción: Charts of /teacher drawn with the shared BarChart: the grade distribution of the selected evaluation exactly as the API buckets it (`GET /api/analytics/evaluations/{id}/stats` histogram, labels such as "3,0–3,5", graded attempts per bucket; the passing grade of the API in the description) and the module progress of the selected student (each module percentage straight from the dashboard row, in curriculum order, on a 0–100 axis). Nothing is computed here, only labeled and formatted. Loaded lazily so Chart.js stays in a deferred chunk. Depends on React, @shared/charts, @shared/lib/format, the teacher dashboard entities and CSS Module. v1.1 (closure B2): GroupModuleProgressChart draws the group's average progress per module computed by the API (`moduleSummary`), and the histogram description says it covers the selected group.
* Versión: 1.1
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
  histogramDescription: (passingGrade: string) => `Intentos calificados del grupo por rango de nota (calculado por el servidor). Nota de aprobación: ${passingGrade}.`,
  groupModulesTitle: (group: string) => `Progreso promedio por módulo: ${group}`,
  groupModulesDescription: "Promedio del porcentaje de lecciones completadas por los estudiantes del grupo en cada módulo, calculado por el servidor.",
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

export type GroupModuleProgressChartProps = {
  groupName: string
  modules: readonly ModuleProgressPoint[]
};

export function GroupModuleProgressChart({ groupName, modules }: GroupModuleProgressChartProps) {
  const labels = useMemo(() => modules.map((module) => module.title), [modules]);
  const datasets = useMemo<BarDataset[]>(
    () => [{ label: DASHBOARD_CHARTS_COPY.modulesValue, values: modules.map((module) => module.percentage), tone: "primary" }],
    [modules],
  );

  return (
    <BarChart
      title={DASHBOARD_CHARTS_COPY.groupModulesTitle(groupName)}
      description={DASHBOARD_CHARTS_COPY.groupModulesDescription}
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
