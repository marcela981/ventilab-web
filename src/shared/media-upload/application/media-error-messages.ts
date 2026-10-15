/*
* Funcionalidad: Media error messages
* Descripción: Spanish messages of the failures of the media library calls (POST/DELETE /api/media, GET /api/media/{id}/url). MEDIA_ERROR_MESSAGES holds the backend media codes (media in use 409, too large 413, unsupported type 415, file required, not found, storage unavailable); features may spread it into their own catalog and override a message with their wording (the content editor names pages in the media-in-use message). getMediaErrorMessage maps a known code first, then timeout, network, 413, 415, 429 (with Retry-After), 5xx and an unknown fallback. isMediaInUse recognizes the 409 media.media_in_use conflict. Depends on the api-client errors.
* Versión: 1.0 (S1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

export const MEDIA_IN_USE_CODE = "media.media_in_use";

// TODO(i18n): move to a media namespace in src/i18n.
export const MEDIA_ERROR_MESSAGES = {
  [MEDIA_IN_USE_CODE]: "Este archivo ya se usa en contenido guardado y no se puede eliminar.",
  "media.media_too_large": "El archivo es demasiado grande para su tipo (imágenes hasta 10 MB, PDF hasta 20 MB, videos hasta 100 MB).",
  "media.unsupported_media_type": "Ese tipo de archivo no está permitido. Usa PNG, JPEG, WebP o GIF; PDF; o video MP4 o WebM.",
  "media.file_required": "El archivo está vacío. Elige otro.",
  "media.media_not_found": "El archivo ya no existe. Actualiza la página.",
  "media.storage_unavailable": "El almacenamiento de archivos no está disponible en este momento. Inténtalo más tarde.",
} as const satisfies Record<string, string>;

export const MEDIA_FALLBACK_MESSAGES = {
  tooLarge: "El archivo es demasiado grande.",
  unsupportedType: "El tipo de archivo no está permitido.",
  tooManyRequests: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo subir el archivo. Inténtalo de nuevo.",
} as const;

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

function isKnownCode(code: string): code is keyof typeof MEDIA_ERROR_MESSAGES {
  return Object.prototype.hasOwnProperty.call(MEDIA_ERROR_MESSAGES, code);
}

export function isMediaInUse(error: unknown): boolean {
  const apiError = toApiError(error);

  return apiError.status === 409 && apiError.code === MEDIA_IN_USE_CODE;
}

export function getMediaErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (isKnownCode(apiError.code)) {
    return MEDIA_ERROR_MESSAGES[apiError.code];
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkTimeout) {
    return MEDIA_FALLBACK_MESSAGES.timeout;
  }

  if (apiError.code === CLIENT_ERROR_CODES.networkUnavailable) {
    return MEDIA_FALLBACK_MESSAGES.network;
  }

  if (apiError.status === 413) {
    return MEDIA_FALLBACK_MESSAGES.tooLarge;
  }

  if (apiError.status === 415) {
    return MEDIA_FALLBACK_MESSAGES.unsupportedType;
  }

  if (apiError.status === 429) {
    return apiError.retryAfter === undefined
      ? MEDIA_FALLBACK_MESSAGES.tooManyRequests
      : `Demasiadas solicitudes. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`;
  }

  if (apiError.status >= 500) {
    return MEDIA_FALLBACK_MESSAGES.server;
  }

  return MEDIA_FALLBACK_MESSAGES.unknown;
}
