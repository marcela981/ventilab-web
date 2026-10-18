/*
* Funcionalidad: Admin console error messages
* Descripción: Spanish message for any failure of an admin console request: backend codes of users (superadmin_role_immutable and superadmin_status_immutable → "Esta cuenta está protegida (superadministrador)…", own role/status, user not found) and platform settings (version conflict, unknown setting, providers without credentials from details.providers), then fallbacks by status (403, 404, 409, 400/422, 429 with Retry-After, 5xx), timeout, network and unknown errors. isVersionConflict tells the settings cards when to offer "Recargar". v1.1 (O4b): research export without anonymization key (analytics.export_not_configured), invalid audit and AI ranges, unknown or unconfigured AI provider of the probe. Depends on the api-client errors. v1.2 (closure B2): student code in use (409 → "Código ya en uso") or invalid, and serverFieldErrors, which reads the per-field errors of a 400/422 (`data.errors: [{ field, message }]`). v1.3 (B4): the AI telemetry/ratings invalid_range message names AI_ANALYTICS_MAX_RANGE_DAYS from the date range entity instead of a hardcoded 366.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import { AI_ANALYTICS_MAX_RANGE_DAYS, formatDays } from "./date-range.entity";

export const SUPERADMIN_PROTECTED_MESSAGE = "Esta cuenta está protegida (superadministrador) y no se puede modificar.";
export const OWN_ACCOUNT_MESSAGE = "No puedes cambiar tu propia cuenta.";
export const VERSION_CONFLICT_CODE = "platform-settings.version_conflict";
export const PROVIDER_NOT_CONFIGURED_CODE = "platform-settings.ai_provider_not_configured";
export const RESEARCH_EXPORT_NOT_CONFIGURED_CODE = "analytics.export_not_configured";
export const RESEARCH_EXPORT_NOT_CONFIGURED_MESSAGE = "La clave de anonimización no está configurada en el servidor";
export const STUDENT_CODE_IN_USE_CODE = "users.student_code_already_in_use";

export type ServerFieldError = { field: string, message: string };

/** Per-field errors of a 400/422 (`data.errors: [{ field, message }]`, already translated by the server); [] when absent. */
export function serverFieldErrors(error: unknown): ServerFieldError[] {
  const details = toApiError(error).details;
  const list = typeof details === "object" && details !== null ? (details as { errors?: unknown }).errors : undefined;

  if (!Array.isArray(list)) {
    return [];
  }

  return list.flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const { field, message } = item as { field?: unknown, message?: unknown };

    return typeof field === "string" && typeof message === "string" && message.trim() ? [{ field, message }] : [];
  });
}

const AI_RANGE_INVALID_MESSAGE = `El rango debe empezar antes de terminar y cubrir como máximo ${formatDays(AI_ANALYTICS_MAX_RANGE_DAYS)}.`;

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const ADMIN_CONSOLE_ERROR_MESSAGES = {
  "users.superadmin_role_immutable": SUPERADMIN_PROTECTED_MESSAGE,
  "users.superadmin_status_immutable": SUPERADMIN_PROTECTED_MESSAGE,
  "users.cannot_change_own_role": OWN_ACCOUNT_MESSAGE,
  "users.cannot_change_own_status": OWN_ACCOUNT_MESSAGE,
  "users.user_not_found": "El usuario ya no existe. Actualiza la lista.",
  [STUDENT_CODE_IN_USE_CODE]: "Código ya en uso",
  "users.student_code_invalid": "Usa de 1 a 32 letras, números o guiones, sin espacios.",
  [VERSION_CONFLICT_CODE]: "Otro administrador cambió este valor.",
  "platform-settings.setting_not_found": "El ajuste ya no existe. Actualiza la página.",
  "platform-settings.invalid_value": "El valor no es válido.",
  "platform-settings.hard_limit_exceeded": "El valor supera los límites permitidos.",
  [PROVIDER_NOT_CONFIGURED_CODE]: "La cadena incluye proveedores sin credenciales.",
  [RESEARCH_EXPORT_NOT_CONFIGURED_CODE]: RESEARCH_EXPORT_NOT_CONFIGURED_MESSAGE,
  "audit-log.invalid_range": "La fecha inicial debe ser anterior a la final.",
  "audit-log.not_found": "El registro de auditoría no existe.",
  "ai-telemetry.invalid_range": AI_RANGE_INVALID_MESSAGE,
  "ai-ratings.invalid_range": AI_RANGE_INVALID_MESSAGE,
  "ai.provider_unknown": "El proveedor de IA no existe.",
  "ai.provider_not_registered": "El proveedor de IA no tiene configuración (credenciales).",
} as const satisfies Record<string, string>;

export const ADMIN_CONSOLE_FALLBACK_MESSAGES = {
  forbidden: "No tienes permiso para realizar esta acción.",
  notFound: "El recurso solicitado ya no existe. Actualiza la página.",
  conflict: "Otro administrador cambió este dato. Actualiza la página.",
  invalid: "La solicitud no es válida. Revisa los datos e inténtalo de nuevo.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo completar la operación. Inténtalo de nuevo.",
} as const;

const STATUS_MESSAGES: Record<number, string> = {
  400: ADMIN_CONSOLE_FALLBACK_MESSAGES.invalid,
  403: ADMIN_CONSOLE_FALLBACK_MESSAGES.forbidden,
  404: ADMIN_CONSOLE_FALLBACK_MESSAGES.notFound,
  409: ADMIN_CONSOLE_FALLBACK_MESSAGES.conflict,
  422: ADMIN_CONSOLE_FALLBACK_MESSAGES.invalid,
};

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function isKnownCode(code: string): code is keyof typeof ADMIN_CONSOLE_ERROR_MESSAGES {
  return Object.prototype.hasOwnProperty.call(ADMIN_CONSOLE_ERROR_MESSAGES, code);
}

function providersOf(details: unknown): string[] {
  if (typeof details !== "object" || details === null) {
    return [];
  }

  const providers = (details as { providers?: unknown }).providers;

  return Array.isArray(providers) ? providers.filter((item): item is string => typeof item === "string") : [];
}

export function isVersionConflict(error: unknown): boolean {
  return error !== null && error !== undefined && toApiError(error).code === VERSION_CONFLICT_CODE;
}

export function getAdminConsoleErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (apiError.code === PROVIDER_NOT_CONFIGURED_CODE) {
    const providers = providersOf(apiError.details);

    return providers.length > 0
      ? `La cadena incluye proveedores sin credenciales: ${providers.join(", ")}.`
      : ADMIN_CONSOLE_ERROR_MESSAGES[PROVIDER_NOT_CONFIGURED_CODE];
  }

  if (isKnownCode(apiError.code)) {
    return ADMIN_CONSOLE_ERROR_MESSAGES[apiError.code];
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return ADMIN_CONSOLE_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return ADMIN_CONSOLE_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? ADMIN_CONSOLE_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return ADMIN_CONSOLE_FALLBACK_MESSAGES.server;
  }

  return STATUS_MESSAGES[apiError.status] ?? ADMIN_CONSOLE_FALLBACK_MESSAGES.unknown;
}

export const PROBE_RATE_LIMIT_MESSAGE = "Se alcanzó el límite de 3 pruebas por minuto.";

/** Message of a failed AI provider probe: the 429 of its 3-per-minute limit names the wait of Retry-After. */
export function getProbeErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? `${PROBE_RATE_LIMIT_MESSAGE} Espera un momento e inténtalo de nuevo.`
      : `${PROBE_RATE_LIMIT_MESSAGE} Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  return getAdminConsoleErrorMessage(error);
}
