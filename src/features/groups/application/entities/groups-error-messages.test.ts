/*
* Funcionalidad: Groups error messages tests
* Descripción: Verifies the Spanish message of every groups error code of the backend and the fallbacks by status (403, 404, 409, 400/422, 429 with and without Retry-After, 5xx), timeout, network and unknown errors. Depends on vitest, the api-client ApiError and the groups error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError, CLIENT_ERROR_CODES } from "@shared/api-client/api-error";
import { GROUP_ERROR_MESSAGES, GROUP_FALLBACK_MESSAGES, getGroupErrorMessage } from "./groups-error-messages";

const apiError = (code: string, status: number, retryAfter?: number) =>
  new ApiError({ code, message: code, status, retryAfter });

describe("getGroupErrorMessage", () => {
  it.each([
    ["groups.student_already_in_group", 409],
    ["groups.member_role_not_allowed", 422],
    ["groups.leader_not_allowed", 422],
    ["groups.group_full", 409],
    ["groups.management_forbidden", 403],
    ["groups.type_creation_forbidden", 403],
  ] as const)("maps %s (%i)", (code, status) => {
    expect(getGroupErrorMessage(apiError(code, status))).toBe(GROUP_ERROR_MESSAGES[code]);
  });

  it.each([
    [403, GROUP_FALLBACK_MESSAGES.forbidden],
    [404, GROUP_FALLBACK_MESSAGES.notFound],
    [409, GROUP_FALLBACK_MESSAGES.conflict],
    [400, GROUP_FALLBACK_MESSAGES.invalid],
    [422, GROUP_FALLBACK_MESSAGES.invalid],
    [429, GROUP_FALLBACK_MESSAGES.tooManyRequests],
    [503, GROUP_FALLBACK_MESSAGES.server],
    [418, GROUP_FALLBACK_MESSAGES.unknown],
  ])("falls back by status %i for an unknown code", (status, message) => {
    expect(getGroupErrorMessage(apiError("common.other", status))).toBe(message);
  });

  it("tells how long to wait when Retry-After is present", () => {
    expect(getGroupErrorMessage(apiError("common.too_many_requests", 429, 30))).toBe(
      "Demasiadas solicitudes. Inténtalo de nuevo en 30 segundos.",
    );
    expect(getGroupErrorMessage(apiError("common.too_many_requests", 429, 90))).toBe(
      "Demasiadas solicitudes. Inténtalo de nuevo en 2 minutos.",
    );
  });

  it("maps timeout, network and non-API errors", () => {
    expect(getGroupErrorMessage(apiError(CLIENT_ERROR_CODES.networkTimeout, 0))).toBe(GROUP_FALLBACK_MESSAGES.timeout);
    expect(getGroupErrorMessage(apiError(CLIENT_ERROR_CODES.networkUnavailable, 0))).toBe(GROUP_FALLBACK_MESSAGES.network);
    expect(getGroupErrorMessage(new Error("boom"))).toBe(GROUP_FALLBACK_MESSAGES.unknown);
  });
});
