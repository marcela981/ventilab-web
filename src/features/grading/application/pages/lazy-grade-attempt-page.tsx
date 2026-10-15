/*
* Funcionalidad: GradeAttemptPage (lazy)
* Descripción: Lazy entry of the grade-attempt page for the thin route pages/grading/attempts/[attemptId].tsx: loads grade-attempt.page with React.lazy + retryImport inside RouteErrorBoundary and Suspense (LoadingState fallback), so the queue chunk does not carry the grading page. Depends on React, the design-system loading state and route error boundary and @shared/lib/retry-import.
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
import type { GradeAttemptPageProps } from "./grade-attempt.page";

const LoadedGradeAttemptPage = lazy(() =>
  retryImport(() => import("./grade-attempt.page")).then((module) => ({ default: module.GradeAttemptPage })),
);

// TODO(i18n): move to a grading namespace in src/i18n.
const LOADING_LABEL = "Cargando el intento…";

export function GradeAttemptPage(props: GradeAttemptPageProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
        <LoadedGradeAttemptPage {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
