/*
* Funcionalidad: Session recording entity
* Descripción: Pure rules of the "Grabar sesión" toggle of /lab/live (POST /api/ventilator/telemetry/recordings/start
*   and /stop of ventylab-server). Who: the backend allows the recording to the holders of the ACTIVE reservation (holder
*   user or member of the holder group) and to teachers and admins (`TelemetryRecordingAccessService`), which is the
*   same rule as the `canControl` of GET /api/reservations/current (`ReservationAccessService.canControl`), so the toggle
*   is offered only with `canControl` for the session reservation while it is active. State: the backend exposes no
*   recording state (no status read, no realtime event, data null in both answers), so the state is LOCAL to this tab:
*   idle → starting → recording → stopping → idle; a failed start goes back to idle, a failed stop stays recording
*   (the outcome is unknown). Both endpoints are idempotent on the backend (start of the reservation already being
*   recorded and stop without a recording answer 200): there is no 409 "already recording" / "not recording", a retry
*   is safe, and a recording started or stopped from another tab or by another person is not seen here (gap). The 409
*   is "no active reservation", 403 "not a holder", 404 (reservation not found) is mapped too. Spanish copy. Depends on
*   the api-client error helpers and the lab error messages. v1.1 (T10 review fix): S8 a 409 on stop means no active
*   reservation; the backend recorder stops by itself with the reservation, so the state goes idle (`stop-ended`) with
*   a note instead of keeping REC. S9 copy of the note shown when the recording stops being allowed mid-session.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import { getLabErrorMessage } from "./lab-error-messages";

/** Backend error codes of the recording endpoints (ventilator-telemetry.errors.ts). */
export const RECORDING_ERROR_CODES = {
  noActiveReservation: "ventilator-telemetry.no_active_reservation",
  forbidden: "ventilator-telemetry.recording_forbidden",
  notFound: "ventilator-telemetry.reservation_not_found",
} as const;

export type RecordingRequest = "start" | "stop";

const VERBS: Readonly<Record<RecordingRequest, string>> = { start: "iniciar", stop: "detener" };

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const RECORDING_COPY = {
  start: "Grabar sesión",
  starting: "Iniciando grabación…",
  stop: "Detener grabación",
  stopping: "Deteniendo…",
  rec: "REC",
  recLabel: "Grabando la sesión",
  hint: "La grabación se detiene sola al terminar la reserva. El indicador REC solo se ve en la pestaña que la inició y se pierde al recargar la página.",
  stopTitle: "¿Detener la grabación?",
  stopDescription: "Se guarda lo grabado hasta ahora; podrás verlo en las grabaciones de la reserva.",
  stopConfirm: "Detener",
  stopCancel: "Seguir grabando",
  dismiss: "Cerrar",
  errors: {
    noActiveReservation: (verb: string) => `No hay una reserva activa del ventilador: no se pudo ${verb} la grabación.`,
    forbidden: "Solo quienes tienen la reserva (o su grupo), docentes y administradores pueden grabar la sesión.",
    notFound: (verb: string) => `No se encontró la reserva: no se pudo ${verb} la grabación.`,
    uncertain: (verb: string) => `No se pudo confirmar si se logró ${verb} la grabación. Inténtalo de nuevo: repetirlo es seguro.`,
  },
  stoppedByServer: "No hay una reserva activa del ventilador: el servidor ya detuvo la grabación al terminar la reserva.",
  noLongerAllowed: "Ya no puedes controlar la grabación de esta sesión desde esta pestaña. Si la reserva sigue activa, la grabación continúa en el servidor y se detiene sola al terminar la reserva.",
} as const;

export type RecordingPhase = "idle" | "starting" | "recording" | "stopping";

export type RecordingState = {
  phase: RecordingPhase
  /** Client time the start was confirmed. */
  startedAt: number | null
  error: string | null
};

export const INITIAL_RECORDING_STATE: RecordingState = { phase: "idle", startedAt: null, error: null };

export type RecordingAction =
  | { type: "start-requested" }
  | { type: "started", at: number }
  | { type: "start-failed", error: string }
  | { type: "stop-requested" }
  | { type: "stopped" }
  | { type: "stop-failed", error: string }
  /** S8: the stop found no active reservation, so the backend recorder already stopped by itself. */
  | { type: "stop-ended" }
  | { type: "dismiss-error" };

export function recordingReducer(state: RecordingState, action: RecordingAction): RecordingState {
  switch (action.type) {
    case "start-requested":
      return state.phase === "idle" ? { phase: "starting", startedAt: null, error: null } : state;
    case "started":
      return state.phase === "starting" ? { phase: "recording", startedAt: action.at, error: null } : state;
    case "start-failed":
      return state.phase === "starting" ? { phase: "idle", startedAt: null, error: action.error } : state;
    case "stop-requested":
      return state.phase === "recording" ? { ...state, phase: "stopping", error: null } : state;
    case "stopped":
      return state.phase === "stopping" ? INITIAL_RECORDING_STATE : state;
    case "stop-failed":
      return state.phase === "stopping" ? { ...state, phase: "recording", error: action.error } : state;
    case "stop-ended":
      return state.phase === "stopping" ? { ...INITIAL_RECORDING_STATE, error: RECORDING_COPY.stoppedByServer } : state;
    case "dismiss-error":
      return state.error === null ? state : { ...state, error: null };
    default:
      return state;
  }
}

export type RecordingAllowedInput = {
  /** `canControl` of GET /api/reservations/current. */
  canControl: boolean
  sessionReservationId: string
  /** The active reservation of the latest read, or null. */
  currentReservationId: string | null
  /** The session reservation ended or was preempted (T9). */
  ended: boolean
};

export function recordingAllowed({ canControl, sessionReservationId, currentReservationId, ended }: RecordingAllowedInput): boolean {
  return canControl && !ended && currentReservationId === sessionReservationId;
}

/** S8: a stop refused with 409 (no active reservation): the backend recorder stops by itself with the reservation. */
export function recordingStopEnded(error: unknown): boolean {
  const apiError = toApiError(error);

  return apiError.code === RECORDING_ERROR_CODES.noActiveReservation || apiError.status === 409;
}

/** 5xx answers after which the start/stop may have happened (retry is safe: both are idempotent). */
const UNCERTAIN_STATUSES: readonly number[] = [500, 502, 503, 504];

export function recordingErrorMessage(error: unknown, request: RecordingRequest): string {
  const apiError = toApiError(error);
  const verb = VERBS[request];

  if (apiError.code === RECORDING_ERROR_CODES.noActiveReservation || apiError.status === 409) {
    return RECORDING_COPY.errors.noActiveReservation(verb);
  }

  if (apiError.code === RECORDING_ERROR_CODES.forbidden || apiError.status === 403) {
    return RECORDING_COPY.errors.forbidden;
  }

  if (apiError.code === RECORDING_ERROR_CODES.notFound || apiError.status === 404) {
    return RECORDING_COPY.errors.notFound(verb);
  }

  if (
    apiError.code === CLIENT_ERROR_CODES.networkUnavailable
    || apiError.code === CLIENT_ERROR_CODES.networkTimeout
    || UNCERTAIN_STATUSES.includes(apiError.status)
  ) {
    return RECORDING_COPY.errors.uncertain(verb);
  }

  return getLabErrorMessage(apiError);
}
