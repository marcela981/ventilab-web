/*
* Funcionalidad: EvaluationResultsCharts (lazy)
* Descripción: Lazy entry of the results charts: loads evaluation-results-charts with React.lazy + retryImport inside RouteErrorBoundary and Suspense (card skeleton fallback), so @shared/charts and Chart.js only reach a deferred chunk of /grading/evaluations/[evaluationId]. Depends on React, the design-system skeleton and route error boundary and @shared/lib/retry-import.
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
import type { EvaluationResultsChartsProps } from "./evaluation-results-charts";

const LoadedEvaluationResultsCharts = lazy(() =>
  retryImport(() => import("./evaluation-results-charts")).then((module) => ({ default: module.EvaluationResultsCharts })),
);

// TODO(i18n): move to a grading namespace in src/i18n.
const LOADING_LABEL = "Cargando gráficas…";

export function EvaluationResultsCharts(props: EvaluationResultsChartsProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<CardSkeleton label={LOADING_LABEL} />}>
        <LoadedEvaluationResultsCharts {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
