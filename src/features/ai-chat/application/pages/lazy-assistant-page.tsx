/*
* Funcionalidad: Lazy AssistantPage
* Descripción: Lazy entry point of the /assistant screen: loads assistant.page through React.lazy + retryImport inside RouteErrorBoundary and Suspense (LoadingState fallback), so importing the feature barrel does not bundle the screen, its list or the learning origin links. Depends on React, the design-system loading state and route error boundary and @shared/lib/retry-import.
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
import type { AssistantPageProps } from "./assistant.page";

const LoadedAssistantPage = lazy(() =>
  retryImport(() => import("./assistant.page")).then((module) => ({ default: module.AssistantPage })),
);

// TODO(i18n): move to an ai-chat namespace in src/i18n.
const LOADING_LABEL = "Cargando el asistente…";

export function AssistantPage(props: AssistantPageProps) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
        <LoadedAssistantPage {...props} />
      </Suspense>
    </RouteErrorBoundary>
  );
}
