/*
* Funcionalidad: Lazy simulator AI assist panel
* Descripción: Lazy entry point of the AI assist panel of the running console: loads assist-panel through React.lazy +
*   retryImport inside Suspense (LoadingState fallback), like the AI chat drawer, so the console chunk does not bundle
*   the AI conversation UI, the rating widget or their dependencies until the student opens the panel. Depends on
*   React, the design-system loading state and @shared/lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { retryImport } from "@shared/lib/retry-import";
import type { AssistPanelProps } from "./assist-panel";

const LoadedAssistPanel = lazy(() =>
  retryImport(() => import("./assist-panel")).then((module) => ({ default: module.AssistPanel })),
);

// TODO(i18n): move to a simulator namespace in src/i18n.
const LOADING_LABEL = "Cargando la asesoría…";

export function AssistPanel(props: AssistPanelProps) {
  return (
    <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
      <LoadedAssistPanel {...props} />
    </Suspense>
  );
}
