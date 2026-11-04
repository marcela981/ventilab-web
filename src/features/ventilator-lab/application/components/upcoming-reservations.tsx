/*
* Funcionalidad: Upcoming reservations section (staff)
* Descripción: "Próximas reservas" of the staff lab (/teacher/lab, DISENO_BLOQUE4 §2.6): the scheduled reservations of the current Bogota day and the next 7 days as GET /api/reservations returns them for the caller role (useUpcomingReservations), ordered by start, each with its Bogota window, who holds it ("Reservado por …" with the student code the staff projection sends, or the group), the purpose and its status ("En curso" for the one in progress). A group reservation states that the group leader operates the ventilator (Bloque 1). Read only: booking, preemption and cancellation stay in the calendar and "Mis reservas". Skeleton, retryable error and empty states. Rendered only for staff by the reservations page. Depends on MUI, the design-system states, the lab hooks, entities, error messages and styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import Chip from "@mui/material/Chip";
import { useId } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { getLabErrorMessage } from "../entities/lab-error-messages";
import { isInProgress, myReservationStatusLabel } from "../entities/my-reservations.entity";
import { reservedByText } from "../entities/reservation.entity";
import type { LabReservation } from "../entities/reservation.entity";
import { slotWindowLabel } from "../entities/slot-grid";
import { UPCOMING_WINDOW_DAYS } from "../entities/upcoming-reservations.entity";
import { useUpcomingReservations } from "../hooks/use-upcoming-reservations";
import styles from "../../UI/lab-reservations.module.css";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const UPCOMING_RESERVATIONS_COPY = {
  title: "Próximas reservas",
  hint: `Reservas programadas de hoy y los próximos ${UPCOMING_WINDOW_DAYS} días. Horario de Bogotá.`,
  loading: "Cargando las próximas reservas…",
  error: "No se pudieron cargar las próximas reservas",
  empty: `No hay reservas en los próximos ${UPCOMING_WINDOW_DAYS} días.`,
  groupOperator: "Opera el ventilador el líder del grupo.",
  purpose: (purpose: string) => `Propósito: ${purpose}`,
} as const;

function UpcomingItem({ reservation, now }: { reservation: LabReservation, now: Date }) {
  const holder = reservedByText(reservation);
  const full = reservation.visibility === "full" ? reservation : null;
  const inProgress = isInProgress(reservation, now);

  return (
    <li className={cx(styles.myItem)}>
      <div className={cx(styles.myItemMain)}>
        <span className={cx(styles.myWindow)}>{slotWindowLabel(new Date(reservation.startsAt), new Date(reservation.endsAt))}</span>
        {holder ? <span className={cx(styles.muted)}>{holder}</span> : null}
        {full?.holderType === "GROUP" ? <span className={cx(styles.muted)}>{UPCOMING_RESERVATIONS_COPY.groupOperator}</span> : null}
        {full?.purpose ? <span className={cx(styles.muted)}>{UPCOMING_RESERVATIONS_COPY.purpose(full.purpose)}</span> : null}
      </div>
      <div className={cx(styles.myItemActions)}>
        <Chip
          label={myReservationStatusLabel(reservation, now)}
          size="small"
          color={inProgress ? "success" : "default"}
          variant={inProgress ? "filled" : "outlined"}
        />
      </div>
    </li>
  );
}

export type UpcomingReservationsProps = {
  now: Date
};

export function UpcomingReservations({ now }: UpcomingReservationsProps) {
  const titleId = useId();
  const { data, isLoading, error, reload } = useUpcomingReservations(now);

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <h2 id={titleId} className={cx(styles.sectionTitle)}>{UPCOMING_RESERVATIONS_COPY.title}</h2>
      <p className={cx(styles.muted)}>{UPCOMING_RESERVATIONS_COPY.hint}</p>

      {!data && isLoading ? <ListSkeleton label={UPCOMING_RESERVATIONS_COPY.loading} /> : null}
      {!data && !isLoading && error ? (
        <ErrorState title={UPCOMING_RESERVATIONS_COPY.error} description={getLabErrorMessage(error)} onRetry={() => void reload()} />
      ) : null}
      {data && data.length === 0 ? <EmptyState icon={<EventAvailableIcon />} title={UPCOMING_RESERVATIONS_COPY.empty} /> : null}
      {data && data.length > 0 ? (
        <ul className={cx(styles.myList)} aria-label={UPCOMING_RESERVATIONS_COPY.title}>
          {data.map((reservation) => <UpcomingItem key={reservation.id} reservation={reservation} now={now} />)}
        </ul>
      ) : null}
    </section>
  );
}
