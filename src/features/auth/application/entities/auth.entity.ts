/*
* Funcionalidad: Auth entities
* Descripción: Login form entities: the credentials the user types, the per-field validation errors and the pure validation used before calling the backend. Spanish copy, TODO(i18n). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type LoginCredentials = {
  email: string
  password: string
};

export type LoginFieldErrors = Partial<Record<keyof LoginCredentials, string>>;

// Same shape check the browser applies to type="email"; the backend validates the rest.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// TODO(i18n): move to an auth namespace in src/i18n.
export const LOGIN_VALIDATION_MESSAGES = {
  emailRequired: "Ingresa tu correo electrónico.",
  emailInvalid: "Ingresa un correo electrónico válido.",
  passwordRequired: "Ingresa tu contraseña.",
} as const;

export function validateCredentials(credentials: LoginCredentials): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const email = credentials.email.trim();

  if (email === "") {
    errors.email = LOGIN_VALIDATION_MESSAGES.emailRequired;
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = LOGIN_VALIDATION_MESSAGES.emailInvalid;
  }

  if (credentials.password === "") {
    errors.password = LOGIN_VALIDATION_MESSAGES.passwordRequired;
  }

  return errors;
}
