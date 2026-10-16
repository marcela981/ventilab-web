/*
* Funcionalidad: Reservations service
* Descripción: Read endpoints of the ventilator reservations, all present in openapi/openapi.json and projected by role on the server: the reservation active right now with the caller's control flag GET /api/reservations/current, the caller's current and upcoming reservations (own, created, or of the caller's student group) GET /api/reservations/mine, and the calendar of a range GET /api/reservations?from&to (at most 31 days; full or limited projection). Hooks read the same paths through useApiQuery. Depends on the api-client request helpers and the reservations mapper.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGet } from "@shared/api-client/api-request";
import type { CurrentReservation, LabReservation } from "../../application/entities/reservation.entity";
import type { ReservationProjectionDTO, ReservationsCalendarQueryDTO } from "../dtos/lab.dto";
import { toCurrentReservation, toLabReservation } from "../mappers/reservations.mapper";

export const RESERVATIONS_PATH = "/api/reservations";
export const CURRENT_RESERVATION_PATH = "/api/reservations/current";
export const MY_RESERVATIONS_PATH = "/api/reservations/mine";

export function calendarQuery(from: Date, to: Date): ReservationsCalendarQueryDTO {
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function fetchCurrentReservation(): Promise<CurrentReservation> {
  const result = await apiGet(CURRENT_RESERVATION_PATH);

  return toCurrentReservation(result.data);
}

export async function fetchMyReservations(): Promise<LabReservation[]> {
  const result = await apiGet(MY_RESERVATIONS_PATH);

  return result.data.map(toLabReservation);
}

export async function fetchReservationsCalendar(from: Date, to: Date): Promise<LabReservation[]> {
  const result = await apiGet(RESERVATIONS_PATH, { query: calendarQuery(from, to) });

  return (result.data as ReservationProjectionDTO[]).map(toLabReservation);
}
