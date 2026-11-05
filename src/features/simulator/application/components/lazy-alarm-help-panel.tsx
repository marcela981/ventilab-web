/*
* Funcionalidad: Lazy alarm help panel
* Descripción: Lazy entry point of the "¿Cómo estabilizar?" alarm help panel (Bloque A): loads alarm-help-panel through
*   React.lazy + retryImport inside Suspense (LoadingState fallback), like the assist panel, so the console chunk does
*   not bundle the AI conversation UI or the rating widget until an alarm is clicked. Depends on React, the
*   design-system loading state and @shared/lib/retry-import.
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
import type { AlarmHelpPanelProps } from "./alarm-help-panel";

const LoadedAlarmHelpPanel = lazy(() =>
  retryImport(() => import("./alarm-help-panel")).then((module) => ({ default: module.AlarmHelpPanel })),
);

// TODO(i18n): move to a simulator namespace in src/i18n.
const LOADING_LABEL = "Cargando la ayuda de la alarma…";

export function AlarmHelpPanel(props: AlarmHelpPanelProps) {
  return (
    <Suspense fallback={<LoadingState label={LOADING_LABEL} />}>
      <LoadedAlarmHelpPanel {...props} />
    </Suspense>
  );
}
