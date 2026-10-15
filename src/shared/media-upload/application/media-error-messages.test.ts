/*
* Funcionalidad: Media error messages tests
* Descripción: Unit tests of the Spanish messages of the media library failures: known media codes, the media-in-use conflict, status fallbacks (413, 415, 429 with Retry-After, 5xx), network and timeout errors and the unknown fallback. Depends on vitest, the api-client errors and the media error messages.
* Versión: 1.0 (S1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import { getMediaErrorMessage, isMediaInUse, MEDIA_ERROR_MESSAGES, MEDIA_FALLBACK_MESSAGES } from "./media-error-messages";

const apiError = (status: number, code: string, retryAfter?: number) =>
  new ApiError({ status, code, message: code, ...(retryAfter === undefined ? {} : { retryAfter }) });

describe("media error messages", () => {
  it("maps the media codes to specific messages", () => {
    expect(getMediaErrorMessage(apiError(413, "media.media_too_large"))).toBe(MEDIA_ERROR_MESSAGES["media.media_too_large"]);
    expect(getMediaErrorMessage(apiError(415, "media.unsupported_media_type"))).toMatch(/PNG/);
    expect(getMediaErrorMessage(apiError(503, "media.storage_unavailable"))).toMatch(/almacenamiento/);
  });

  it("falls back by status, network and timeout", () => {
    expect(getMediaErrorMessage(apiError(413, "common.payload_too_large"))).toBe(MEDIA_FALLBACK_MESSAGES.tooLarge);
    expect(getMediaErrorMessage(apiError(415, "common.unsupported"))).toBe(MEDIA_FALLBACK_MESSAGES.unsupportedType);
    expect(getMediaErrorMessage(apiError(429, "common.too_many_requests", 30))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 30 segundos.");
    expect(getMediaErrorMessage(apiError(500, "common.internal_error"))).toBe(MEDIA_FALLBACK_MESSAGES.server);
    expect(getMediaErrorMessage(apiError(0, CLIENT_ERROR_CODES.networkUnavailable))).toBe(MEDIA_FALLBACK_MESSAGES.network);
    expect(getMediaErrorMessage(apiError(0, CLIENT_ERROR_CODES.networkTimeout))).toBe(MEDIA_FALLBACK_MESSAGES.timeout);
    expect(getMediaErrorMessage(apiError(400, "common.bad_request"))).toBe(MEDIA_FALLBACK_MESSAGES.unknown);
  });

  it("recognizes the media in use conflict", () => {
    expect(isMediaInUse(apiError(409, "media.media_in_use"))).toBe(true);
    expect(isMediaInUse(apiError(409, "media.media_not_found"))).toBe(false);
  });
});
