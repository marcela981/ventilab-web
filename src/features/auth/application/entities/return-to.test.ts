/*
* Funcionalidad: Login returnTo resolution tests
* Descripción: Checks that the login page reads the return route from `returnTo` (new guards) or the legacy `returnUrl`/`callbackUrl` parameters and only accepts same-origin relative paths (no open redirect, no /auth/* loop). Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { resolveReturnTo } from "./return-to";

describe("resolveReturnTo", () => {
  it("accepts a same-origin relative path from returnTo", () => {
    expect(resolveReturnTo({ returnTo: "/teaching/m1/l2?tab=quiz" })).toBe("/teaching/m1/l2?tab=quiz");
  });

  it("reads the legacy returnUrl and callbackUrl parameters", () => {
    expect(resolveReturnTo({ returnUrl: "/panel/students" })).toBe("/panel/students");
    expect(resolveReturnTo({ callbackUrl: "/simulador" })).toBe("/simulador");
  });

  it("prefers returnTo and uses the first value of a repeated parameter", () => {
    expect(resolveReturnTo({ returnTo: ["/profile", "/panel"], returnUrl: "/dashboard" })).toBe("/profile");
  });

  it.each([
    "https://evil.example/phish",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/%5cevil.example",
    "/auth/login",
    "/auth/register",
    "dashboard",
    "",
  ])("rejects %j", (value) => {
    expect(resolveReturnTo({ returnTo: value })).toBeNull();
  });

  it("returns null when no parameter is present", () => {
    expect(resolveReturnTo({})).toBeNull();
  });
});
