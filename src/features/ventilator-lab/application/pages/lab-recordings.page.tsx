/*
* Funcionalidad: Lab recordings page
* Descripción: /lab/recordings, the reservations a telemetry recording can belong to (there is no recordings list
*   endpoint: see the recordings-list entity). One 31-day window of the calendar at a time (the backend maximum), the
*   first ending now, with "31 días anteriores" / "31 días siguientes"; each row shows the Bogota window, the holder
*   text exactly as the backend returned it, the duration of the reservation window and the status, and opens
*   /lab/recordings/[reservationId]. A visible note says what can and cannot be listed (whether it was recorded and
*   how long the recording is are known only when opened; a student sees only their own and their group's). Skeleton,
*   retryable error and empty states; realtime revalidation and the preemption notice as on every /lab page. Depends
*   on MUI, next/head, next/link, the design-system states, the slot window label, the lab routes, entities and hooks
*   and the recordings styles. v1.1 (T11 review fix S3): a
*   cancelled / preempted row shows the note that it has a recording only if it ended during the session.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Head from "next/head";
import Link from "next/link";
import { useId, useState } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDate } from "@shared/lib/format";
import { LAB_URL } from "../config/lab.routes";
import { getLabErrorMessage } from "../entities/lab-error-messages";
import { formatRecordingDuration, RECORDINGS_COPY } from "../entities/recordings-list.entity";
import type { RecordingRow } from "../entities/recordings-list.entity";
import { slotWindowLabel } from "../entities/slot-grid";
import { usePreemptionNotice } from "../hooks/use-preemption-notice";
import { useRecordingsList } from "../hooks/use-recordings";
import { useReservationsRealtime } from "../hooks/use-reservations-realtime";
import styles from "../../UI/lab-recordings.module.css";

const MINUTE_MS = 60_000;

function RecordingItem({ row }: { row: RecordingRow }) {
  const windowText = slotWindowLabel(new Date(row.startsAt), new Date(row.endsAt));

  return (
    <li className={cx(styles.item)}>
      <div className={cx(styles.itemMain)}>
        <span className={cx(styles.itemWindow)}>{windowText}</span>
        {row.holderText ? <span className={cx(styles.muted)}>{`${RECORDINGS_COPY.holder}: ${row.holderText}`}</span> : null}
        <span className={cx(styles.muted)}>{RECORDINGS_COPY.duration(formatRecordingDuration(row.durationMs))}</span>
        {row.note ? <span className={cx(styles.muted)}>{row.note}</span> : null}
      </div>
      <div className={cx(styles.itemActions)}>
        <Chip
          label={row.statusLabel}
          size="small"
          color={row.inProgress ? "success" : "default"}
          variant={row.inProgress ? "filled" : "outlined"}
        />
        <Button component={Link} href={row.url} size="small" variant="outlined" aria-label={RECORDINGS_COPY.openLabel(windowText)}>
          {RECORDINGS_COPY.open}
        </Button>
      </div>
    </li>
  );
}

export function LabRecordingsPage() {
  useReservationsRealtime();
  usePreemptionNotice();
  const titleId = useId();
  // Fixed for the visit (to the minute) so the calendar keys stay stable.
  const [nowMs] = useState(() => Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS);
  const [page, setPage] = useState(0);
  const { rows, range, staff, isLoading, error, reload } = useRecordingsList(page, nowMs);

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{RECORDINGS_COPY.documentTitle}</title>
      </Head>
      <PageHeader
        title={RECORDINGS_COPY.title}
        subtitle={RECORDINGS_COPY.subtitle}
        actions={<Button component={Link} href={LAB_URL}>{RECORDINGS_COPY.back}</Button>}
      />
      <section className={cx(styles.card)} aria-labelledby={titleId}>
        <div className={cx(styles.rangeBar)}>
          <h2 id={titleId} className={cx(styles.rangeLabel)}>
            {RECORDINGS_COPY.rangeLabel(formatDate(range.from.toISOString()), formatDate(range.to.toISOString()))}
          </h2>
          <div className={cx(styles.rangeActions)}>
            <Button size="small" onClick={() => setPage((current) => current + 1)}>{RECORDINGS_COPY.previous}</Button>
            <Button size="small" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
              {RECORDINGS_COPY.next}
            </Button>
          </div>
        </div>
        <p className={cx(styles.muted)} data-testid="lab-recordings-note">
          {staff ? RECORDINGS_COPY.note : `${RECORDINGS_COPY.note} ${RECORDINGS_COPY.studentNote}`}
        </p>
        {!rows && isLoading ? <ListSkeleton label={RECORDINGS_COPY.loading} /> : null}
        {!rows && !isLoading && error ? (
          <ErrorState title={RECORDINGS_COPY.error} description={getLabErrorMessage(error)} onRetry={() => void reload()} />
        ) : null}
        {rows && rows.length === 0 ? <EmptyState title={RECORDINGS_COPY.empty} description={RECORDINGS_COPY.emptyHint} /> : null}
        {rows && rows.length > 0 ? (
          <ul className={cx(styles.list)} aria-label={RECORDINGS_COPY.listLabel}>
            {rows.map((row) => <RecordingItem key={row.id} row={row} />)}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
