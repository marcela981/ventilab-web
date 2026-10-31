/*
* Funcionalidad: Lazy EvaluationGradingPage
* Descripción: Lazy entry point of the unified grading screen /grading/evaluations/[evaluationId] (Bloque 3, W7): loads the page chunk with React.lazy + retryImport inside its own error boundary and loading state, so importing the grading entry points does not bundle the screen. Depends on React, the design-system loading state and error boundary and @shared/lib.
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
import type { EvaluationGradingPageProps } from "./evaluation-grading.page";

const LoadedEvaluationGradingPage = lazy(() =>
  retryImport(() => import("./evaluation-grading.page")).then((module) => ({ default: module.EvaluationGradingPage })),
);

// TODO(i18n): move to a grading namespace in src/i18n.
const LOADING_LABEL = "Cargando la calificación…";

export function EvaluationGradingPage(props: EvaluationGradingPageProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
        <LoadedEvaluationGradingPage {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
