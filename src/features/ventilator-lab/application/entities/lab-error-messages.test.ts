/*
* Funcionalidad: Lab error messages tests
* Descripción: Generic Spanish messages of the lab reads and writes (getLabErrorMessage): network timeout and unavailable, 429 with and without Retry-After (seconds and minutes, singular and plural), 5xx, the 4xx statuses and the unknown fallback. Depends on vitest, the api-client ApiError and the lab error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import { getLabErrorMessage, LAB_FALLBACK_MESSAGES } from "./lab-error-messages";

const fail = (status: number, code = "x", retryAfter?: number) => new ApiError({ code, status, message: code, retryAfter });

describe("getLabErrorMessage", () => {
  it("explains network failures", () => {
    expect(getLabErrorMessage(fail(0, CLIENT_ERROR_CODES.networkTimeout))).toBe(LAB_FALLBACK_MESSAGES.timeout);
    expect(getLabErrorMessage(fail(0, CLIENT_ERROR_CODES.networkUnavailable))).toBe(LAB_FALLBACK_MESSAGES.network);
  });

  it("asks to wait on 429, with the Retry-After when the backend sends it", () => {
    expect(getLabErrorMessage(fail(429))).toBe(LAB_FALLBACK_MESSAGES.tooManyRequests);
    expect(getLabErrorMessage(fail(429, "x", 1))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 1 segundo.");
    expect(getLabErrorMessage(fail(429, "x", 30))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 30 segundos.");
    expect(getLabErrorMessage(fail(429, "x", 60))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 1 minuto.");
    expect(getLabErrorMessage(fail(429, "x", 61))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 2 minutos.");
  });

  it("maps server errors and the known client statuses", () => {
    expect(getLabErrorMessage(fail(500))).toBe(LAB_FALLBACK_MESSAGES.server);
    expect(getLabErrorMessage(fail(503))).toBe(LAB_FALLBACK_MESSAGES.server);
    expect(getLabErrorMessage(fail(400))).toBe(LAB_FALLBACK_MESSAGES.invalid);
    expect(getLabErrorMessage(fail(403))).toBe(LAB_FALLBACK_MESSAGES.forbidden);
    expect(getLabErrorMessage(fail(404))).toBe(LAB_FALLBACK_MESSAGES.notFound);
    expect(getLabErrorMessage(fail(409))).toBe(LAB_FALLBACK_MESSAGES.conflict);
    expect(getLabErrorMessage(fail(422))).toBe(LAB_FALLBACK_MESSAGES.invalid);
  });

  it("falls back to the unknown message", () => {
    expect(getLabErrorMessage(fail(418))).toBe(LAB_FALLBACK_MESSAGES.unknown);
    expect(getLabErrorMessage(new Error("boom"))).toBe(LAB_FALLBACK_MESSAGES.unknown);
  });
});
