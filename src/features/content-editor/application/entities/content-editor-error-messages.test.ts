/*
* Funcionalidad: Content editor error messages tests
* Descripción: Unit tests of the Spanish error mapping of the content editor: the student-data 409 (archive instead) and other known codes, the 409 variants (duplicate slug or title, generic conflict), status fallbacks (400, 403, 404, 413, 415, 422, 429 with and without Retry-After, 5xx), timeout and network errors, and isStudentDataConflict. v1.1 (C3): prerequisite codes and isCircularDependency. v1.2 (C4): page block codes (invalid block, block or media not found, invalid block reorder). Depends on vitest and the api-client errors. v1.3 (C5): media codes (in use, too large, unsupported type, file required, not found, storage unavailable), bare 413/415 and isMediaInUse.
* Versión: 1.3 (C5)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import {
  CONTENT_ERROR_MESSAGES,
  CONTENT_FALLBACK_MESSAGES,
  getContentErrorMessage,
  isCircularDependency,
  isMediaInUse,
  isStudentDataConflict,
} from "./content-editor-error-messages";

const apiError = (status: number, code = "common.unknown", retryAfter?: number) => new ApiError({ status, code, message: code, retryAfter });

describe("getContentErrorMessage", () => {
  it("maps the known content codes", () => {
    expect(getContentErrorMessage(apiError(409, "curriculum.node_has_student_data"))).toBe(CONTENT_ERROR_MESSAGES["curriculum.node_has_student_data"]);
    expect(getContentErrorMessage(apiError(409, "sections.section_slug_already_exists"))).toMatch(/identificador/);
    expect(getContentErrorMessage(apiError(409, "levels.level_title_already_exists"))).toMatch(/título/);
    expect(getContentErrorMessage(apiError(400, "modules.invalid_module_reorder"))).toMatch(/orden/);
  });

  it("maps the page block codes", () => {
    expect(getContentErrorMessage(apiError(400, "pages.invalid_page_block"))).toMatch(/bloque/);
    expect(getContentErrorMessage(apiError(404, "pages.page_block_not_found"))).toMatch(/bloque/);
    expect(getContentErrorMessage(apiError(400, "pages.page_media_not_found"))).toMatch(/archivo/);
    expect(getContentErrorMessage(apiError(400, "pages.invalid_page_block_reorder"))).toMatch(/orden/);
  });

  it("falls back by status", () => {
    expect(getContentErrorMessage(apiError(400))).toBe(CONTENT_FALLBACK_MESSAGES.invalid);
    expect(getContentErrorMessage(apiError(403))).toBe(CONTENT_FALLBACK_MESSAGES.forbidden);
    expect(getContentErrorMessage(apiError(404))).toBe(CONTENT_FALLBACK_MESSAGES.notFound);
    expect(getContentErrorMessage(apiError(409))).toBe(CONTENT_FALLBACK_MESSAGES.conflict);
    expect(getContentErrorMessage(apiError(413))).toBe(CONTENT_FALLBACK_MESSAGES.tooLarge);
    expect(getContentErrorMessage(apiError(415))).toBe(CONTENT_FALLBACK_MESSAGES.unsupportedType);
    expect(getContentErrorMessage(apiError(422))).toBe(CONTENT_FALLBACK_MESSAGES.invalid);
    expect(getContentErrorMessage(apiError(429))).toBe(CONTENT_FALLBACK_MESSAGES.tooManyRequests);
    expect(getContentErrorMessage(apiError(429, "common.too_many_requests", 30))).toBe("Demasiadas solicitudes. Inténtalo de nuevo en 30 segundos.");
    expect(getContentErrorMessage(apiError(503))).toBe(CONTENT_FALLBACK_MESSAGES.server);
  });

  it("maps client-side failures", () => {
    expect(getContentErrorMessage(apiError(0, CLIENT_ERROR_CODES.networkTimeout))).toBe(CONTENT_FALLBACK_MESSAGES.timeout);
    expect(getContentErrorMessage(apiError(0, CLIENT_ERROR_CODES.networkUnavailable))).toBe(CONTENT_FALLBACK_MESSAGES.network);
    expect(getContentErrorMessage(new Error("boom"))).toBe(CONTENT_FALLBACK_MESSAGES.unknown);
  });
});

describe("isStudentDataConflict", () => {
  it("only accepts the student-data 409", () => {
    expect(isStudentDataConflict(apiError(409, "curriculum.node_has_student_data"))).toBe(true);
    expect(isStudentDataConflict(apiError(409, "sections.section_slug_already_exists"))).toBe(false);
    expect(isStudentDataConflict(apiError(500, "curriculum.node_has_student_data"))).toBe(false);
  });
});

describe("isCircularDependency", () => {
  it("accepts the level and module cycle 409 and maps them to a cycle message", () => {
    expect(isCircularDependency(apiError(409, "levels.level_circular_dependency"))).toBe(true);
    expect(isCircularDependency(apiError(409, "modules.module_circular_dependency"))).toBe(true);
    expect(isCircularDependency(apiError(409, "modules.module_prerequisite_already_exists"))).toBe(false);
    expect(isCircularDependency(apiError(500, "levels.level_circular_dependency"))).toBe(false);
    expect(getContentErrorMessage(apiError(409, "modules.module_circular_dependency"))).toMatch(/ciclo/);
    expect(getContentErrorMessage(apiError(400, "levels.level_self_prerequisite"))).toMatch(/sí mismo/);
  });
});

describe("media errors", () => {
  it("maps the media codes to specific messages", () => {
    expect(getContentErrorMessage(apiError(409, "media.media_in_use"))).toBe(CONTENT_ERROR_MESSAGES["media.media_in_use"]);
    expect(getContentErrorMessage(apiError(413, "media.media_too_large"))).toMatch(/demasiado grande/);
    expect(getContentErrorMessage(apiError(415, "media.unsupported_media_type"))).toMatch(/PNG/);
    expect(getContentErrorMessage(apiError(400, "media.file_required"))).toMatch(/vacío/);
    expect(getContentErrorMessage(apiError(404, "media.media_not_found"))).toMatch(/ya no existe/);
    expect(getContentErrorMessage(apiError(503, "media.storage_unavailable"))).toMatch(/almacenamiento/);
  });

  it("maps a bare 413 or 415 to the upload fallbacks", () => {
    expect(getContentErrorMessage(apiError(413))).toBe(CONTENT_FALLBACK_MESSAGES.tooLarge);
    expect(getContentErrorMessage(apiError(415))).toBe(CONTENT_FALLBACK_MESSAGES.unsupportedType);
  });

  it("recognizes the media in use conflict", () => {
    expect(isMediaInUse(apiError(409, "media.media_in_use"))).toBe(true);
    expect(isMediaInUse(apiError(409, "pages.page_slug_already_exists"))).toBe(false);
  });
});
