/*
* Funcionalidad: Ventilator command messages
* Descripción: Spanish copy of the ventilator commands. describeSendCommandError turns a failed POST
*   /api/ventilator/commands into a message by backend code, falling back on the status (codes of
*   ventylab-server `ventilator-commands.errors.ts`, see docs/ventilator/commands.md): 403
*   `no_active_reservation` / `not_reservation_holder`, 423 `not_operator`, 503 `device_offline`, 422 `invalid_command`
*   with every `details.violations` item `{ field, rule, limit? }` in Spanish (the backend English `message` is never
*   shown), 429 `rate_limited` with the Retry-After wait (1 s when the header is missing: the per-user token bucket
*   refills every 1/rate s), and a client timeout flagged `mayHaveBeenSent` (the request may have reached the server;
*   there is no idempotency key to retry safely); anything else uses the generic lab messages. Also the label of every
*   command status and the reason of a REJECTED / TIMEOUT outcome (backend reasons `publish_unconfirmed`,
*   `server_shutdown_unconfirmed`; any other reason is the device's or an error name and is quoted as reported).
*   Depends on the api-client error helpers, the realtime command status type, the lab error messages and the command
*   mapper field names. v1.1 (T8 review fix W2): a lost connection (`network.unavailable`, the request may have
*   reached the server before the drop) and a 500/502/504 are also flagged `mayHaveBeenSent`, with their own copy.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import type { VentilatorCommandStatus } from "@shared/realtime";
import { commandFieldName } from "./command-mapper";
import { getLabErrorMessage } from "./lab-error-messages";

/** Backend error codes of POST /api/ventilator/commands. */
export const SEND_COMMAND_ERROR_CODES = {
  noActiveReservation: "ventilator-commands.no_active_reservation",
  notHolder: "ventilator-commands.not_reservation_holder",
  notOperator: "ventilator-commands.not_operator",
  rateLimited: "ventilator-commands.rate_limited",
  invalid: "ventilator-commands.invalid_command",
  deviceOffline: "ventilator-commands.device_offline",
} as const;

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const SEND_COMMAND_ERROR_COPY = {
  noActiveReservation: "No hay una reserva activa del ventilador: el cambio no se envió.",
  notHolder: "La reserva activa no es tuya ni de tu grupo: el cambio no se envió.",
  notOperator: "No tienes el control del equipo (otra persona lo tomó o se liberó): el cambio no se envió. Toma el control para operar.",
  deviceOffline: "El equipo no está enviando datos o el servidor no pudo comunicarse con él: el cambio no se envió.",
  invalid: "El servidor rechazó los valores del cambio; no se envió nada al equipo.",
  rateLimited: "Demasiados cambios seguidos: el cambio no se envió.",
  timeout: "El servidor no respondió a tiempo: el cambio pudo haberse enviado. Revisa «Comandos recientes» y los valores que informa el equipo antes de reintentar.",
  unreachable: "Se perdió la conexión con el servidor durante el envío: el cambio pudo haberse enviado. Revisa «Comandos recientes» y los valores que informa el equipo antes de reintentar.",
  serverError: "El servidor falló al procesar el cambio: pudo haberse enviado al equipo. Revisa «Comandos recientes» y los valores que informa el equipo antes de reintentar.",
} as const;

/** 5xx answers after which the command may already have been stored and published (503 is the backend `device_offline`). */
const UNCERTAIN_SERVER_STATUSES: readonly number[] = [500, 502, 504];

export type SendCommandErrorDescription = {
  message: string
  /** One Spanish line per backend violation (422). */
  violations: readonly string[]
  /** Seconds to wait before another command (429). */
  retryAfterS: number | null
  /** The request may have reached the server (client timeout). */
  mayHaveBeenSent: boolean
};

type Violation = { field?: unknown, rule?: unknown, limit?: { min?: unknown, max?: unknown } | null };

function formatLimit(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value).replace(".", ",") : "?";
}

function violationText({ field, rule, limit }: Violation): string {
  const name = field === "mode" ? "modo" : commandFieldName(typeof field === "string" ? field : "?");

  switch (rule) {
    case "required":
      return `${name}: es obligatorio en este modo.`;
    case "not_a_number":
      return `${name}: no es un número válido.`;
    case "out_of_range":
      return limit && limit.max !== undefined
        ? `${name}: fuera del rango permitido (${formatLimit(limit.min)}–${formatLimit(limit.max)}).`
        : `${name}: fuera del rango permitido.`;
    case "safety_limit":
      return `${name}: supera el máximo de seguridad (${formatLimit(limit?.max)}).`;
    case "expiratory_time_too_short":
      return `${name}: el tiempo espiratorio quedaría por debajo de ${formatLimit(limit?.min)} s.`;
    case "ie_ratio_inconsistent":
      return `${name}: no coincide con la FR y el Ti.`;
    case "pressure_limit_not_above_peep":
      return `${name}: debe ser mayor que la PEEP (${formatLimit(limit?.min)}).`;
    case "invalid_mode":
    case "invalid_payload":
      return `${name}: no es un modo válido.`;
    default:
      return `${name}: valor no aceptado por el servidor.`;
  }
}

function violationsOf(details: unknown): string[] {
  const list = details !== null && typeof details === "object" ? (details as { violations?: unknown }).violations : undefined;

  return Array.isArray(list)
    ? list.filter((item): item is Violation => item !== null && typeof item === "object").map(violationText)
    : [];
}

function describe(message: string, extra: Partial<SendCommandErrorDescription> = {}): SendCommandErrorDescription {
  return { message, violations: [], retryAfterS: null, mayHaveBeenSent: false, ...extra };
}

export function describeSendCommandError(error: unknown): SendCommandErrorDescription {
  const apiError = toApiError(error);

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return describe(SEND_COMMAND_ERROR_COPY.timeout, { mayHaveBeenSent: true });
  }

  // W2: the connection may drop after the server received the request; a 5xx may follow a stored command.
  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return describe(SEND_COMMAND_ERROR_COPY.unreachable, { mayHaveBeenSent: true });
  }

  if (UNCERTAIN_SERVER_STATUSES.includes(apiError.status)) {
    return describe(SEND_COMMAND_ERROR_COPY.serverError, { mayHaveBeenSent: true });
  }

  switch (apiError.code) {
    case SEND_COMMAND_ERROR_CODES.noActiveReservation:
      return describe(SEND_COMMAND_ERROR_COPY.noActiveReservation);
    case SEND_COMMAND_ERROR_CODES.notHolder:
      return describe(SEND_COMMAND_ERROR_COPY.notHolder);
    case SEND_COMMAND_ERROR_CODES.notOperator:
      return describe(SEND_COMMAND_ERROR_COPY.notOperator);
    case SEND_COMMAND_ERROR_CODES.deviceOffline:
      return describe(SEND_COMMAND_ERROR_COPY.deviceOffline);
    default:
      break;
  }

  switch (apiError.status) {
    case 403:
      return describe(SEND_COMMAND_ERROR_COPY.notHolder);
    case 423:
      return describe(SEND_COMMAND_ERROR_COPY.notOperator);
    case 503:
      return describe(SEND_COMMAND_ERROR_COPY.deviceOffline);
    case 422:
      return describe(SEND_COMMAND_ERROR_COPY.invalid, { violations: violationsOf(apiError.details) });
    case 429:
      return describe(SEND_COMMAND_ERROR_COPY.rateLimited, {
        retryAfterS: apiError.retryAfter !== undefined && apiError.retryAfter > 0 ? Math.ceil(apiError.retryAfter) : 1,
      });
    default:
      return describe(getLabErrorMessage(apiError));
  }
}

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
const STATUS_LABELS: Readonly<Record<VentilatorCommandStatus, string>> = {
  PENDING: "Enviando",
  SENT: "Esperando confirmación del equipo",
  ACKED: "Aceptado por el equipo",
  APPLIED: "Aplicado por el equipo",
  REJECTED: "Rechazado por el equipo",
  TIMEOUT: "Sin confirmación del equipo",
};

export function commandStatusLabel(status: VentilatorCommandStatus): string {
  return STATUS_LABELS[status];
}

const KNOWN_REASONS: Readonly<Record<string, string>> = {
  publish_unconfirmed: "el servidor no pudo confirmar el envío al equipo",
  server_shutdown_unconfirmed: "el servidor se reinició antes de confirmar el envío",
};

/** Why a command ended REJECTED or TIMEOUT, in Spanish (a device reason is quoted as reported). */
export function commandOutcomeReason(status: "REJECTED" | "TIMEOUT", reason: string | null | undefined): string {
  if (reason && Object.prototype.hasOwnProperty.call(KNOWN_REASONS, reason)) {
    return KNOWN_REASONS[reason] ?? reason;
  }

  if (reason) {
    return `motivo informado: «${reason}»`;
  }

  return status === "TIMEOUT" ? "el equipo no confirmó el cambio a tiempo" : "el equipo rechazó el cambio";
}
