/*
* Funcionalidad: Profile error messages
* Descripción: Maps a failed profile request (ApiError from the backend envelope or a client network code) to Spanish messages. `getCommonRequestMessage` covers what every profile action shares (timeout, network, 403, 404, 429 with the Retry-After wait, 5xx) and is reused by the photo and password actions. `getProfileSaveError` handles the name save: backend validation (400 `validation_error`, or 422) carries translated messages without field names, so a message that mentions the name goes to the name field and the rest to the alert. Spanish copy, TODO(i18n). Depends on @shared/api-client api-error and the profile entity. v1.1 (Bloque 4, W7): avatar URL field removed; common messages extracted.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import type { ApiError } from "@shared/api-client/api-error";
import type { ProfileFieldErrors } from "./profile.entity";

// TODO(i18n): move to a profile namespace in src/i18n.
export const PROFILE_SAVE_MESSAGES = {
  invalid: "Revisa los datos ingresados.",
  forbidden: "No tienes permiso para modificar este perfil.",
  notFound: "No se encontró tu cuenta. Cierra sesión e inicia sesión de nuevo.",
  tooManyRequests: "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
} as const;

export type ProfileSaveError = {
  fieldErrors: ProfileFieldErrors
  message: string | null
};

const NAME_KEYWORD = /\b(nombre|name)\b/i;

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

/** Message of the failures every profile action shares; null for the ones the caller maps itself (400, 413, …). */
export function getCommonRequestMessage(apiError: ApiError): string | null {
  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return PROFILE_SAVE_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return PROFILE_SAVE_MESSAGES.network;
  }

  if (apiError.status === 403) {
    return PROFILE_SAVE_MESSAGES.forbidden;
  }

  if (apiError.status === 404) {
    return PROFILE_SAVE_MESSAGES.notFound;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? PROFILE_SAVE_MESSAGES.tooManyRequests
      : `Demasiados intentos. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return PROFILE_SAVE_MESSAGES.server;
  }

  return null;
}

function validationMessages(message: unknown, details: unknown): string[] {
  const fromDetails = Array.isArray(details) ? details.filter((item): item is string => typeof item === "string") : [];

  if (fromDetails.length > 0) {
    return fromDetails;
  }

  return typeof message === "string" && message.trim() !== "" ? [message] : [];
}

function mapValidation(messages: readonly string[]): ProfileSaveError {
  const nameMessage = messages.find((message) => NAME_KEYWORD.test(message));
  const unmatched = messages.some((message) => !NAME_KEYWORD.test(message));

  return {
    fieldErrors: nameMessage ? { name: nameMessage } : {},
    message: unmatched || !nameMessage ? PROFILE_SAVE_MESSAGES.invalid : null,
  };
}

export function getProfileSaveError(error: unknown): ProfileSaveError {
  const apiError = toApiError(error);

  if (apiError.status === 400 || apiError.status === 422) {
    return mapValidation(validationMessages(apiError.message, apiError.details));
  }

  return { fieldErrors: {}, message: getCommonRequestMessage(apiError) ?? PROFILE_SAVE_MESSAGES.unknown };
}
