/*
* Funcionalidad: Auth error message tests
* Descripción: Checks that every backend auth error code, the rate limit (with and without Retry-After), network failures and unknown errors map to a clear Spanish message for the login page. v1.1 (B3.4, D4): registration messages (taken email by code or 409, invalid data, shared domain/rate-limit messages, unknown). Depends on vitest and the api-client ApiError.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { AUTH_ERROR_MESSAGES, getAuthErrorMessage, getRegisterErrorMessage, REGISTER_ERROR_MESSAGES } from "./auth-error-messages";

const apiError = (code: string, status: number, retryAfter?: number) =>
  new ApiError({ code, message: code, status, retryAfter });

describe("getAuthErrorMessage", () => {
  it.each([
    ["auth.invalid_credentials", 401, "Correo o contraseña incorrectos."],
    ["auth.user_inactive", 403, "Tu cuenta está desactivada"],
    ["auth.password_login_not_available", 400, "Esta cuenta inicia sesión con Google"],
    ["auth.email_domain_not_allowed", 403, "no pertenece a un dominio autorizado"],
    ["auth.google_email_not_verified", 401, "no está verificado"],
    ["auth.invalid_google_token", 401, "No se pudo validar tu inicio de sesión con Google"],
    ["auth.google_sign_in_not_configured", 503, "no está disponible en este momento"],
    ["network.timeout", 0, "tardó demasiado en responder"],
    ["network.unavailable", 0, "No se pudo conectar con el servidor"],
  ])("maps %s (%i)", (code, status, expected) => {
    expect(getAuthErrorMessage(apiError(code, status))).toContain(expected);
  });

  it("uses Retry-After seconds for the rate limit", () => {
    expect(getAuthErrorMessage(apiError("common.too_many_requests", 429, 30))).toBe(
      "Demasiados intentos. Inténtalo de nuevo en 30 segundos.",
    );
  });

  it("rounds long Retry-After values up to minutes", () => {
    expect(getAuthErrorMessage(apiError("common.too_many_requests", 429, 61))).toBe(
      "Demasiados intentos. Inténtalo de nuevo en 2 minutos.",
    );
    expect(getAuthErrorMessage(apiError("common.too_many_requests", 429, 1))).toBe(
      "Demasiados intentos. Inténtalo de nuevo en 1 segundo.",
    );
  });

  it("falls back to a generic rate-limit message without Retry-After", () => {
    expect(getAuthErrorMessage(apiError("common.too_many_requests", 429))).toBe(AUTH_ERROR_MESSAGES.tooManyRequests);
  });

  it("maps server errors and unknown failures to generic messages", () => {
    expect(getAuthErrorMessage(apiError("common.unknown", 500))).toBe(AUTH_ERROR_MESSAGES.server);
    expect(getAuthErrorMessage(apiError("common.something", 400))).toBe(AUTH_ERROR_MESSAGES.badRequest);
    expect(getAuthErrorMessage(new Error("boom"))).toBe(AUTH_ERROR_MESSAGES.unknown);
  });
});

describe("getRegisterErrorMessage", () => {
  it("maps a taken email by code and by status", () => {
    expect(getRegisterErrorMessage(apiError("users.user_already_exists", 409))).toBe(REGISTER_ERROR_MESSAGES.emailTaken);
    expect(getRegisterErrorMessage(apiError("common.conflict", 409))).toBe(REGISTER_ERROR_MESSAGES.emailTaken);
  });

  it("maps invalid data to the registration message", () => {
    expect(getRegisterErrorMessage(apiError("common.validation_error", 400))).toBe(REGISTER_ERROR_MESSAGES.badRequest);
  });

  it("shares the login messages for the domain, rate limit and server errors", () => {
    expect(getRegisterErrorMessage(apiError("auth.email_domain_not_allowed", 403))).toBe(AUTH_ERROR_MESSAGES.emailDomainNotAllowed);
    expect(getRegisterErrorMessage(apiError("common.too_many_requests", 429))).toBe(AUTH_ERROR_MESSAGES.tooManyRequests);
    expect(getRegisterErrorMessage(apiError("common.unknown", 500))).toBe(AUTH_ERROR_MESSAGES.server);
  });

  it("falls back to a registration message for unknown failures", () => {
    expect(getRegisterErrorMessage(new Error("boom"))).toBe(REGISTER_ERROR_MESSAGES.unknown);
  });
});