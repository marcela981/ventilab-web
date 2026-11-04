/*
* Funcionalidad: Password entity tests
* Descripción: Tests of the change-password rules: the requirement checklist of the backend policy (8–128 characters, lowercase, uppercase, number), the per-field validation with julio's messages and the mapping of the backend failures (wrong current password, same password, Google account, DTO validation, 429, unknown). Depends on vitest and @shared/api-client api-error.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { getChangePasswordError, getPasswordRequirements, PASSWORD_MESSAGES, validatePasswordDraft } from "./password.entity";

const valid = { currentPassword: "OldPassword1", newPassword: "NewPassword2", confirmPassword: "NewPassword2" };

describe("getPasswordRequirements", () => {
  it("marks every rule as met for a compliant password", () => {
    expect(getPasswordRequirements("Abcdefg1").every((requirement) => requirement.met)).toBe(true);
  });

  it("reports each unmet rule", () => {
    const met = Object.fromEntries(getPasswordRequirements("abc").map((requirement) => [requirement.key, requirement.met]));

    expect(met).toEqual({ length: false, lowercase: true, uppercase: false, number: false });
  });

  it("fails the length rule over 128 characters", () => {
    expect(getPasswordRequirements(`Aa1${"x".repeat(126)}`)[0]?.met).toBe(false);
  });
});

describe("validatePasswordDraft", () => {
  it("accepts a valid draft", () => {
    expect(validatePasswordDraft(valid)).toEqual({});
  });

  it("requires every field", () => {
    expect(validatePasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" })).toEqual({
      currentPassword: "La contraseña actual es requerida",
      newPassword: "La nueva contraseña es requerida",
      confirmPassword: "Debes confirmar la nueva contraseña",
    });
  });

  it.each([
    ["Abc1", "La contraseña debe tener al menos 8 caracteres"],
    [`Aa1${"x".repeat(126)}`, "La contraseña puede tener como máximo 128 caracteres"],
    ["ABCDEFG1", "Debe contener al menos una letra minúscula"],
    ["abcdefg1", "Debe contener al menos una letra mayúscula"],
    ["Abcdefgh", "Debe contener al menos un número"],
    ["OldPassword1", "La nueva contraseña debe ser diferente a la actual"],
  ])("rejects the new password %s", (newPassword, expected) => {
    expect(validatePasswordDraft({ ...valid, newPassword, confirmPassword: newPassword }).newPassword).toBe(expected);
  });

  it("requires the confirmation to match", () => {
    expect(validatePasswordDraft({ ...valid, confirmPassword: "NewPassword3" })).toEqual({
      confirmPassword: "Las contraseñas no coinciden",
    });
  });
});

describe("getChangePasswordError", () => {
  const backendError = (code: string, status = 400, message = "x", retryAfter?: number) =>
    new ApiError({ code, message, status, ...(retryAfter === undefined ? {} : { retryAfter }) });

  it("puts a wrong current password on its field", () => {
    expect(getChangePasswordError(backendError("users.invalid_current_password"))).toEqual({
      fieldErrors: { currentPassword: PASSWORD_MESSAGES.wrongCurrent },
      message: null,
    });
  });

  it("puts a repeated password on the new password", () => {
    expect(getChangePasswordError(backendError("users.same_password")).fieldErrors).toEqual({
      newPassword: PASSWORD_MESSAGES.sameAsCurrent,
    });
  });

  it("explains a Google account", () => {
    expect(getChangePasswordError(backendError("users.password_not_set")).message).toBe(
      "Tu cuenta usa Google; la contraseña se gestiona en Google.",
    );
  });

  it("shows the backend validation message of other 400s", () => {
    expect(getChangePasswordError(backendError("validation_error", 400, "La nueva contraseña debe tener entre 8 y 128 caracteres")).message)
      .toBe("La nueva contraseña debe tener entre 8 y 128 caracteres");
  });

  it("shows the wait of a 429", () => {
    expect(getChangePasswordError(backendError("common.too_many_requests", 429, "x", 60)).message).toBe(
      "Demasiados intentos. Inténtalo de nuevo en 1 minuto.",
    );
  });

  it("falls back to julio's generic message", () => {
    expect(getChangePasswordError(backendError("x", 409)).message).toBe("Error al cambiar la contraseña");
  });
});
