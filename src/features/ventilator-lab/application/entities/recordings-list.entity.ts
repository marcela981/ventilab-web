/*
* Funcionalidad: Recordings list entity
* Descripción: Pure rules of /lab/recordings. The backend has NO list of recordings (audit gap): the only read is GET
*   /api/ventilator/telemetry/recordings/{reservationId}, which returns every frame of one reservation (a reservation
*   without stored chunks answers 200 with no frames). So the list shows the reservations a recording CAN belong to,
*   taken from the calendar GET /api/reservations (ranges of at most 31 days, past ranges allowed for every role):
*   consecutive 31-day windows going back from now; in each window the reservations that STARTED inside it (so a
*   reservation crossing a boundary is listed once) and already began; staff (TEACHER / ADMIN, the backend
*   recording roles) see every one, a student only the ones the backend projects in full (own: holder, creator or
*   member of the holder group; the backend still answers 403 to a creator who is not a holder). `GET
*   /api/reservations/mine` is not used: it returns only windows that have not ended. Whether a reservation has a
*   recording, and its length, is known only when it is opened: probing each row would download every recording in
*   full, so nothing is probed. Rows: window, duration of the reservation window, holder text exactly as the backend
*   returned it, status, playback URL (recordingId = reservationId). Also the Spanish errors of the recording read
*   (403 recording_forbidden, 404 reservation_not_found, else the lab messages) and the page copy. Depends on the api
*   error, the shared duration format, the lab error messages, the reservation entity and the lab routes. v1.1 (T11
*   review fix S3): a reservation cancelled BEFORE its start can have no recording, but the contract carries no cancel
*   or preemption time (ReservationDetailDTO has no updatedAt / cancelledAt; backend gap), so such rows cannot be told
*   apart from a session ended early; CANCELLED / PREEMPTED rows are kept (filtering them would hide real recordings)
*   with the visible note `endedEarlyNote`.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import { formatDuration } from "@shared/lib/format";
import { buildRecordingUrl } from "../config/lab.routes";
import { getLabErrorMessage } from "./lab-error-messages";
import { reservationHolderText, reservationStatusLabel } from "./reservation.entity";
import type { LabReservation } from "./reservation.entity";

/** Longest calendar range the backend accepts (`MAX_CALENDAR_RANGE_DAYS`). */
export const RECORDINGS_RANGE_DAYS = 31;

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/** Backend roles that may read any recording (`TELEMETRY_PRIVILEGED_ROLES`). */
export const RECORDING_STAFF_ROLES: ReadonlySet<string> = new Set(["TEACHER", "ADMIN"]);

/** Backend error codes of the recording read (`ventilator-telemetry.errors.ts`). */
export const RECORDING_ERROR_CODES = {
  forbidden: "ventilator-telemetry.recording_forbidden",
  notFound: "ventilator-telemetry.reservation_not_found",
} as const;

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const RECORDINGS_COPY = {
  documentTitle: "Grabaciones | VentyLab",
  title: "Grabaciones",
  subtitle: "Sesiones del ventilador físico que se pueden reproducir.",
  back: "Volver al laboratorio",
  note: "El servidor no ofrece una lista de grabaciones: aquí aparecen las reservas ya iniciadas a las que puede pertenecer una grabación. Al abrir una sabrás si se grabó y cuánto dura; la duración que se muestra es la de la reserva.",
  studentNote: "Solo ves tus reservas y las de tu grupo.",
  rangeLabel: (from: string, to: string) => `Reservas iniciadas entre ${from} y ${to}`,
  previous: "31 días anteriores",
  next: "31 días siguientes",
  loading: "Cargando las reservas…",
  error: "No se pudieron cargar las reservas",
  empty: "No hay reservas iniciadas en este periodo.",
  emptyHint: "Prueba con los 31 días anteriores.",
  listLabel: "Reservas con posible grabación",
  holder: "Titular",
  duration: (text: string) => `Duración de la reserva: ${text}`,
  inProgress: "En curso",
  endedEarlyNote: "Solo tiene grabación si terminó durante la sesión (si se canceló o desplazó antes de empezar, no hay datos).",
  open: "Abrir",
  openLabel: (windowText: string) => `Abrir la grabación de la reserva ${windowText}`,
  forbidden: "No tienes acceso a esta grabación: solo quienes tienen la reserva (o su grupo), los docentes y los administradores pueden verla.",
  notFound: "La reserva de esta grabación no existe.",
} as const;

export type RecordingsRange = { from: Date, to: Date };

/** Window `page` (0 = the one ending now) of RECORDINGS_RANGE_DAYS days going back from `nowMs`. */
export function recordingsRange(nowMs: number, page: number): RecordingsRange {
  const to = nowMs - Math.max(0, page) * RECORDINGS_RANGE_DAYS * DAY_MS;

  return { from: new Date(to - RECORDINGS_RANGE_DAYS * DAY_MS), to: new Date(to) };
}

export type RecordingRow = {
  /** Reservation id = recording id. */
  id: string
  startsAt: string
  endsAt: string
  /** Duration of the reservation window (the recording length is only known once opened). */
  durationMs: number
  holderText: string | null
  inProgress: boolean
  statusLabel: string
  /** Visible note for a reservation that may have ended before its start (no recording possible then). */
  note: string | null
  url: string
};

/** Backend statuses of a reservation that may have ended before it started (no cancel time in the contract). */
const ENDED_EARLY_STATUSES: ReadonlySet<string> = new Set(["CANCELLED", "PREEMPTED"]);

export type RecordingRowsOptions = { nowMs: number, range: RecordingsRange, staff: boolean };

export function recordingRows(reservations: readonly LabReservation[], { nowMs, range, staff }: RecordingRowsOptions): RecordingRow[] {
  const from = range.from.getTime();
  const to = range.to.getTime();

  return reservations
    .filter((reservation) => {
      const startsAt = Date.parse(reservation.startsAt);

      return startsAt >= from && startsAt < to && startsAt <= nowMs && (staff || reservation.visibility === "full");
    })
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))
    .map((reservation) => {
      const startsAt = Date.parse(reservation.startsAt);
      const endsAt = Date.parse(reservation.endsAt);
      const inProgress = endsAt > nowMs && reservation.status === "SCHEDULED";

      return {
        id: reservation.id,
        startsAt: reservation.startsAt,
        endsAt: reservation.endsAt,
        durationMs: Math.max(0, endsAt - startsAt),
        holderText: reservationHolderText(reservation),
        inProgress,
        statusLabel: inProgress ? RECORDINGS_COPY.inProgress : reservationStatusLabel(reservation.status),
        note: ENDED_EARLY_STATUSES.has(reservation.status) ? RECORDINGS_COPY.endedEarlyNote : null,
        url: buildRecordingUrl(reservation.id),
      };
    });
}

/** "1 h 30 min" / "45 min" (whole minutes, at least 1; the shared duration format). */
export function formatRecordingDuration(durationMs: number): string {
  return formatDuration(Math.max(1, Math.round(durationMs / MINUTE_MS)));
}

/** Spanish message of a failed recording read. */
export function getRecordingErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (apiError.code === RECORDING_ERROR_CODES.forbidden || apiError.status === 403) {
    return RECORDINGS_COPY.forbidden;
  }

  if (apiError.code === RECORDING_ERROR_CODES.notFound || apiError.status === 404) {
    return RECORDINGS_COPY.notFound;
  }

  return getLabErrorMessage(apiError);
}
