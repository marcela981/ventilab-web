/*
* Funcionalidad: Admin console config
* Descripción: Constants of the admin console: page size of the users list, the roles and their Spanish labels, the platform setting categories in tab order with their labels, and the Spanish labels of the known setting fields (the API sends no labels; an unknown field shows its key). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const USERS_PAGE_SIZE = 20;

export const USER_ROLES = ["STUDENT", "TEACHER", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  STUDENT: "Estudiante",
  TEACHER: "Docente",
  ADMIN: "Administrador",
};

export const SETTING_CATEGORIES = ["ai", "evaluation", "simulation", "reservations", "telemetry", "commands"] as const;

export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

export const DEFAULT_SETTING_CATEGORY: SettingCategory = "ai";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const CATEGORY_LABELS: Readonly<Record<SettingCategory, string>> = {
  ai: "Inteligencia artificial",
  evaluation: "Evaluaciones",
  simulation: "Simulación",
  reservations: "Reservas",
  telemetry: "Telemetría",
  commands: "Comandos del ventilador",
};

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const SETTING_FIELD_LABELS: Readonly<Record<string, string>> = {
  providerChain: "Cadena de proveedores",
  models: "Modelos",
  timeoutMs: "Tiempo límite (ms)",
  maxOutputTokens: "Tokens de salida máximos",
  temperature: "Temperatura",
  requestsPerDay: "Solicitudes por día",
  tokensPerDay: "Tokens por día",
  inputPer1kUsd: "Entrada por 1k tokens (USD)",
  outputPer1kUsd: "Salida por 1k tokens (USD)",
  targetsReached: "Objetivos alcanzados (fracción)",
  timeToStabilizeSeconds: "Tiempo para estabilizar (s)",
  timeInRangePercent: "Tiempo en rango (%)",
  safetyToleranceSeconds: "Tolerancia de seguridad (s)",
  STUDENT: ROLE_LABELS.STUDENT,
  TEACHER: ROLE_LABELS.TEACHER,
  ADMIN: ROLE_LABELS.ADMIN,
  "*": "Cualquier caso de uso",
};

export function isSettingCategory(value: unknown): value is SettingCategory {
  return typeof value === "string" && (SETTING_CATEGORIES as readonly string[]).includes(value);
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}
