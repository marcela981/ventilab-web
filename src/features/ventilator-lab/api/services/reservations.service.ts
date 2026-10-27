/*
* Funcionalidad: Reservations service
* Descripción: Read endpoints of the ventilator reservations, all present in openapi/openapi.json and projected by role on the server: the reservation active right now with the caller's control flag GET /api/reservations/current, the caller's current and upcoming reservations (own, created, or of the caller's student group) GET /api/reservations/mine, and the calendar of a range GET /api/reservations?from&to (at most 31 days; full or limited projection). v1.1 (T2): create a reservation POST /api/reservations (201 with data null: callers revalidate the reads). v1.2 (T4): cancel a scheduled reservation POST /api/reservations/{id}/cancel (200 with data null). Hooks read the same paths through useApiQuery. v1.3 (T9 review fix W1): `readCurrentReservationResult` (raw result for a read that must reject on failure). Depends on the api-client request helpers and the reservations mapper.
*   v1.4 (W7, Bloque 1): createReservation returns the id of the created reservation (201 ReservationDetailDTO; null when the backend sends no data); the body may be an immediate reservation.
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGet, apiPost } from "@shared/api-client/api-request";
import type { CreateReservationRequest } from "../../application/entities/create-reservation.entity";
import type { CurrentReservation, LabReservation } from "../../application/entities/reservation.entity";
import type { ReservationProjectionDTO, ReservationsCalendarQueryDTO } from "../dtos/lab.dto";
import { toCreateReservationBody } from "../mappers/create-reservation.mapper";
import { toCurrentReservation, toLabReservation } from "../mappers/reservations.mapper";

export const RESERVATIONS_PATH = "/api/reservations";
export const CURRENT_RESERVATION_PATH = "/api/reservations/current";
export const MY_RESERVATIONS_PATH = "/api/reservations/mine";

export function calendarQuery(from: Date, to: Date): ReservationsCalendarQueryDTO {
  return { from: from.toISOString(), to: to.toISOString() };
}

/** The raw GET /api/reservations/current result (the shape the SWR cache keeps); rejects on a failed read. */
export function readCurrentReservationResult() {
  return apiGet(CURRENT_RESERVATION_PATH);
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

/**
 * The backend answers 201 with the new reservation (ReservationDetailDTO); its id is returned (null when an older
 * backend answers with data null). Revalidate current, mine and calendar after it.
 */
export async function createReservation(request: CreateReservationRequest): Promise<string | null> {
  const result = await apiPost(RESERVATIONS_PATH, { body: toCreateReservationBody(request) });
  const created = result.data as { id?: unknown } | null;

  return typeof created?.id === "string" ? created.id : null;
}

/** POST /api/reservations/{id}/cancel answers 200 with data null: revalidate current, mine and calendar after it. */
export async function cancelReservation(reservationId: string): Promise<void> {
  await apiPost("/api/reservations/{id}/cancel", { params: { id: reservationId } });
}
