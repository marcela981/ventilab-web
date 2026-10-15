/*
* Funcionalidad: Lazy evaluation assignments page
* Descripción: On-demand entry point of the activations page exported by the evaluation-authoring barrel: EvaluationAssignmentsPage (/evaluations/manage/[evaluationId]/assignments) loads its page module with React.lazy + retryImport (3 attempts with backoff) behind a LoadingState, inside a RouteErrorBoundary (a chunk that still fails shows "Recargar"). Keeps the activations table and dialog out of the list and builder bundles. Same pattern as lazy-builder-page. Depends on React, @shared/design-system and @shared/lib.
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
import type { EvaluationAssignmentsPageProps } from "./evaluation-assignments.page";

const LoadedEvaluationAssignmentsPage = lazy(() =>
  retryImport(() => import("./evaluation-assignments.page")).then((module) => ({ default: module.EvaluationAssignmentsPage })),
);

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
const LOADING_LABEL = "Cargando las activaciones…";

export function EvaluationAssignmentsPage({ evaluationId }: EvaluationAssignmentsPageProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
        <LoadedEvaluationAssignmentsPage evaluationId={evaluationId} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
