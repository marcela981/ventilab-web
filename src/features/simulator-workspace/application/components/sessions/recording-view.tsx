/*
* Funcionalidad: Recording view
* Descripción: Playback of one real-ventilator recording inside the Mis sesiones tab of /simulador (W9, Bloque 1;
*   `?tab=sesiones&recording=<reservationId>`): the lab downloads the recording (uncached, aborted when leaving) and
*   indexes it in chunks with its progress, then its LAZY read-only player plays it in the shared console (no control,
*   no command). Shows the recording date and length (gaps included, as the lab page does) and the states: loading,
*   preparing N %, 403 / 404 messages, retryable errors and a reservation without recorded frames. Depends on the lab
*   recordings entry point, the design-system states, the date format helper and the sessions styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import {
  formatPlaybackClock,
  getRecordingErrorMessage,
  LazyRecordingPlayer,
  useRecording,
} from "@features/ventilator-lab/recordings.entry";
import type { RecordingIndex } from "@features/ventilator-lab/recordings.entry";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import styles from "../../../UI/sessions/sessions-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const RECORDING_VIEW_COPY = {
  loading: "Cargando la grabación…",
  indexing: (percent: number) => `Preparando la grabación… ${percent} %`,
  error: "No se pudo cargar la grabación",
  empty: "Esta reserva no tiene grabación: nadie grabó la telemetría durante la sesión.",
  recordedAt: (date: string) => `Grabada el ${date}`,
  length: (clock: string, gaps: number) => (gaps === 0
    ? `Duración: ${clock}`
    : `Duración: ${clock} (incluye ${gaps} ${gaps === 1 ? "intervalo" : "intervalos"} sin datos)`),
} as const;

function RecordingMeta({ index }: { index: RecordingIndex }) {
  const length = RECORDING_VIEW_COPY.length(formatPlaybackClock(index.durationMs), index.gaps.length);

  return (
    <p className={cx(styles.muted)}>
      {index.startServerTs === null ? length : `${RECORDING_VIEW_COPY.recordedAt(formatDateTime(new Date(index.startServerTs).toISOString()))} · ${length}`}
    </p>
  );
}

export function RecordingView({ recordingId }: { recordingId: string }) {
  const { state, reload } = useRecording(recordingId);

  if (state.status === "loading") {
    return <LoadingState label={RECORDING_VIEW_COPY.loading} />;
  }

  if (state.status === "indexing") {
    return <LoadingState label={RECORDING_VIEW_COPY.indexing(Math.floor(state.progress * 100))} />;
  }

  if (state.status === "error") {
    const { status } = state.error;
    const description = getRecordingErrorMessage(state.error);

    // Access and existence do not change by retrying.
    return status === 403 || status === 404
      ? <ErrorState title={RECORDING_VIEW_COPY.error} description={description} />
      : <ErrorState title={RECORDING_VIEW_COPY.error} description={description} onRetry={reload} />;
  }

  if (state.index.count === 0) {
    return <p className={cx(styles.muted)} role="status">{RECORDING_VIEW_COPY.empty}</p>;
  }

  return (
    <div className={cx(styles.player)}>
      <RecordingMeta index={state.index} />
      <LazyRecordingPlayer index={state.index} />
    </div>
  );
}
