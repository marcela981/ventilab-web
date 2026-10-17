/*
* Funcionalidad: Lazy recording player
* Descripción: React.lazy boundary (with retryImport and a Suspense loading state) of the recording player, so the
*   shared ventilator console, the waveforms and Chart.js are loaded only by /lab/recordings/[recordingId] (and
*   /lab/live through its own boundary), never by the other /lab pages. Depends on React, the design-system loading
*   state and the retry import helper.
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
import type { RecordingPlayerProps } from "./recording-player";

const LoadedRecordingPlayer = lazy(() =>
  retryImport(() => import("./recording-player")).then((module) => ({ default: module.RecordingPlayer })),
);

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const RECORDING_PLAYER_LOADING_LABEL = "Cargando el reproductor…";

export function LazyRecordingPlayer(props: RecordingPlayerProps) {
  return (
    <Suspense fallback={<LoadingState label={RECORDING_PLAYER_LOADING_LABEL} />}>
      <LoadedRecordingPlayer {...props} />
    </Suspense>
  );
}
