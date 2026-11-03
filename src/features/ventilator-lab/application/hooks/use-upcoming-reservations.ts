/*
* Funcionalidad: useUpcomingReservations
* Descripción: Reservations of "Próximas reservas" (staff lab): GET /api/reservations?from&to over the upcoming window (current Bogota day + 7 days), scoped by the server to the caller role, through useReservationsCalendar (shared cache under the reservations path: revalidated by the realtime events, after a booking or a cancellation, and periodically), reduced to the scheduled reservations that have not ended, ordered by start. Depends on the calendar hook and the reservation and upcoming entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import { upcomingReservations } from "../entities/reservation.entity";
import type { LabReservation } from "../entities/reservation.entity";
import { upcomingWindow } from "../entities/upcoming-reservations.entity";
import type { LabQueryResult } from "./use-lab-reservations";
import { useReservationsCalendar } from "./use-reservations-calendar";

export function useUpcomingReservations(now: Date): LabQueryResult<LabReservation[]> {
  // The calendar hook keys the query by the ISO bounds, so a new Date of the same day keeps the same query.
  const { from, to } = upcomingWindow(now);
  const calendar = useReservationsCalendar(from, to);
  const data = useMemo(() => (calendar.data ? upcomingReservations(calendar.data, now) : null), [calendar.data, now]);

  return { ...calendar, data };
}
