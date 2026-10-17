/*
* Funcionalidad: Recordings hooks
* Descripción: useRecordingsList reads one 31-day window of the calendar (GET /api/reservations, the only source the
*   contract offers for a list: there is no recordings list endpoint) and turns it into recording rows for the session
*   role (recordings-list entity); `nowMs` is fixed by the page so the window keys stay stable. useRecording reads ONE
*   recording (GET /api/ventilator/telemetry/recordings/{reservationId}: every frame in one response). v1.1 (T11 review
*   fix W1/W2): the download no longer goes through SWR: it runs in an effect with an AbortController (aborted on
*   unmount, on a new id and on reload), outside every cache, and again on every visit (a recording opened while the
*   reservation was in progress is never served truncated from a cache); the frames are indexed in chunks of
*   RECORDING_INDEX_CHUNK (setTimeout 0 between chunks: progress, then the index) and only the index is kept: the raw
*   frames live in the effect closure until indexed and are then dropped. Depends on React, the api-client query hook
*   and error, the session, the reservations and recording services, the reservations mapper, the recording index and
*   the recordings list entity.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toApiError } from "@shared/api-client/api-error";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { useSession } from "@shared/session/use-session";
import type { ReservationProjectionDTO } from "../../api/dtos/lab.dto";
import { toLabReservation } from "../../api/mappers/reservations.mapper";
import { calendarQuery, RESERVATIONS_PATH } from "../../api/services/reservations.service";
import { fetchTelemetryRecording } from "../../api/services/telemetry-recording.service";
import { createRecordingIndexer, RECORDING_INDEX_CHUNK } from "../entities/recording-index";
import type { RecordingIndex, RecordingSource } from "../entities/recording-index";
import { RECORDING_STAFF_ROLES, recordingRows, recordingsRange } from "../entities/recordings-list.entity";
import type { RecordingRow, RecordingsRange } from "../entities/recordings-list.entity";

export type RecordingsListResult = {
  rows: RecordingRow[] | null
  range: RecordingsRange
  staff: boolean
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useRecordingsList(page: number, nowMs: number): RecordingsListResult {
  const { role } = useSession();
  const staff = role !== null && role !== undefined && RECORDING_STAFF_ROLES.has(role);
  const range = useMemo(() => recordingsRange(nowMs, page), [nowMs, page]);
  const query = useMemo(() => calendarQuery(range.from, range.to), [range]);
  const { data, error, isLoading, mutate } = useApiQuery(RESERVATIONS_PATH, { query }, { revalidateOnFocus: false });
  const rows = useMemo(
    () => (data ? recordingRows((data.data as ReservationProjectionDTO[]).map(toLabReservation), { nowMs, range, staff }) : null),
    [data, nowMs, range, staff],
  );
  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { rows, range, staff, isLoading, error: error ?? null, reload };
}

export type RecordingLoadState =
  | { status: "loading" }
  | { status: "indexing", progress: number }
  | { status: "ready", index: RecordingIndex }
  | { status: "error", error: ApiError };

export type RecordingResult = {
  state: RecordingLoadState
  /** Downloads the recording again. */
  reload: () => void
};

export type RecordingLoader = (reservationId: string, signal: AbortSignal) => Promise<RecordingSource>;

export type UseRecordingOptions = {
  /** Injectable for tests; default the uncached service read. */
  load?: RecordingLoader
  chunkSize?: number
};

const LOADING: RecordingLoadState = { status: "loading" };

export function useRecording(
  reservationId: string,
  { load = fetchTelemetryRecording, chunkSize = RECORDING_INDEX_CHUNK }: UseRecordingOptions = {},
): RecordingResult {
  const [attempt, setAttempt] = useState(0);
  const key = `${reservationId}#${attempt}`;
  const [result, setResult] = useState<{ key: string, state: RecordingLoadState }>({ key, state: LOADING });
  const loadRef = useRef(load);

  useLayoutEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;

    loadRef.current(reservationId, controller.signal).then((source) => {
      if (controller.signal.aborted) {
        return;
      }

      // The raw frames are referenced only by this indexer: once it is done they can be collected.
      const indexer = createRecordingIndexer(source, chunkSize);
      const run = () => {
        timer = null;

        if (controller.signal.aborted) {
          return;
        }

        const done = indexer.step();

        setResult({ key, state: done ? { status: "ready", index: indexer.result() } : { status: "indexing", progress: indexer.progress() } });
        timer = done ? null : setTimeout(run, 0);
      };

      timer = setTimeout(run, 0);
    }, (caught: unknown) => {
      if (!controller.signal.aborted) {
        setResult({ key, state: { status: "error", error: toApiError(caught) } });
      }
    });

    return () => {
      controller.abort();

      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [key, reservationId, chunkSize]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  return { state: result.key === key ? result.state : LOADING, reload };
}
