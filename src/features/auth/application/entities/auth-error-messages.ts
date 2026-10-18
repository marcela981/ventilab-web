/*
* Funcionalidad: Auth error messages
* Descripción: Maps login failures (ApiError codes from the backend envelope or client network codes) to clear Spanish messages: invalid credentials, inactive account, Google-only account, domain not allowed, unverified Google email, invalid Google token, Google sign-in not configured, rate limit with the Retry-After wait, timeout/network and generic fallbacks. v1.1 (T9 follow-up): STALE_SESSION_MESSAGE for a NextAuth session of another user that could not be cleared after login, and the post-login redirect loop message. v1.2 (B3.4, D4): STALE_SESSION_MESSAGE removed with NextAuth; getRegisterErrorMessage maps registration failures (users.user_already_exists / 409 → email taken, 400 → check the data, the rest shared with login). Spanish copy, TODO(i18n). Depends on @shared/api-client api-error.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLIENT_ERROR_CODES, toApiError } from "@shared/api-client/api-error";

// TODO(i18n): move to an auth namespace in src/i18n.
export const AUTH_ERROR_MESSAGES = {
  invalidCredentials: "Correo o contraseña incorrectos.",
  userInactive: "Tu cuenta está desactivada. Contacta a tu docente o al administrador de VentyLab.",
  passwordLoginNotAvailable: "Esta cuenta inicia sesión con Google. Usa el botón «Continuar con Google».",
  emailDomainNotAllowed: "Tu correo no pertenece a un dominio autorizado para VentyLab.",
  googleEmailNotVerified: "Tu correo de Google no está verificado. Verifícalo en tu cuenta de Google e inténtalo de nuevo.",
  invalidGoogleToken: "No se pudo validar tu inicio de sesión con Google. Inténtalo de nuevo.",
  googleSignInNotConfigured: "El inicio de sesión con Google no está disponible en este momento. Usa tu correo y contraseña.",
  tooManyRequests: "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
  timeout: "El servidor tardó demasiado en responder. Puede estar iniciándose; inténtalo de nuevo en unos segundos.",
  network: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  badRequest: "Revisa el correo y la contraseña ingresados.",
  server: "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  unknown: "No se pudo iniciar sesión. Inténtalo de nuevo.",
} as const;

// TODO(i18n)
export const REDIRECT_LOOP_MESSAGE =
  "No se pudo abrir la página de destino porque no reconoce tu sesión. Cierra sesión e inicia sesión de nuevo.";

const MESSAGES_BY_CODE: Readonly<Record<string, string>> = {
  "auth.invalid_credentials": AUTH_ERROR_MESSAGES.invalidCredentials,
  "auth.user_inactive": AUTH_ERROR_MESSAGES.userInactive,
  "auth.password_login_not_available": AUTH_ERROR_MESSAGES.passwordLoginNotAvailable,
  "auth.email_domain_not_allowed": AUTH_ERROR_MESSAGES.emailDomainNotAllowed,
  "auth.google_email_not_verified": AUTH_ERROR_MESSAGES.googleEmailNotVerified,
  "auth.invalid_google_token": AUTH_ERROR_MESSAGES.invalidGoogleToken,
  "auth.google_sign_in_not_configured": AUTH_ERROR_MESSAGES.googleSignInNotConfigured,
  [CLIENT_ERROR_CODES.networkTimeout]: AUTH_ERROR_MESSAGES.timeout,
  [CLIENT_ERROR_CODES.networkUnavailable]: AUTH_ERROR_MESSAGES.network,
};

const RATE_LIMIT_CODE = "common.too_many_requests";

function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
}

export function getAuthErrorMessage(error: unknown): string {
  const apiError = toApiError(error);
  const known = MESSAGES_BY_CODE[apiError.code];

  if (known) {
    return known;
  }

  if (apiError.code === RATE_LIMIT_CODE || apiError.status === 429) {
    return apiError.retryAfter && apiError.retryAfter > 0
      ? `Demasiados intentos. Inténtalo de nuevo en ${formatWait(apiError.retryAfter)}.`
      : AUTH_ERROR_MESSAGES.tooManyRequests;
  }

  if (apiError.status >= 500) {
    return AUTH_ERROR_MESSAGES.server;
  }

  if (apiError.status >= 400) {
    return AUTH_ERROR_MESSAGES.badRequest;
  }

  return AUTH_ERROR_MESSAGES.unknown;
}

// TODO(i18n): move to an auth namespace in src/i18n.
export const REGISTER_ERROR_MESSAGES = {
  emailTaken: "Ya existe una cuenta con este correo. Inicia sesión o usa otro correo.",
  badRequest: "Revisa los datos ingresados e inténtalo de nuevo.",
  unknown: "No se pudo crear la cuenta. Inténtalo de nuevo.",
} as const;

const REGISTER_MESSAGES_BY_CODE: Readonly<Record<string, string>> = {
  "users.user_already_exists": REGISTER_ERROR_MESSAGES.emailTaken,
};

// Registration failures: a taken email (409) and invalid data (400) get their own message; the rest
// (domain not allowed, rate limit, network, server) share the login messages.
export function getRegisterErrorMessage(error: unknown): string {
  const apiError = toApiError(error);
  const known = REGISTER_MESSAGES_BY_CODE[apiError.code];

  if (known) {
    return known;
  }

  if (apiError.status === 409) {
    return REGISTER_ERROR_MESSAGES.emailTaken;
  }

  const message = getAuthErrorMessage(error);

  if (message === AUTH_ERROR_MESSAGES.badRequest) {
    return REGISTER_ERROR_MESSAGES.badRequest;
  }

  return message === AUTH_ERROR_MESSAGES.unknown ? REGISTER_ERROR_MESSAGES.unknown : message;
}
