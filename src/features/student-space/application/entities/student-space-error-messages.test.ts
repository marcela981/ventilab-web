/*
* Funcionalidad: Student space error messages tests
* Descripción: Spanish messages of the module notes analysis (`POST /api/notes/analyze` with moduleId): 422 without notes in the module, 502 failed AI call, 503 AI unavailable, 429 with and without Retry-After (seconds and minutes) and the fallback to the general student space messages (known notes code, network). Depends on vitest, the api-client errors and the student space error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import {
  getModuleAnalysisErrorMessage,
  getStudentSpaceErrorMessage,
  MODULE_ANALYSIS_MESSAGES,
  STUDENT_SPACE_ERROR_MESSAGES,
  STUDENT_SPACE_FALLBACK_MESSAGES,
} from "./student-space-error-messages";

const apiError = (status: number, code = "common.error", retryAfter?: number) => new ApiError({ code, message: code, status, retryAfter });

describe("getModuleAnalysisErrorMessage", () => {
  it("explains that the module has no notes to analyze (422)", () => {
    expect(getModuleAnalysisErrorMessage(apiError(422, "notes.no_notes"))).toBe(MODULE_ANALYSIS_MESSAGES.noNotes);
  });

  it("reports a failed AI call (502)", () => {
    expect(getModuleAnalysisErrorMessage(apiError(502, "ai.failed"))).toBe(MODULE_ANALYSIS_MESSAGES.failed);
  });

  it("reports the AI service as unavailable (503)", () => {
    expect(getModuleAnalysisErrorMessage(apiError(503, "ai.unavailable"))).toBe(MODULE_ANALYSIS_MESSAGES.unavailable);
  });

  it("tells how long to wait when the rate limit sends Retry-After (429)", () => {
    expect(getModuleAnalysisErrorMessage(apiError(429, "rate_limited", 1))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 1 segundo.");
    expect(getModuleAnalysisErrorMessage(apiError(429, "rate_limited", 45))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 45 segundos.");
    expect(getModuleAnalysisErrorMessage(apiError(429, "rate_limited", 90))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 2 minutos.");
  });

  it("falls back to the generic rate limit message without Retry-After", () => {
    expect(getModuleAnalysisErrorMessage(apiError(429, "rate_limited"))).toBe(STUDENT_SPACE_FALLBACK_MESSAGES.tooManyRequests);
  });

  it("falls back to the student space messages for other failures", () => {
    expect(getModuleAnalysisErrorMessage(apiError(404, "notes.not_found"))).toBe(STUDENT_SPACE_ERROR_MESSAGES["notes.not_found"]);
    expect(getModuleAnalysisErrorMessage(apiError(0, CLIENT_ERROR_CODES.networkUnavailable))).toBe(STUDENT_SPACE_FALLBACK_MESSAGES.network);
    expect(getModuleAnalysisErrorMessage(apiError(500))).toBe(STUDENT_SPACE_FALLBACK_MESSAGES.server);
  });

  it("keeps 422 as an invalid request outside the analysis", () => {
    expect(getStudentSpaceErrorMessage(apiError(422))).toBe(STUDENT_SPACE_FALLBACK_MESSAGES.invalid);
  });
});
