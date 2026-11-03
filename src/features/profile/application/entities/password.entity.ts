/*
* Funcionalidad: Password entity
* Descripción: Change-password form rules with the backend complexity policy (ChangePasswordDTO: 8 to 128 characters with an uppercase letter, a lowercase letter and a number) and julio's messages (ChangePasswordForm.jsx): the requirement checklist shown under the new password, the per-field validation (current required, new required/policy/different from the current one, confirmation required and equal) and the mapping of a failed `POST /api/auth/change-password` (400 users.invalid_current_password / users.same_password / users.password_not_set, other 400s with the backend's translated validation message, 429 and the common failures) to a field error or one alert. Spanish copy, TODO(i18n). Depends on @shared/api-client api-error and the profile error messages.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import { getCommonRequestMessage } from "./profile-error-messages";

export const PASSWORD_MIN = 8;

export const PASSWORD_MAX = 128;

export type PasswordDraft = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
};

export type PasswordField = keyof PasswordDraft;

export type PasswordFieldErrors = Partial<Record<PasswordField, string>>;

export const EMPTY_PASSWORD_DRAFT: PasswordDraft = { currentPassword: "", newPassword: "", confirmPassword: "" };

// TODO(i18n): move to a profile namespace in src/i18n. Texts from julio (ChangePasswordForm.jsx).
export const PASSWORD_MESSAGES = {
  currentRequired: "La contraseña actual es requerida",
  newRequired: "La nueva contraseña es requerida",
  tooShort: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`,
  tooLong: `La contraseña puede tener como máximo ${PASSWORD_MAX} caracteres`,
  lowercase: "Debe contener al menos una letra minúscula",
  uppercase: "Debe contener al menos una letra mayúscula",
  number: "Debe contener al menos un número",
  sameAsCurrent: "La nueva contraseña debe ser diferente a la actual",
  confirmRequired: "Debes confirmar la nueva contraseña",
  mismatch: "Las contraseñas no coinciden",
  wrongCurrent: "Contraseña actual incorrecta",
  googleAccount: "Tu cuenta usa Google; la contraseña se gestiona en Google.",
  success: "Contraseña actualizada correctamente",
  failed: "Error al cambiar la contraseña",
} as const;

export type PasswordRequirement = {
  key: "length" | "lowercase" | "uppercase" | "number"
  label: string
  met: boolean
};

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { key: "length", label: `Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`, met: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX },
    { key: "lowercase", label: "Al menos una letra minúscula", met: /[a-z]/.test(password) },
    { key: "uppercase", label: "Al menos una letra mayúscula", met: /[A-Z]/.test(password) },
    { key: "number", label: "Al menos un número", met: /\d/.test(password) },
  ];
}

function validateNewPassword(draft: PasswordDraft): string | undefined {
  const { newPassword, currentPassword } = draft;

  if (newPassword === "") {
    return PASSWORD_MESSAGES.newRequired;
  }

  if (newPassword.length < PASSWORD_MIN) {
    return PASSWORD_MESSAGES.tooShort;
  }

  if (newPassword.length > PASSWORD_MAX) {
    return PASSWORD_MESSAGES.tooLong;
  }

  if (!/[a-z]/.test(newPassword)) {
    return PASSWORD_MESSAGES.lowercase;
  }

  if (!/[A-Z]/.test(newPassword)) {
    return PASSWORD_MESSAGES.uppercase;
  }

  if (!/\d/.test(newPassword)) {
    return PASSWORD_MESSAGES.number;
  }

  return currentPassword !== "" && newPassword === currentPassword ? PASSWORD_MESSAGES.sameAsCurrent : undefined;
}

function validateConfirmation(draft: PasswordDraft): string | undefined {
  if (draft.confirmPassword === "") {
    return PASSWORD_MESSAGES.confirmRequired;
  }

  return draft.confirmPassword === draft.newPassword ? undefined : PASSWORD_MESSAGES.mismatch;
}

export function validatePasswordDraft(draft: PasswordDraft): PasswordFieldErrors {
  const errors: PasswordFieldErrors = {};
  const newError = validateNewPassword(draft);
  const confirmError = validateConfirmation(draft);

  if (draft.currentPassword === "") {
    errors.currentPassword = PASSWORD_MESSAGES.currentRequired;
  }

  if (newError) {
    errors.newPassword = newError;
  }

  if (confirmError) {
    errors.confirmPassword = confirmError;
  }

  return errors;
}

export type ChangePasswordError = {
  fieldErrors: PasswordFieldErrors
  message: string | null
};

export function getChangePasswordError(error: unknown): ChangePasswordError {
  const apiError = toApiError(error);

  if (apiError.code === "users.invalid_current_password") {
    return { fieldErrors: { currentPassword: PASSWORD_MESSAGES.wrongCurrent }, message: null };
  }

  if (apiError.code === "users.same_password") {
    return { fieldErrors: { newPassword: PASSWORD_MESSAGES.sameAsCurrent }, message: null };
  }

  if (apiError.code === "users.password_not_set") {
    return { fieldErrors: {}, message: PASSWORD_MESSAGES.googleAccount };
  }

  // Other 400s are DTO validation failures whose message is already translated by the backend (Accept-Language: es).
  if (apiError.status === 400 && apiError.message.trim() !== "") {
    return { fieldErrors: {}, message: apiError.message };
  }

  return { fieldErrors: {}, message: getCommonRequestMessage(apiError) ?? PASSWORD_MESSAGES.failed };
}
