/*
* Funcionalidad: Lazy evaluation builder page
* Descripción: On-demand entry point of the evaluation builder exported by the evaluation-authoring barrel: EvaluationBuilderPage (/evaluations/manage/new and /evaluations/manage/[id]/edit) loads its page module with React.lazy + retryImport (3 attempts with backoff) behind a LoadingState, inside a RouteErrorBoundary (a chunk that still fails shows "Recargar"). Because the barrel is shared with the list route, this keeps the builder code (Tiptap, drag and drop, the curriculum tree of @features/learning, the rubric editor) out of the /evaluations/manage list bundle. Same pattern as the groups lazy staff pages. Depends on React, @shared/design-system and @shared/lib.
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
import type { EvaluationBuilderPageProps } from "./evaluation-builder.page";

const LoadedEvaluationBuilderPage = lazy(() =>
  retryImport(() => import("./evaluation-builder.page")).then((module) => ({ default: module.EvaluationBuilderPage })),
);

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
const LOADING_LABEL = "Cargando el editor de evaluaciones…";

export function EvaluationBuilderPage({ evaluationId }: EvaluationBuilderPageProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
        <LoadedEvaluationBuilderPage evaluationId={evaluationId} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
