/*
* Funcionalidad: Profile error messages
* Descripción: Maps a failed profile save (ApiError from the backend envelope or a client network code) to field errors and/or one Spanish alert message. Backend validation (400 `validation_error`, or 422) carries translated messages without field names, so each message is assigned to the name or avatar field by keyword (nombre/name, imagen/image/foto/url); the api-client joins an array of messages into one string, so a text that mentions both fields gives each field a generic client message instead; messages that match no field go to the alert. 403, 404, 429 (Retry-After wait), timeout, network and 5xx get their own messages. Spanish copy, TODO(i18n). Depends on @shared/api-client api-error and the profile entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";
import { PROFILE_ERRORS } from "./profile.entity";
import type { ProfileField, ProfileFieldErrors } from "./profile.entity";

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

const GENERIC_FIELD_ERRORS: Record<ProfileField, string> = {
  name: "Revisa el nombre ingresado.",
  image: PROFILE_ERRORS.imageInvalid,
};

export type ProfileSaveError = {
  fieldErrors: ProfileFieldErrors
  message: string | null
};

const FIELD_KEYWORDS: ReadonlyArray<[ProfileField, RegExp]> = [
  ["name", /\b(nombre|name)\b/i],
  ["image", /\b(imagen|image|foto|url)\b/i],
];

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function validationMessages(message: unknown, details: unknown): string[] {
  const fromDetails = Array.isArray(details) ? details.filter((item): item is string => typeof item === "string") : [];

  if (fromDetails.length > 0) {
    return fromDetails;
  }

  return typeof message === "string" && message.trim() !== "" ? [message] : [];
}

function mapValidation(messages: readonly string[]): ProfileSaveError {
  const fieldErrors: ProfileFieldErrors = {};
  const unmatched: string[] = [];

  for (const message of messages) {
    const fields = FIELD_KEYWORDS.filter(([, pattern]) => pattern.test(message)).map(([field]) => field);

    if (fields.length === 0) {
      unmatched.push(message);
    }

    for (const field of fields) {
      fieldErrors[field] ??= fields.length === 1 ? message : GENERIC_FIELD_ERRORS[field];
    }
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  return {
    fieldErrors,
    message: unmatched.length > 0 || !hasFieldErrors ? PROFILE_SAVE_MESSAGES.invalid : null,
  };
}

export function getProfileSaveError(error: unknown): ProfileSaveError {
  const apiError = toApiError(error);
  const alert = (message: string): ProfileSaveError => ({ fieldErrors: {}, message });

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return alert(PROFILE_SAVE_MESSAGES.timeout);
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return alert(PROFILE_SAVE_MESSAGES.network);
  }

  if (apiError.status === 400 || apiError.status === 422) {
    return mapValidation(validationMessages(apiError.message, apiError.details));
  }

  if (apiError.status === 403) {
    return alert(PROFILE_SAVE_MESSAGES.forbidden);
  }

  if (apiError.status === 404) {
    return alert(PROFILE_SAVE_MESSAGES.notFound);
  }

  if (apiError.status === 429) {
    return alert(apiError.retryAfter === undefined
      ? PROFILE_SAVE_MESSAGES.tooManyRequests
      : `Demasiados intentos. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`);
  }

  if (apiError.status >= 500) {
    return alert(PROFILE_SAVE_MESSAGES.server);
  }

  return alert(PROFILE_SAVE_MESSAGES.unknown);
}
