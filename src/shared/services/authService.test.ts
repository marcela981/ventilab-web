/*
* Funcionalidad: Legacy authService coexistence tests
* Descripción: Checks the legacy authService adapter during coexistence with the new backend session: getUserData returns the backend session user snapshot (so legacy pages recognise a user who signed in through the new login) and otherwise the legacy cached user, and the broken refreshToken() was removed. Depends on vitest and the session user cache.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, describe, expect, it } from "vitest";
import { SESSION_USER_KEY } from "@shared/session/session-user-cache";
import * as authService from "./authService";

const sessionUser = { id: "u1", email: "ana@ventylab.demo", name: "Ana", image: null, role: "STUDENT" };

afterEach(() => {
  window.localStorage.clear();
});

describe("legacy authService coexistence", () => {
  it("returns the backend session user snapshot first", () => {
    window.localStorage.setItem("ventilab_user_data", JSON.stringify({ id: "legacy", role: "teacher" }));
    window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(sessionUser));

    expect(authService.getUserData()).toEqual(sessionUser);
  });

  it("falls back to the legacy cached user", () => {
    window.localStorage.setItem("ventilab_user_data", JSON.stringify({ id: "legacy", role: "teacher" }));

    expect(authService.getUserData()).toEqual({ id: "legacy", role: "teacher" });
  });

  it("no longer exposes the broken refreshToken()", () => {
    expect("refreshToken" in authService).toBe(false);
    expect("refreshToken" in authService.default).toBe(false);
  });
});
