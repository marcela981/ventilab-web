/*
* Funcionalidad: Audit labels tests
* Descripción: Known audit actions, target types (any casing, with underscores or in plural) and actor roles map to their Spanish labels; unknown codes are returned unchanged. Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { auditActionLabel, auditRoleLabel, auditTargetTypeLabel } from "./audit-labels";

describe("auditActionLabel", () => {
  it.each([
    ["user_role_changed", "Rol de usuario cambiado"],
    ["reservation.preempted", "Reserva desplazada"],
    ["SETTINGS_CHANGED", "Configuración cambiada"],
  ])("labels %s", (action, label) => {
    expect(auditActionLabel(action)).toBe(label);
  });

  it("returns an unknown action unchanged", () => {
    expect(auditActionLabel("brand_new_action")).toBe("brand_new_action");
  });
});

describe("auditTargetTypeLabel", () => {
  it.each([
    ["user", "Usuario"],
    ["users", "Usuario"],
    ["evaluation_attempts", "Intento de evaluación"],
    ["EvaluationAssignment", "Activación de evaluación"],
    ["ClinicalCase", "Caso clínico"],
    ["activities", "Actividad"],
    ["platform_settings", "Configuración de la plataforma"],
    ["media", "Archivo"],
  ])("labels %s", (type, label) => {
    expect(auditTargetTypeLabel(type)).toBe(label);
  });

  it("returns an unknown target type unchanged", () => {
    expect(auditTargetTypeLabel("Spaceship")).toBe("Spaceship");
  });
});

describe("auditRoleLabel", () => {
  it("labels the known roles and keeps an unknown one", () => {
    expect(auditRoleLabel("TEACHER")).toBe("Docente");
    expect(auditRoleLabel("SUPERUSER")).toBe("SUPERUSER");
  });
});
