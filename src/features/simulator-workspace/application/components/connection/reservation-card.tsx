/*
* Funcionalidad: ReservationCard
* Descripción: Card "1. Reserva del ventilador" of the Conexión tab (W7, Bloque 1; July PanelReserva, FLUJOS_JULIO b.3):
*   the July description, the reservation line ("Activa · N min restantes" for an own or group reservation, "Reservado
*   por …" exactly as the caller's projection allows — the backend label for a student, name and code for staff —, or
*   "Disponible"), "Reservar ahora" (opens the immediate booking dialog), "Liberar" (only with an own reservation the
*   caller may cancel) and "Ver calendario" (/lab/reservations). The remaining minutes tick every 30 s on the browser
*   clock (display only; the end itself is confirmed by the backend). Depends on MUI, next/link, React, the lab
*   connection, the ventilator-lab connection entry point, the booking dialog and the connection styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { LAB_RESERVATIONS_URL } from "@features/ventilator-lab/connection.entry";
import { cx } from "@shared/lib/class-names";
import { useLabConnection } from "../lab-connection-provider";
import { ReserveNowDialog } from "./reserve-now-dialog";
import styles from "../../../UI/connection/connection-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const RESERVATION_CARD_COPY = {
  title: "1. Reserva del ventilador",
  description: "El ventilador físico es un recurso único compartido. Reserva un turno antes de conectar; recuerda liberarlo al terminar para que otros estudiantes puedan usarlo.",
  label: "Reserva:",
  active: (minutes: number) => `Activa · ${minutes} min restantes`,
  free: "Disponible",
  reserve: "Reservar ahora",
  release: "Liberar",
  calendar: "Ver calendario",
} as const;

const TICK_MS = 30_000;

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);

    return () => clearInterval(timer);
  }, []);

  return now;
}

/** Whole minutes left (rounded up; never negative). */
export function remainingMinutes(endsAt: string, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 60_000));
}

export function ReservationCard() {
  const titleId = useId();
  const { reservation, reservedBy, relation, actions, release } = useLabConnection();
  const [dialogOpen, setDialogOpen] = useState(false);
  const now = useNow();
  const own = reservation !== null && relation !== "none";
  let status: string = RESERVATION_CARD_COPY.free;

  if (own) {
    status = RESERVATION_CARD_COPY.active(remainingMinutes(reservation.endsAt, now));
  } else if (reservedBy) {
    status = reservedBy;
  }

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <h3 id={titleId} className={cx(styles.cardTitle)}>{RESERVATION_CARD_COPY.title}</h3>
      <p className={cx(styles.cardDescription)}>{RESERVATION_CARD_COPY.description}</p>
      <div className={cx(styles.row)}>
        <span className={cx(styles.rowLabel)}>{RESERVATION_CARD_COPY.label}</span>
        <span className={cx(styles.rowValue)} data-testid="connection-reservation-status">{status}</span>
      </div>
      <div className={cx(styles.actions)}>
        <Button variant="contained" onClick={() => setDialogOpen(true)} disabled={!actions.reserve}>
          {RESERVATION_CARD_COPY.reserve}
        </Button>
        {own && relation !== "group_member" ? (
          <Button variant="outlined" color="warning" onClick={release} disabled={!actions.release}>
            {RESERVATION_CARD_COPY.release}
          </Button>
        ) : null}
        <Button component={Link} href={LAB_RESERVATIONS_URL}>{RESERVATION_CARD_COPY.calendar}</Button>
      </div>
      {dialogOpen ? <ReserveNowDialog onClose={() => setDialogOpen(false)} /> : null}
    </section>
  );
}
