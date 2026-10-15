/*
* Funcionalidad: AI tutor error messages tests
* Descripción: Unit tests of the Spanish messages of the AI tutor errors: daily quota with the local reset time (and without it), short rate limit with the wait, provider unavailable (503 or its code), unpublished page (404, caller message or the learning default, pinned to the pre-S1 text), interrupted stream (client code, backend code, 502), a generic stream failure and network fallbacks. Depends on vitest and the api-client ApiError.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import { AI_ERROR_CODES, AI_ERROR_MESSAGES, formatResetTime, getAiErrorMessage } from "./ai-error-messages";
import { LEARNING_FALLBACK_MESSAGES } from "./learning-error-messages";

const NOW = Date.UTC(2026, 9, 14, 15, 0, 0);
const error = (code: string, status: number, retryAfter?: number) => new ApiError({ code, message: code, status, retryAfter });
const localTime = (epoch: number) => new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(epoch));

describe("formatResetTime", () => {
  it("formats the reset moment as local hh:mm", () => {
    expect(formatResetTime(5_400, NOW)).toBe(localTime(NOW + 5_400_000));
    expect(formatResetTime(5_400, NOW)).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("getAiErrorMessage", () => {
  it("shows the local reset time when the AI quota is exceeded", () => {
    expect(getAiErrorMessage(error(AI_ERROR_CODES.quotaExceeded, 429, 3_600), { now: NOW }))
      .toBe(`${AI_ERROR_MESSAGES.quotaExceeded} Podrás usarlo de nuevo a las ${localTime(NOW + 3_600_000)}.`);
  });

  it("asks to try later when the quota has no reset time", () => {
    expect(getAiErrorMessage(error(AI_ERROR_CODES.quotaExceeded, 429), { now: NOW }))
      .toBe(`${AI_ERROR_MESSAGES.quotaExceeded} Inténtalo más tarde.`);
  });

  it("keeps the short wait of a plain rate limit", () => {
    expect(getAiErrorMessage(error("common.too_many_requests", 429, 30))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 30 segundos.");
  });

  it("explains that the AI provider is unavailable", () => {
    expect(getAiErrorMessage(error(AI_ERROR_CODES.providersUnavailable, 503))).toBe(AI_ERROR_MESSAGES.providerUnavailable);
    expect(getAiErrorMessage(error("common.unknown", 503))).toBe(AI_ERROR_MESSAGES.providerUnavailable);
    // The same code delivered as a stream `error` event (no HTTP status).
    expect(getAiErrorMessage(error(AI_ERROR_CODES.providersUnavailable, 0))).toBe(AI_ERROR_MESSAGES.providerUnavailable);
  });

  it("uses the caller's not-found message for a 404 and the learning default otherwise", () => {
    expect(getAiErrorMessage(error("pages.page_not_found", 404), { notFound: AI_ERROR_MESSAGES.pageNotPublished })).toBe(AI_ERROR_MESSAGES.pageNotPublished);
    expect(getAiErrorMessage(error("ai-tutor.conversation_not_found", 404))).toBe(LEARNING_FALLBACK_MESSAGES.notFound);
  });

  it("keeps the pre-S1 learning not-found text for any 404 without a caller message", () => {
    const expected = "Este contenido no existe o todavía no está publicado.";

    expect(LEARNING_FALLBACK_MESSAGES.notFound).toBe(expected);
    expect(getAiErrorMessage(error("pages.page_not_found", 404))).toBe(expected);
    expect(getAiErrorMessage(error("common.not_found", 404), { now: NOW })).toBe(expected);
    expect(getAiErrorMessage(error("ai-tutor.conversation_not_found", 404), {})).toBe(expected);
  });

  it("reports an interrupted answer", () => {
    expect(getAiErrorMessage(error(CLIENT_ERROR_CODES.streamInterrupted, 0))).toBe(AI_ERROR_MESSAGES.interrupted);
    expect(getAiErrorMessage(error(AI_ERROR_CODES.streamInterrupted, 0))).toBe(AI_ERROR_MESSAGES.interrupted);
    expect(getAiErrorMessage(error(AI_ERROR_CODES.streamInterrupted, 502))).toBe(AI_ERROR_MESSAGES.interrupted);
  });

  it("reports a failed answer for other stream errors", () => {
    expect(getAiErrorMessage(error(AI_ERROR_CODES.streamFailed, 0))).toBe(AI_ERROR_MESSAGES.failed);
    expect(getAiErrorMessage(error("ai.something_else", 0))).toBe(AI_ERROR_MESSAGES.failed);
  });

  it("falls back to the learning messages for network errors", () => {
    expect(getAiErrorMessage(error(CLIENT_ERROR_CODES.networkUnavailable, 0))).toBe(LEARNING_FALLBACK_MESSAGES.network);
    expect(getAiErrorMessage(error("auth.forbidden", 403))).toBe(LEARNING_FALLBACK_MESSAGES.forbidden);
  });
});
