/*
* Funcionalidad: Learning error messages tests
* Descripción: Unit tests of the Spanish messages for failed learning requests: 403, 404, 409, 429 with and without Retry-After, timeout, network, 5xx and unknown errors. Depends on vitest and the api-client errors.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import { getLearningErrorMessage, LEARNING_FALLBACK_MESSAGES } from "./learning-error-messages";

const apiError = (status: number, code = "x", retryAfter?: number) => new ApiError({ status, code, message: code, retryAfter });

describe("getLearningErrorMessage", () => {
  it.each([
    [403, LEARNING_FALLBACK_MESSAGES.forbidden],
    [404, LEARNING_FALLBACK_MESSAGES.notFound],
    [409, LEARNING_FALLBACK_MESSAGES.conflict],
    [429, LEARNING_FALLBACK_MESSAGES.tooManyRequests],
    [500, LEARNING_FALLBACK_MESSAGES.server],
    [418, LEARNING_FALLBACK_MESSAGES.unknown],
  ])("maps status %i", (status, message) => {
    expect(getLearningErrorMessage(apiError(status))).toBe(message);
  });

  it("tells how long to wait on 429 with Retry-After", () => {
    expect(getLearningErrorMessage(apiError(429, "common.too_many_requests", 1))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 1 segundo.");
    expect(getLearningErrorMessage(apiError(429, "common.too_many_requests", 90))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 2 minutos.");
  });

  it("maps client-side timeout and network failures", () => {
    expect(getLearningErrorMessage(apiError(0, CLIENT_ERROR_CODES.networkTimeout))).toBe(LEARNING_FALLBACK_MESSAGES.timeout);
    expect(getLearningErrorMessage(apiError(0, CLIENT_ERROR_CODES.networkUnavailable))).toBe(LEARNING_FALLBACK_MESSAGES.network);
  });

  it("falls back for errors that are not api errors", () => {
    expect(typeof getLearningErrorMessage(new Error("boom"))).toBe("string");
  });
});
