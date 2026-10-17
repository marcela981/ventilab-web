/*
* Funcionalidad: My reservations section
* Descripción: "Mis reservas" section of /lab/reservations: the caller's reservations and those of the caller's group as GET /api/reservations/mine returns them (only reservations whose window has not ended), split into upcoming (scheduled, the one in progress labelled "En curso") and past (cancelled, preempted with the reason the backend sent, completed), with the Bogota window, the holder text the backend returned and the status label. "Cancelar" is shown only when the client mirror of the backend cancel rules allows it; it asks for confirmation (ConfirmDialog; going back sends nothing), then posts the cancel, revalidates calendar/current/mine and shows a toast (success, or the backend error code in Spanish). Skeleton, retryable error and empty states. Depends on MUI, the design-system states, toasts and confirm dialog, the lab hooks, entities, error messages and styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import { useId, useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { getCancelReservationErrorMessage, getLabErrorMessage } from "../entities/lab-error-messages";
import { canCancelReservation, isInProgress, myReservationStatusLabel, splitMyReservations } from "../entities/my-reservations.entity";
import type { CancelActor } from "../entities/my-reservations.entity";
import { reservationHolderText } from "../entities/reservation.entity";
import type { LabReservation } from "../entities/reservation.entity";
import { slotWindowLabel } from "../entities/slot-grid";
import { useCancelActor, useCancelReservation } from "../hooks/use-cancel-reservation";
import { useMyReservations } from "../hooks/use-lab-reservations";
import styles from "../../UI/lab-reservations.module.css";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const MY_RESERVATIONS_COPY = {
  title: "Mis reservas",
  hint: "Tus reservas y las de tu grupo cuya franja todavía no termina. Horario de Bogotá.",
  loading: "Cargando tus reservas…",
  error: "No se pudieron cargar tus reservas",
  empty: "No tienes reservas.",
  emptyHint: "Elige una franja libre en el calendario para reservar el ventilador.",
  upcomingTitle: "Próximas",
  upcomingEmpty: "No tienes reservas próximas.",
  pastTitle: "Anteriores",
  pastHint: "Canceladas, desplazadas o finalizadas.",
  purpose: (purpose: string) => `Propósito: ${purpose}`,
  preemptedReason: (reason: string) => `Motivo del desplazamiento: ${reason}`,
  cancel: "Cancelar",
  cancelLabel: (windowText: string) => `Cancelar la reserva ${windowText}`,
  confirmTitle: "¿Cancelar la reserva?",
  confirmFree: "La franja quedará libre para otras personas.",
  confirmInProgress: "La reserva está en curso: al cancelarla termina la sesión y se libera el ventilador.",
  confirmGroup: (group: string) => `Es una reserva del grupo ${group}: se cancela para todo el grupo.`,
  confirm: "Cancelar reserva",
  back: "Volver",
  cancelled: "Reserva cancelada.",
} as const;

const windowOf = (reservation: LabReservation): string =>
  slotWindowLabel(new Date(reservation.startsAt), new Date(reservation.endsAt));

function confirmDescription(reservation: LabReservation, now: Date): string {
  const parts = [
    `${windowOf(reservation)}.`,
    isInProgress(reservation, now) ? MY_RESERVATIONS_COPY.confirmInProgress : MY_RESERVATIONS_COPY.confirmFree,
  ];

  if (reservation.visibility === "full" && reservation.holderType === "GROUP" && reservation.groupName) {
    parts.push(MY_RESERVATIONS_COPY.confirmGroup(reservation.groupName));
  }

  return parts.join(" ");
}

type ReservationItemProps = {
  reservation: LabReservation
  now: Date
  actor: CancelActor
  onCancel: (reservation: LabReservation) => void
};

function ReservationItem({ reservation, now, actor, onCancel }: ReservationItemProps) {
  const windowText = windowOf(reservation);
  const holder = reservationHolderText(reservation);
  const inProgress = isInProgress(reservation, now);
  const full = reservation.visibility === "full" ? reservation : null;

  return (
    <li className={cx(styles.myItem)}>
      <div className={cx(styles.myItemMain)}>
        <span className={cx(styles.myWindow)}>{windowText}</span>
        {holder ? <span className={cx(styles.muted)}>{holder}</span> : null}
        {full?.purpose ? <span className={cx(styles.muted)}>{MY_RESERVATIONS_COPY.purpose(full.purpose)}</span> : null}
        {full?.status === "PREEMPTED" && full.preemptedReason
          ? <span className={cx(styles.muted)}>{MY_RESERVATIONS_COPY.preemptedReason(full.preemptedReason)}</span>
          : null}
      </div>
      <div className={cx(styles.myItemActions)}>
        <Chip
          label={myReservationStatusLabel(reservation, now)}
          size="small"
          color={inProgress ? "success" : "default"}
          variant={inProgress ? "filled" : "outlined"}
        />
        {canCancelReservation(reservation, actor, now) ? (
          <Button size="small" color="error" aria-label={MY_RESERVATIONS_COPY.cancelLabel(windowText)} onClick={() => onCancel(reservation)}>
            {MY_RESERVATIONS_COPY.cancel}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export type MyReservationsProps = {
  now: Date
};

export function MyReservations({ now }: MyReservationsProps) {
  const titleId = useId();
  const { data, isLoading, error, reload } = useMyReservations();
  const actor = useCancelActor();
  const { cancel, isCancelling } = useCancelReservation();
  const toast = useToast();
  const [target, setTarget] = useState<LabReservation | null>(null);
  const split = data ? splitMyReservations(data, now) : null;

  const handleConfirm = async() => {
    if (!target) {
      return;
    }

    const outcome = await cancel(target.id);

    setTarget(null);

    if (outcome.kind === "cancelled") {
      toast.success(MY_RESERVATIONS_COPY.cancelled);
    } else {
      toast.error(getCancelReservationErrorMessage(outcome.error));
    }
  };

  const renderList = (reservations: LabReservation[], label: string) => (
    <ul className={cx(styles.myList)} aria-label={label}>
      {reservations.map((reservation) => (
        <ReservationItem key={reservation.id} reservation={reservation} now={now} actor={actor} onCancel={setTarget} />
      ))}
    </ul>
  );

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <h2 id={titleId} className={cx(styles.sectionTitle)}>{MY_RESERVATIONS_COPY.title}</h2>
      <p className={cx(styles.muted)}>{MY_RESERVATIONS_COPY.hint}</p>

      {!data && isLoading ? <ListSkeleton label={MY_RESERVATIONS_COPY.loading} /> : null}
      {!data && !isLoading && error ? (
        <ErrorState title={MY_RESERVATIONS_COPY.error} description={getLabErrorMessage(error)} onRetry={() => void reload()} />
      ) : null}
      {split && split.upcoming.length === 0 && split.past.length === 0 ? (
        <EmptyState icon={<EventAvailableIcon />} title={MY_RESERVATIONS_COPY.empty} description={MY_RESERVATIONS_COPY.emptyHint} />
      ) : null}
      {split && (split.upcoming.length > 0 || split.past.length > 0) ? (
        <>
          <h3 className={cx(styles.subsectionTitle)}>{MY_RESERVATIONS_COPY.upcomingTitle}</h3>
          {split.upcoming.length > 0
            ? renderList(split.upcoming, MY_RESERVATIONS_COPY.upcomingTitle)
            : <p className={cx(styles.muted)}>{MY_RESERVATIONS_COPY.upcomingEmpty}</p>}
          {split.past.length > 0 ? (
            <>
              <h3 className={cx(styles.subsectionTitle)}>{MY_RESERVATIONS_COPY.pastTitle}</h3>
              <p className={cx(styles.muted)}>{MY_RESERVATIONS_COPY.pastHint}</p>
              {renderList(split.past, MY_RESERVATIONS_COPY.pastTitle)}
            </>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={target !== null}
        title={MY_RESERVATIONS_COPY.confirmTitle}
        description={target ? confirmDescription(target, now) : undefined}
        confirmLabel={MY_RESERVATIONS_COPY.confirm}
        cancelLabel={MY_RESERVATIONS_COPY.back}
        destructive
        isPending={isCancelling}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setTarget(null)}
      />
    </section>
  );
}
