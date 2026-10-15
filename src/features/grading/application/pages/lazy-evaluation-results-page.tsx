/*
* Funcionalidad: EvaluationResultsPage (lazy)
* Descripción: Lazy entry of the evaluation results page for the thin route pages/grading/evaluations/[evaluationId].tsx: loads evaluation-results.page with React.lazy + retryImport inside RouteErrorBoundary and Suspense (LoadingState fallback), so neither the queue nor the barrel carries it; its charts are a further lazy chunk. Depends on React, the design-system loading state and route error boundary and @shared/lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { retryImport } from "@shared/lib/retry-import";
import type { EvaluationResultsPageProps } from "./evaluation-results.page";

const LoadedEvaluationResultsPage = lazy(() =>
  retryImport(() => import("./evaluation-results.page")).then((module) => ({ default: module.EvaluationResultsPage })),
);

// TODO(i18n): move to a grading namespace in src/i18n.
const LOADING_LABEL = "Cargando los resultados…";

export function EvaluationResultsPage(props: EvaluationResultsPageProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
        <LoadedEvaluationResultsPage {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
