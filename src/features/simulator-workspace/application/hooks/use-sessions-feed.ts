/*
* Funcionalidad: useSessionsFeed
* Descripción: Data of the unified list of the Mis sesiones tab of /simulador (W9, Bloque 1): one 31-day window going
*   back from the moment the tab opened (`windowPage` 0 = the window ending then), shared by both sources so the merged
*   list is complete for its dates: the simulated sessions STARTED in the window (simulator history entry, with case
*   titles) and the real-ventilator recordings of the reservations started in it (lab recordings entry; the backend
*   has no recordings list). Each source keeps its own loading, error and retry, so one failing source never hides the
*   other. The merge, sort and type filter are the pure buildSessionsFeed. Depends on React, the simulator history and
*   lab recordings entry points and the sessions feed entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useSessionHistoryRange } from "@features/simulator/history.entry";
import { recordingsRange, useRecordingsList } from "@features/ventilator-lab/recordings.entry";
import type { RecordingsRange } from "@features/ventilator-lab/recordings.entry";
import { buildSessionsFeed } from "../entities/sessions-feed.entity";
import type { SessionsFeedItem, SessionsTypeFilter } from "../entities/sessions-feed.entity";

export type FeedSourceState = {
  /** Still loading its first data. */
  loading: boolean
  /** Failed without data. */
  error: ApiError | null
  retry: () => void
};

export type UseSessionsFeedResult = {
  range: RecordingsRange
  /** Merged and filtered rows of the sources loaded so far; null while every needed source still loads. */
  items: SessionsFeedItem[] | null
  simulated: FeedSourceState
  recordings: FeedSourceState
  /** Simulated sessions of the window that did not fit in the list (server limit); 0 otherwise. */
  hiddenSimulated: number
  /** Case titles of the simulated rows: still loading or failed (with retry). */
  titlesLoading: boolean
  titlesError: ApiError | null
  retryTitles: () => void
};

export function useSessionsFeed(windowPage: number, nowMs: number, filter: SessionsTypeFilter): UseSessionsFeedResult {
  const range = useMemo(() => recordingsRange(nowMs, windowPage), [nowMs, windowPage]);
  const history = useSessionHistoryRange(range);
  const recordings = useRecordingsList(windowPage, nowMs);
  const sessions = history.sessions;
  const rows = recordings.rows;
  const simulatedError = sessions === null ? history.error : null;
  const recordingsError = rows === null ? recordings.error : null;
  const simulatedLoading = sessions === null && simulatedError === null;
  const recordingsLoading = rows === null && recordingsError === null;
  const needsSimulated = filter !== "real";
  const needsRecordings = filter !== "simulated";
  const waiting = (needsSimulated && simulatedLoading) || (needsRecordings && recordingsLoading);
  const items = useMemo(
    () => (waiting ? null : buildSessionsFeed(sessions ?? [], rows ?? [], filter)),
    [filter, rows, sessions, waiting],
  );
  const { reload: reloadHistory, reloadTitles } = history;
  const { reload: reloadRecordings } = recordings;

  return {
    range,
    items,
    simulated: { loading: simulatedLoading, error: simulatedError, retry: () => void reloadHistory() },
    recordings: { loading: recordingsLoading, error: recordingsError, retry: () => void reloadRecordings() },
    hiddenSimulated: sessions !== null && history.total !== null ? Math.max(0, history.total - sessions.length) : 0,
    titlesLoading: history.titlesLoading,
    titlesError: history.titlesError,
    retryTitles: () => void reloadTitles(),
  };
}
