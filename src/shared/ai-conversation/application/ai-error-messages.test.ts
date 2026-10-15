/*
* Funcionalidad: AI conversation error messages tests
* Descripción: Unit tests of the generic Spanish messages of AI stream errors: quota with the local reset time (and without it), provider unavailable (503, its code, as a stream frame), connection lost mid-stream (client code, backend code, 502), generic stream failure, 404 with the caller's text, generic fallbacks (network, plain 429 wait, 5xx) and caller overrides of messages and fallback. Depends on vitest and the api-client ApiError.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import { AI_ERROR_CODES, AI_FALLBACK_MESSAGES, AI_STREAM_ERROR_MESSAGES, formatResetTime, getAiErrorMessage } from "./ai-error-messages";

const NOW = Date.UTC(2026, 9, 15, 15, 0, 0);
const error = (code: string, status: number, retryAfter?: number) => new ApiError({ code, message: code, status, retryAfter });
const localTime = (epoch: number) => new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(epoch));

describe("getAiErrorMessage (generic core)", () => {
  it("formats the reset moment as local hh:mm", () => {
    expect(formatResetTime(5_400, NOW)).toBe(localTime(NOW + 5_400_000));
  });

  it("shows the local reset time of an exceeded quota, or asks to try later", () => {
    expect(getAiErrorMessage(error(AI_ERROR_CODES.quotaExceeded, 429, 3_600), { now: NOW }))
      .toBe(`${AI_STREAM_ERROR_MESSAGES.quotaExceeded} Podrás usarlo de nuevo a las ${localTime(NOW + 3_600_000)}.`);
    expect(getAiErrorMessage(error(AI_ERROR_CODES.quotaExceeded, 429))).toBe(`${AI_STREAM_ERROR_MESSAGES.quotaExceeded} Inténtalo más tarde.`);
  });

  it("explains that the AI provider is unavailable", () => {
    expect(getAiErrorMessage(error(AI_ERROR_CODES.providersUnavailable, 503))).toBe(AI_STREAM_ERROR_MESSAGES.providerUnavailable);
    expect(getAiErrorMessage(error("common.unknown", 503))).toBe(AI_STREAM_ERROR_MESSAGES.providerUnavailable);
    expect(getAiErrorMessage(error(AI_ERROR_CODES.providersUnavailable, 0))).toBe(AI_STREAM_ERROR_MESSAGES.providerUnavailable);
  });

  it("reports a connection lost mid-stream and other stream failures", () => {
    expect(getAiErrorMessage(error(CLIENT_ERROR_CODES.streamInterrupted, 0))).toBe(AI_STREAM_ERROR_MESSAGES.interrupted);
    expect(getAiErrorMessage(error(AI_ERROR_CODES.streamInterrupted, 0))).toBe(AI_STREAM_ERROR_MESSAGES.interrupted);
    expect(getAiErrorMessage(error("common.bad_gateway", 502))).toBe(AI_STREAM_ERROR_MESSAGES.interrupted);
    expect(getAiErrorMessage(error(AI_ERROR_CODES.streamFailed, 0))).toBe(AI_STREAM_ERROR_MESSAGES.failed);
  });

  it("uses the caller's 404 text and the generic fallbacks", () => {
    expect(getAiErrorMessage(error("ai-tutor.conversation_not_found", 404), { notFound: "No existe." })).toBe("No existe.");
    expect(getAiErrorMessage(error("ai-tutor.conversation_not_found", 404))).toBe(AI_FALLBACK_MESSAGES.notFound);
    expect(getAiErrorMessage(error(CLIENT_ERROR_CODES.networkUnavailable, 0))).toBe(AI_FALLBACK_MESSAGES.network);
    expect(getAiErrorMessage(error("common.too_many_requests", 429, 30))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 30 segundos.");
    expect(getAiErrorMessage(error("common.internal", 500))).toBe(AI_FALLBACK_MESSAGES.server);
  });

  it("lets the caller replace messages and the fallback", () => {
    const options = { messages: { failed: "El tutor falló." }, fallback: () => "Otro error." };

    expect(getAiErrorMessage(error(AI_ERROR_CODES.streamFailed, 0), options)).toBe("El tutor falló.");
    expect(getAiErrorMessage(error("auth.forbidden", 403), options)).toBe("Otro error.");
  });
});
