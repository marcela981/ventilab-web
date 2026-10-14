/*
* Funcionalidad: Post-login redirect loop guard tests
* Descripción: Tests of the bounce detection used by usePostLoginRedirect: a target opened again within the bounce window falls back to the role home, a role home that bounced too stops the redirects (null), old records expire, and the history survives in sessionStorage and can be cleared. Depends on vitest and jsdom.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, describe, expect, it } from "vitest";
import {
  choosePostLoginTarget,
  clearRedirectHistory,
  readRedirectHistory,
  recordRedirect,
  REDIRECT_BOUNCE_WINDOW_MS,
} from "./redirect-loop-guard";

const NOW = 1_000_000;

afterEach(() => {
  window.sessionStorage.clear();
});

describe("choosePostLoginTarget", () => {
  it("keeps the target when it was not opened recently", () => {
    expect(choosePostLoginTarget("/teaching", "/dashboard", [])).toBe("/teaching");
  });

  it("falls back to the role home when the target just bounced back to the login page", () => {
    expect(choosePostLoginTarget("/panel/students", "/panel", [{ target: "/panel/students", at: NOW }])).toBe("/panel");
  });

  it("stops redirecting when the role home bounced too", () => {
    const history = [{ target: "/panel/students", at: NOW }, { target: "/panel", at: NOW }];

    expect(choosePostLoginTarget("/panel/students", "/panel", history)).toBeNull();
    expect(choosePostLoginTarget("/panel", "/panel", [{ target: "/panel", at: NOW }])).toBeNull();
  });
});

describe("redirect history", () => {
  it("records redirects in sessionStorage and drops the expired ones", () => {
    recordRedirect("/panel", NOW);
    recordRedirect("/dashboard", NOW + 1);

    expect(readRedirectHistory(NOW + 2)).toEqual([{ target: "/panel", at: NOW }, { target: "/dashboard", at: NOW + 1 }]);
    expect(readRedirectHistory(NOW + 2 + REDIRECT_BOUNCE_WINDOW_MS)).toEqual([]);
  });

  it("can be cleared", () => {
    recordRedirect("/panel", NOW);
    clearRedirectHistory();

    expect(readRedirectHistory(NOW)).toEqual([]);
  });

  it("ignores malformed stored data", () => {
    window.sessionStorage.setItem("ventilab_post_login_redirects", "{not json");

    expect(readRedirectHistory(NOW)).toEqual([]);
  });
});
