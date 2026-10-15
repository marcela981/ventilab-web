/*
* Funcionalidad: Evaluations error messages tests
* Descripción: Verifies that known evaluation error codes map to their Spanish message and that unknown codes fall back by status, Retry-After and network errors. Depends on vitest, the api-client errors and the evaluations error messages. v1.1 (A3 review follow-up): isRetryableEvaluationError accepts only network, timeout, 429 and 5xx failures.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import { EVALUATION_ERROR_MESSAGES, EVALUATION_FALLBACK_MESSAGES, getEvaluationErrorMessage, isRetryableEvaluationError } from "./evaluations-error-messages";

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

describe("isRetryableEvaluationError", () => {
  it("retries only network, timeout, rate-limit and server failures", () => {
    expect(isRetryableEvaluationError(apiError(CLIENT_ERROR_CODES.networkUnavailable, 0))).toBe(true);
    expect(isRetryableEvaluationError(apiError(CLIENT_ERROR_CODES.networkTimeout, 0))).toBe(true);
    expect(isRetryableEvaluationError(apiError("common.rate", 429))).toBe(true);
    expect(isRetryableEvaluationError(apiError("internal_error", 503))).toBe(true);
    expect(isRetryableEvaluationError(apiError("common.forbidden", 403))).toBe(false);
    expect(isRetryableEvaluationError(apiError("evaluation.answer_invalid", 422))).toBe(false);
    expect(isRetryableEvaluationError(apiError("common.not_found", 404))).toBe(false);
    expect(isRetryableEvaluationError(apiError(CLIENT_ERROR_CODES.unknown, 0))).toBe(false);
  });
});
