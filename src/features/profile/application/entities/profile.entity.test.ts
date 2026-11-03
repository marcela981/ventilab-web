/*
* Funcionalidad: Profile entity tests
* Descripción: Tests of the profile rules: client validation of the changed name (required and at most 100 characters), initials fallback and role labels. Depends on vitest. v1.1 (Bloque 4, W7): avatar URL rules removed.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { getInitials, PROFILE_ERRORS, ROLE_LABELS, validateProfileDraft } from "./profile.entity";
import type { Profile } from "./profile.entity";

const profile: Profile = {
  id: "u1",
  email: "ana@ventylab.demo",
  name: "Ana Torres",
  image: null,
  role: "STUDENT",
  isActive: true,
  hasPassword: true,
};

describe("validateProfileDraft", () => {
  it("accepts an unchanged draft", () => {
    expect(validateProfileDraft({ name: " Ana Torres " }, profile)).toEqual({});
  });

  it("requires a name when it changed to blank", () => {
    expect(validateProfileDraft({ name: "   " }, profile)).toEqual({ name: PROFILE_ERRORS.nameRequired });
  });

  it("does not flag a name the account never had while it stays empty", () => {
    expect(validateProfileDraft({ name: "" }, { ...profile, name: null })).toEqual({});
  });

  it("limits the name to 100 characters", () => {
    expect(validateProfileDraft({ name: "a".repeat(101) }, profile)).toEqual({ name: PROFILE_ERRORS.nameTooLong });
    expect(validateProfileDraft({ name: "a".repeat(100) }, profile)).toEqual({});
  });
});

describe("getInitials", () => {
  it("uses the first letters of the first two names", () => {
    expect(getInitials("ana maría torres", "ana@ventylab.demo")).toBe("AM");
  });

  it("falls back to the email", () => {
    expect(getInitials(null, "luis@ventylab.demo")).toBe("L");
    expect(getInitials("  ", "")).toBe("?");
  });
});

describe("ROLE_LABELS", () => {
  it("has a Spanish label per role", () => {
    expect(ROLE_LABELS).toEqual({ STUDENT: "Estudiante", TEACHER: "Docente", ADMIN: "Administrador" });
  });
});
