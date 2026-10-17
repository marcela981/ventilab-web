/*
* Funcionalidad: Lab recording playback page
* Descripción: /lab/recordings/[recordingId] (recordingId = reservationId): reads GET
*   /api/ventilator/telemetry/recordings/{reservationId} once (every frame in one response) and plays it in the shared
*   console, read-only, through the LAZY recording player (console, waveforms and Chart.js stay in that chunk). Header:
*   recording date (server time of the first frame), length, and the visible note "Datos submuestreados" with the
*   recording rate the backend reports (the source rate is not returned, so no factor is stated). States: skeleton;
*   403 (recording_forbidden) and 404 (reservation_not_found) with their Spanish message and the way back to the list;
*   other errors retryable; a reservation without recorded frames says so. There is no CSV export in the API, so none
*   is offered. Preemption notice and realtime revalidation as on every /lab page. Depends on MUI, next/head,
*   next/link, the design-system states, the date format helper, the lab routes, entities and hooks, the lazy player
*   and the recordings styles. v1.1 (T11 review fix): useRecording downloads without cache (aborted when leaving,
*   downloaded again on every visit) and indexes in chunks with the progress shown here ("Preparando la grabación…
*   N %"); only the index reaches the lazy player (no raw frames kept). The header uses the index: the date of the
*   first kept frame and `index.durationMs` (S4), which includes the gaps of the recording and says so with their
*   count and total length (S1).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import Head from "next/head";
import Link from "next/link";
import { useId } from "react";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { LazyRecordingPlayer } from "../components/lazy-recording-player";
import { LAB_RECORDINGS_URL } from "../config/lab.routes";
import { formatPlaybackClock } from "../entities/playback-engine";
import type { RecordingIndex } from "../entities/recording-index";
import { getRecordingErrorMessage } from "../entities/recordings-list.entity";
import { usePreemptionNotice } from "../hooks/use-preemption-notice";
import { useRecording } from "../hooks/use-recordings";
import { useReservationsRealtime } from "../hooks/use-reservations-realtime";
import styles from "../../UI/lab-recordings.module.css";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const LAB_RECORDING_COPY = {
  documentTitle: "Grabación | VentyLab",
  title: "Grabación de la sesión",
  subtitle: "Reproducción de la telemetría grabada del ventilador físico.",
  back: "Volver a las grabaciones",
  loading: "Cargando la grabación…",
  error: "No se pudo cargar la grabación",
  forbiddenTitle: "Sin acceso a la grabación",
  notFoundTitle: "Grabación no encontrada",
  emptyTitle: "Esta reserva no tiene grabación",
  emptyHint: "Nadie grabó la telemetría durante esta reserva (o todavía no se guardó ningún bloque).",
  recordedAt: (date: string) => `Grabada el ${date}`,
  length: (clock: string) => `Duración: ${clock}`,
  lengthWithGaps: (clock: string, gaps: number, gapsClock: string) =>
    `Duración: ${clock} (incluye ${gaps} ${gaps === 1 ? "intervalo" : "intervalos"} sin datos, ${gapsClock} en total)`,
  indexing: (percent: number) => `Preparando la grabación… ${percent} %`,
  subsampled: (hz: number | null) => (hz === null
    ? "Datos submuestreados por el servidor."
    : `Datos submuestreados por el servidor a ${String(hz).replace(".", ",")} Hz.`),
} as const;

function BackToList() {
  return <Button component={Link} href={LAB_RECORDINGS_URL}>{LAB_RECORDING_COPY.back}</Button>;
}

function MessageCard({ title, message }: { title: string, message: string }) {
  const titleId = useId();

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <h2 id={titleId} className={cx(styles.cardTitle)}>{title}</h2>
      <p className={cx(styles.muted)}>{message}</p>
      <BackToList />
    </section>
  );
}

function lengthText(index: RecordingIndex): string {
  const clock = formatPlaybackClock(index.durationMs);

  return index.gaps.length > 0
    ? LAB_RECORDING_COPY.lengthWithGaps(clock, index.gaps.length, formatPlaybackClock(index.gapsTotalMs))
    : LAB_RECORDING_COPY.length(clock);
}

function Playback({ index }: { index: RecordingIndex }) {
  return (
    <div className={cx(styles.session)}>
      <div className={cx(styles.sessionBar)}>
        <div>
          <h1 className={cx(styles.sessionTitle)}>{LAB_RECORDING_COPY.title}</h1>
          {index.startServerTs === null ? null : (
            <p className={cx(styles.sessionMeta)} data-testid="lab-recording-meta">
              {`${LAB_RECORDING_COPY.recordedAt(formatDateTime(new Date(index.startServerTs).toISOString()))} · ${lengthText(index)}`}
            </p>
          )}
        </div>
        <p className={cx(styles.subsampled)} data-testid="lab-recording-subsampled">
          {LAB_RECORDING_COPY.subsampled(index.sampleRateHz)}
        </p>
        <BackToList />
      </div>
      <LazyRecordingPlayer index={index} />
    </div>
  );
}

export type LabRecordingPageProps = { recordingId: string };

export function LabRecordingPage({ recordingId }: LabRecordingPageProps) {
  useReservationsRealtime();
  usePreemptionNotice();
  const { state, reload } = useRecording(recordingId);
  const error = state.status === "error" ? state.error : null;
  const status = error ? error.status : null;
  const index = state.status === "ready" ? state.index : null;
  const playable = index !== null && index.count > 0;

  return (
    <div className={cx(playable ? styles.consolePage : styles.page)}>
      <Head>
        <title>{LAB_RECORDING_COPY.documentTitle}</title>
      </Head>
      {playable ? null : <PageHeader title={LAB_RECORDING_COPY.title} subtitle={LAB_RECORDING_COPY.subtitle} actions={<BackToList />} />}
      {state.status === "loading" ? <CardSkeleton label={LAB_RECORDING_COPY.loading} /> : null}
      {state.status === "indexing" ? <LoadingState label={LAB_RECORDING_COPY.indexing(Math.floor(state.progress * 100))} /> : null}
      {error && status === 403 ? (
        <MessageCard title={LAB_RECORDING_COPY.forbiddenTitle} message={getRecordingErrorMessage(error)} />
      ) : null}
      {error && status === 404 ? (
        <MessageCard title={LAB_RECORDING_COPY.notFoundTitle} message={getRecordingErrorMessage(error)} />
      ) : null}
      {error && status !== 403 && status !== 404 ? (
        <ErrorState title={LAB_RECORDING_COPY.error} description={getRecordingErrorMessage(error)} onRetry={reload} />
      ) : null}
      {index && !playable ? <MessageCard title={LAB_RECORDING_COPY.emptyTitle} message={LAB_RECORDING_COPY.emptyHint} /> : null}
      {index && playable ? <Playback index={index} /> : null}
    </div>
  );
}
