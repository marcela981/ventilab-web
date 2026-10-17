/*
* Funcionalidad: Dashboard charts (lazy)
* Descripción: Lazy entries of the /teacher charts (GradeDistributionChart and ModuleProgressChart): dashboard-charts loads with React.lazy + retryImport inside RouteErrorBoundary and Suspense (card skeleton fallback), so @shared/charts and Chart.js only reach a deferred chunk of /teacher (precedent: grading lazy-evaluation-results-charts). Depends on React, the design-system skeleton and route error boundary and @shared/lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { retryImport } from "@shared/lib/retry-import";
import type { GradeDistributionChartProps, ModuleProgressChartProps } from "./dashboard-charts";

const loadCharts = () => retryImport(() => import("./dashboard-charts"));

const LoadedGradeDistributionChart = lazy(() => loadCharts().then((module) => ({ default: module.GradeDistributionChart })));

const LoadedModuleProgressChart = lazy(() => loadCharts().then((module) => ({ default: module.ModuleProgressChart })));

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
const LOADING_LABEL = "Cargando gráfica…";

export function GradeDistributionChart(props: GradeDistributionChartProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CardSkeleton label={LOADING_LABEL} />}>
        <LoadedGradeDistributionChart {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function ModuleProgressChart(props: ModuleProgressChartProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CardSkeleton label={LOADING_LABEL} />}>
        <LoadedModuleProgressChart {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
