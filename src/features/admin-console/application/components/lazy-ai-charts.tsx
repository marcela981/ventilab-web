/*
* Funcionalidad: AI analytics charts (lazy)
* Descripción: Lazy entries of the /admin/ai charts (AiTelemetryCharts and AiHelpfulChart): ai-charts loads with React.lazy + retryImport inside RouteErrorBoundary and Suspense (card skeleton fallback), so @shared/charts and Chart.js only reach a deferred chunk of /admin/ai (precedent: teacher-dashboard lazy-dashboard-charts). Depends on React, the design-system skeleton and route error boundary and @shared/lib/retry-import.
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
import type { AiHelpfulChartProps, AiTelemetryChartsProps } from "./ai-charts";

const loadCharts = () => retryImport(() => import("./ai-charts"));

const LoadedAiTelemetryCharts = lazy(() => loadCharts().then((module) => ({ default: module.AiTelemetryCharts })));

const LoadedAiHelpfulChart = lazy(() => loadCharts().then((module) => ({ default: module.AiHelpfulChart })));

// TODO(i18n): move to an admin-console namespace in src/i18n.
const LOADING_LABEL = "Cargando gráficas…";

export function AiTelemetryCharts(props: AiTelemetryChartsProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CardSkeleton label={LOADING_LABEL} />}>
        <LoadedAiTelemetryCharts {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function AiHelpfulChart(props: AiHelpfulChartProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CardSkeleton label={LOADING_LABEL} />}>
        <LoadedAiHelpfulChart {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
