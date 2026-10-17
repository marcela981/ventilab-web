/*
* Funcionalidad: Lazy live console
* Descripción: React.lazy boundary (with retryImport, inside Suspense with a LoadingState fallback, like the simulator lazy panels) around the live console, so the shared ventilator console, the waveform canvases and the real-ventilator adapter are a separate chunk loaded only when /lab/live shows the console; no other /lab page and not _app pulls them. Only a type is imported statically from the console module. Depends on React, the design-system LoadingState and retryImport.
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
import type { LiveConsoleProps } from "./live-console";

const LoadedLiveConsole = lazy(() =>
  retryImport(() => import("./live-console")).then((module) => ({ default: module.LiveConsole })),
);

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const LIVE_CONSOLE_LOADING_LABEL = "Cargando la consola…";

export function LazyLiveConsole(props: LiveConsoleProps) {
  return (
    <Suspense fallback={<LoadingState label={LIVE_CONSOLE_LOADING_LABEL} />}>
      <LoadedLiveConsole {...props} />
    </Suspense>
  );
}
