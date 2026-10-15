/*
* Funcionalidad: Evaluations error messages tests
* Descripción: Verifies that known evaluation error codes map to their Spanish message and that unknown codes fall back by status, Retry-After and network errors. Depends on vitest, the api-client errors and the evaluations error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import { EVALUATION_ERROR_MESSAGES, EVALUATION_FALLBACK_MESSAGES, getEvaluationErrorMessage } from "./evaluations-error-messages";

const apiError = (code: string, status: number, retryAfter?: number) =>
  new ApiError({ code, status, message: code, ...(retryAfter === undefined ? {} : { retryAfter }) });

describe("getEvaluationErrorMessage", () => {
  it("uses the message of a known code", () => {
    expect(getEvaluationErrorMessage(apiError("evaluation.max_attempts_reached", 409)))
      .toBe(EVALUATION_ERROR_MESSAGES["evaluation.max_attempts_reached"]);
    expect(getEvaluationErrorMessage(apiError("evaluation.not_open", 403))).toBe(EVALUATION_ERROR_MESSAGES["evaluation.not_open"]);
  });

  it("falls back by status, Retry-After and network errors", () => {
    expect(getEvaluationErrorMessage(apiError("common.other", 404))).toBe(EVALUATION_FALLBACK_MESSAGES.notFound);
    expect(getEvaluationErrorMessage(apiError("common.other", 503))).toBe(EVALUATION_FALLBACK_MESSAGES.server);
    expect(getEvaluationErrorMessage(apiError("common.rate", 429, 30))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 30 segundos.");
    expect(getEvaluationErrorMessage(apiError(CLIENT_ERROR_CODES.networkUnavailable, 0))).toBe(EVALUATION_FALLBACK_MESSAGES.network);
  });
});
