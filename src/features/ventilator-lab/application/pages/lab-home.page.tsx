/*
* Funcionalidad: Lab summary page
* Descripción: Summary of the ventilator lab (/lab): device status (online or "sin datos" with the reason, from the broadcast ventilator:connected / ventilator:disconnected events; no room join), the reservation active right now (a caller the backend lets control the ventilator gets "Entrar a la consola" to /lab/live; anyone else sees the occupancy as the backend describes it, never a name the backend did not send) and the upcoming reservations of the user and the user's group with a link to /lab/reservations. Loading skeletons, retryable errors and empty states as in the other features; the reservation reads are revalidated on ventilator:availability and reservation:preempted. Depends on MUI, next/link, next/head, the design-system states, the date format helper, the lab hooks, entities, routes and styles.
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
import Head from "next/head";
import Link from "next/link";
import { useId } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { CardSkeleton, ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDateRange } from "@shared/lib/format";
import { LAB_LIVE_URL, LAB_RESERVATIONS_URL } from "../config/lab.routes";
import { getLabErrorMessage } from "../entities/lab-error-messages";
import { reservationStatusLabel, upcomingReservations } from "../entities/reservation.entity";
import type { CurrentReservation, LabReservation } from "../entities/reservation.entity";
import { useDeviceStatus } from "../hooks/use-device-status";
import type { DeviceNoDataReason } from "../hooks/use-device-status";
import { useCurrentReservation, useMyReservations } from "../hooks/use-lab-reservations";
import { useReservationsRealtime } from "../hooks/use-reservations-realtime";
import styles from "../../UI/lab-home.module.css";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const LAB_HOME_COPY = {
  documentTitle: "Laboratorio | VentyLab",
  title: "Laboratorio",
  subtitle: "Ventilador mecánico físico: reservas, consola en vivo y grabaciones.",
  deviceTitle: "Estado del dispositivo",
  deviceOnline: "En línea",
  deviceNoData: "Sin datos",
  deviceReasons: {
    unknown: "Todavía no se ha recibido ningún estado del ventilador en esta conexión.",
    device_stale: "El ventilador dejó de enviar datos.",
    broker_disconnected: "El servidor perdió la conexión con el intermediario MQTT del ventilador.",
    realtime_offline: "Sin conexión en tiempo real con el servidor.",
  } satisfies Record<DeviceNoDataReason, string>,
  deviceOnlineHint: "El ventilador está enviando datos.",
  activeTitle: "Reserva activa",
  activeLoading: "Cargando la reserva activa…",
  activeError: "No se pudo cargar la reserva activa",
  free: "El ventilador está libre en este momento.",
  enterConsole: "Entrar a la consola",
  occupied: "Ventilador en uso",
  groupHolder: (group: string) => `Grupo ${group}`,
  upcomingTitle: "Mis próximas reservas",
  upcomingHint: "Tus reservas y las de tu grupo que todavía no terminan.",
  upcomingLoading: "Cargando tus reservas…",
  upcomingError: "No se pudieron cargar tus reservas",
  upcomingEmpty: "No tienes reservas próximas.",
  upcomingEmptyHint: "Reserva una franja del ventilador en el calendario.",
  upcomingListLabel: "Próximas reservas",
  toReservations: "Ver calendario y reservar",
} as const;

function holderLabel(reservation: LabReservation): string | null {
  if (reservation.visibility === "limited") {
    return reservation.occupancyLabel;
  }

  if (reservation.holderType === "GROUP" && reservation.groupName) {
    return LAB_HOME_COPY.groupHolder(reservation.groupName);
  }

  return reservation.holderName;
}

function DeviceStatusCard() {
  const status = useDeviceStatus();
  const titleId = useId();
  const online = status.kind === "online";

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <div className={cx(styles.cardHeader)}>
        <h2 id={titleId} className={cx(styles.cardTitle)}>{LAB_HOME_COPY.deviceTitle}</h2>
        <Chip
          label={online ? LAB_HOME_COPY.deviceOnline : LAB_HOME_COPY.deviceNoData}
          color={online ? "success" : "default"}
          size="small"
        />
      </div>
      <p className={cx(styles.muted)}>
        {status.kind === "online" ? LAB_HOME_COPY.deviceOnlineHint : LAB_HOME_COPY.deviceReasons[status.reason]}
      </p>
    </section>
  );
}

function ActiveReservationBody({ current }: { current: CurrentReservation }) {
  const { reservation, canControl } = current;

  if (!reservation) {
    return <p className={cx(styles.muted)}>{LAB_HOME_COPY.free}</p>;
  }

  const holder = holderLabel(reservation);

  return (
    <div className={cx(styles.active)}>
      <p className={cx(styles.window)}>{formatDateRange(reservation.startsAt, reservation.endsAt)}</p>
      {holder ? <p className={cx(styles.holder)}>{holder}</p> : null}
      {canControl ? (
        <Button component={Link} href={LAB_LIVE_URL} variant="contained" className={cx(styles.action)}>
          {LAB_HOME_COPY.enterConsole}
        </Button>
      ) : (
        <p className={cx(styles.muted)}>{LAB_HOME_COPY.occupied}</p>
      )}
    </div>
  );
}

type ActiveReservationCardProps = {
  current: CurrentReservation | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

function ActiveReservationCard({ current, isLoading, error, reload }: ActiveReservationCardProps) {
  const titleId = useId();

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <h2 id={titleId} className={cx(styles.cardTitle)}>{LAB_HOME_COPY.activeTitle}</h2>
      {!current && isLoading ? <CardSkeleton label={LAB_HOME_COPY.activeLoading} /> : null}
      {!current && !isLoading && error ? (
        <ErrorState title={LAB_HOME_COPY.activeError} description={getLabErrorMessage(error)} onRetry={() => void reload()} />
      ) : null}
      {current ? <ActiveReservationBody current={current} /> : null}
    </section>
  );
}

function UpcomingReservationsCard({ activeId }: { activeId: string | null }) {
  const { data, isLoading, error, reload } = useMyReservations();
  const titleId = useId();
  const upcoming = data ? upcomingReservations(data, new Date(), activeId) : null;

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <div className={cx(styles.cardHeader)}>
        <h2 id={titleId} className={cx(styles.cardTitle)}>{LAB_HOME_COPY.upcomingTitle}</h2>
        <Button component={Link} href={LAB_RESERVATIONS_URL} size="small">{LAB_HOME_COPY.toReservations}</Button>
      </div>
      <p className={cx(styles.muted)}>{LAB_HOME_COPY.upcomingHint}</p>
      {!data && isLoading ? <ListSkeleton label={LAB_HOME_COPY.upcomingLoading} /> : null}
      {!data && !isLoading && error ? (
        <ErrorState title={LAB_HOME_COPY.upcomingError} description={getLabErrorMessage(error)} onRetry={() => void reload()} />
      ) : null}
      {upcoming && upcoming.length === 0 ? (
        <EmptyState
          icon={<EventAvailableIcon />}
          title={LAB_HOME_COPY.upcomingEmpty}
          description={LAB_HOME_COPY.upcomingEmptyHint}
        />
      ) : null}
      {upcoming && upcoming.length > 0 ? (
        <ul className={cx(styles.list)} aria-label={LAB_HOME_COPY.upcomingListLabel}>
          {upcoming.map((reservation) => {
            const holder = holderLabel(reservation);

            return (
              <li key={reservation.id} className={cx(styles.item)}>
                <span className={cx(styles.window)}>{formatDateRange(reservation.startsAt, reservation.endsAt)}</span>
                {holder ? <span className={cx(styles.holder)}>{holder}</span> : null}
                <Chip label={reservationStatusLabel(reservation.status)} size="small" variant="outlined" />
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export function LabHomePage() {
  useReservationsRealtime();
  const current = useCurrentReservation();
  const activeId = current.data?.reservation?.id ?? null;

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{LAB_HOME_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={LAB_HOME_COPY.title} subtitle={LAB_HOME_COPY.subtitle} />
      <div className={cx(styles.grid)}>
        <DeviceStatusCard />
        <ActiveReservationCard current={current.data} isLoading={current.isLoading} error={current.error} reload={current.reload} />
      </div>
      <UpcomingReservationsCard activeId={activeId} />
    </div>
  );
}
