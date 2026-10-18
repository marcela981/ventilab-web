/*
* Funcionalidad: Register entities
* Descripción: Registration form entities: the data the user types (name, email, password and its confirmation), the per-field validation errors and the pure validation used before calling `POST /api/auth/register`. The rules mirror the backend RegisterDTO: name 2–100 characters, a valid email, a password of 8–128 characters with at least one uppercase letter, one lowercase letter and one number; the confirmation must match. Spanish copy, TODO(i18n). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type RegistrationData = {
  name: string
  email: string
  password: string
  confirmPassword: string
};

export type RegisterFieldErrors = Partial<Record<keyof RegistrationData, string>>;

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Same shape check the browser applies to type="email"; the backend validates the rest.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same rule as the backend RegisterDTO (PASSWORD_STRENGTH_REGEX).
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

// TODO(i18n): move to an auth namespace in src/i18n.
export const REGISTER_VALIDATION_MESSAGES = {
  nameRequired: "Ingresa tu nombre completo.",
  nameLength: `El nombre debe tener entre ${NAME_MIN_LENGTH} y ${NAME_MAX_LENGTH} caracteres.`,
  emailRequired: "Ingresa tu correo electrónico.",
  emailInvalid: "Ingresa un correo electrónico válido.",
  passwordRequired: "Ingresa una contraseña.",
  passwordWeak: `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres, con al menos una mayúscula, una minúscula y un número.`,
  confirmRequired: "Confirma tu contraseña.",
  confirmMismatch: "Las contraseñas no coinciden.",
} as const;

export const PASSWORD_HINT = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con mayúscula, minúscula y número.`;

export function validateRegistration(data: RegistrationData): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const name = data.name.trim();
  const email = data.email.trim();

  if (name === "") {
    errors.name = REGISTER_VALIDATION_MESSAGES.nameRequired;
  } else if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    errors.name = REGISTER_VALIDATION_MESSAGES.nameLength;
  }

  if (email === "") {
    errors.email = REGISTER_VALIDATION_MESSAGES.emailRequired;
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = REGISTER_VALIDATION_MESSAGES.emailInvalid;
  }

  if (data.password === "") {
    errors.password = REGISTER_VALIDATION_MESSAGES.passwordRequired;
  } else if (!PASSWORD_PATTERN.test(data.password)) {
    errors.password = REGISTER_VALIDATION_MESSAGES.passwordWeak;
  }

  if (data.confirmPassword === "") {
    errors.confirmPassword = REGISTER_VALIDATION_MESSAGES.confirmRequired;
  } else if (data.confirmPassword !== data.password) {
    errors.confirmPassword = REGISTER_VALIDATION_MESSAGES.confirmMismatch;
  }

  return errors;
}
