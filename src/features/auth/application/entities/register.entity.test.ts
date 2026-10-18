/*
* Funcionalidad: Register entity tests
* Descripción: Unit tests of validateRegistration: valid data passes (trimmed name and email), each field reports its Spanish message (required name and length, required and malformed email, required and weak password following the backend rule, required and mismatching confirmation). Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { REGISTER_VALIDATION_MESSAGES, validateRegistration } from "./register.entity";
import type { RegistrationData } from "./register.entity";

const valid: RegistrationData = {
  name: "  Ana María Pérez ",
  email: " ana@ventylab.demo ",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
};

describe("validateRegistration", () => {
  it("accepts valid data", () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it("reports every empty field", () => {
    expect(validateRegistration({ name: " ", email: "", password: "", confirmPassword: "" })).toEqual({
      name: REGISTER_VALIDATION_MESSAGES.nameRequired,
      email: REGISTER_VALIDATION_MESSAGES.emailRequired,
      password: REGISTER_VALIDATION_MESSAGES.passwordRequired,
      confirmPassword: REGISTER_VALIDATION_MESSAGES.confirmRequired,
    });
  });

  it.each(["A", "x".repeat(101)])("rejects the name %j by length", (name) => {
    expect(validateRegistration({ ...valid, name }).name).toBe(REGISTER_VALIDATION_MESSAGES.nameLength);
  });

  it("rejects a malformed email", () => {
    expect(validateRegistration({ ...valid, email: "ana@ventylab" }).email).toBe(REGISTER_VALIDATION_MESSAGES.emailInvalid);
  });

  it.each(["Short1A", "nouppercase1", "NOLOWERCASE1", "NoNumbersHere", `Aa1${"x".repeat(126)}`])(
    "rejects the weak password %j",
    (password) => {
      expect(validateRegistration({ ...valid, password, confirmPassword: password }).password).toBe(
        REGISTER_VALIDATION_MESSAGES.passwordWeak,
      );
    },
  );

  it("rejects a confirmation that does not match", () => {
    expect(validateRegistration({ ...valid, confirmPassword: "SecurePass124" }).confirmPassword).toBe(
      REGISTER_VALIDATION_MESSAGES.confirmMismatch,
    );
  });
});
