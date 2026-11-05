/*
* Funcionalidad: Password recovery entities
* Descripción: Copy and error messages of the password recovery flow (Ajustes D3): POST /api/auth/password/forgot always answers 202, so the sent notice never says whether the email has an account; POST /api/auth/password/reset answers 400 auth.password_reset_token_invalid for an unknown, expired or used link (offer a new one) and shares the rate limit, network and server messages of the login. readResetToken takes the token from the ?token= query. Depends on the api-client error helpers and ./auth-error-messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import { getAuthErrorMessage } from "./auth-error-messages";

// TODO(i18n): move to an auth namespace in src/i18n.
export const PASSWORD_RESET_MESSAGES = {
  sent: "Si el correo corresponde a una cuenta con contraseña, te enviamos un enlace para restablecerla. Revisa tu bandeja de entrada (y la de correo no deseado). El enlace vence en 30 minutos.",
  invalidToken: "El enlace para restablecer la contraseña no es válido o ya venció. Pide uno nuevo.",
  missingToken: "Falta el enlace de recuperación. Ábrelo desde el correo o pide uno nuevo.",
  done: "Tu contraseña se restableció. Inicia sesión con la nueva contraseña.",
  badRequest: "Revisa los datos ingresados e inténtalo de nuevo.",
  unknown: "No se pudo completar la solicitud. Inténtalo de nuevo.",
} as const;

const INVALID_TOKEN_CODE = "auth.password_reset_token_invalid";

export function getPasswordResetErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (apiError.code === INVALID_TOKEN_CODE) {
    return PASSWORD_RESET_MESSAGES.invalidToken;
  }

  if (apiError.status === 400) {
    return PASSWORD_RESET_MESSAGES.badRequest;
  }

  return getAuthErrorMessage(error);
}

export function isInvalidResetTokenError(error: unknown): boolean {
  return toApiError(error).code === INVALID_TOKEN_CODE;
}

/** The token of the reset link (?token=), or null when missing. */
export function readResetToken(query: Record<string, string | string[] | undefined>): string | null {
  const raw = query.token;
  const token = (Array.isArray(raw) ? raw[0] : raw)?.trim();

  return token ? token : null;
}
