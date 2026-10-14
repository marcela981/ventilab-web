/*
* Funcionalidad: Profile entity tests
* Descripción: Tests of the profile rules: http(s)-only avatar URLs, client validation of the changed fields (name required and at most 100 characters, avatar URL http/https), initials fallback and role labels. Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { getInitials, isHttpUrl, PROFILE_ERRORS, ROLE_LABELS, validateProfileDraft } from "./profile.entity";
import type { Profile } from "./profile.entity";

const profile: Profile = {
  id: "u1",
  email: "ana@ventylab.demo",
  name: "Ana Torres",
  image: null,
  role: "STUDENT",
  isActive: true,
};

describe("isHttpUrl", () => {
  it.each(["https://cdn.example/a.png", "http://example.com/x.jpg"])("accepts %s", (value) => {
    expect(isHttpUrl(value)).toBe(true);
  });

  it.each(["javascript:alert(1)", "ftp://example.com/a.png", "data:image/png;base64,AAAA", "/relative.png", "not a url"])(
    "rejects %s",
    (value) => {
      expect(isHttpUrl(value)).toBe(false);
    },
  );
});

describe("validateProfileDraft", () => {
  it("accepts an unchanged draft", () => {
    expect(validateProfileDraft({ name: "Ana Torres", image: "" }, profile)).toEqual({});
  });

  it("requires a name when it changed to blank", () => {
    expect(validateProfileDraft({ name: "   ", image: "" }, profile)).toEqual({ name: PROFILE_ERRORS.nameRequired });
  });

  it("does not require a name the account never had when only the avatar changes", () => {
    expect(validateProfileDraft({ name: "", image: "https://cdn.example/a.png" }, { ...profile, name: null })).toEqual({});
  });

  it("limits the name to 100 characters", () => {
    expect(validateProfileDraft({ name: "a".repeat(101), image: "" }, profile)).toEqual({ name: PROFILE_ERRORS.nameTooLong });
    expect(validateProfileDraft({ name: "a".repeat(100), image: "" }, profile)).toEqual({});
  });

  it("blocks avatar URLs that are not http or https", () => {
    expect(validateProfileDraft({ name: "Ana Torres", image: "javascript:alert(1)" }, profile)).toEqual({
      image: PROFILE_ERRORS.imageInvalid,
    });
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
