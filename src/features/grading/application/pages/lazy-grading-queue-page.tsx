/*
* Funcionalidad: Lazy GradingQueuePage
* Descripción: Lazy entry point of the /grading queue page: loads grading-queue.page through React.lazy + retryImport inside RouteErrorBoundary and Suspense (LoadingState fallback), so the feature barrel stays light for pages/_app.js, which imports the barrel only for the pending-grading badge. Depends on React, the design-system loading state and route error boundary and @shared/lib/retry-import.
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
import type { GradingQueuePageProps } from "./grading-queue.page";

const LoadedGradingQueuePage = lazy(() =>
  retryImport(() => import("./grading-queue.page")).then((module) => ({ default: module.GradingQueuePage })),
);

// TODO(i18n): move to a grading namespace in src/i18n.
const LOADING_LABEL = "Cargando la cola de calificación…";

export function GradingQueuePage(props: GradingQueuePageProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
        <LoadedGradingQueuePage {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
