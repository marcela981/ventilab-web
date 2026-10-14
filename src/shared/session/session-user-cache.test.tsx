/*
* Funcionalidad: Session user cache tests
* Descripción: Checks the persisted snapshot of the backend session user that legacy pages read during coexistence: AuthProvider writes it after `GET /api/auth/me`, removes it when the session ends (tokens cleared in this or another tab) and the reader tolerates missing or corrupt storage. Depends on vitest, Testing Library, MSW and the session modules.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTokens, saveTokens } from "@shared/api-client/token-storage";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { AuthProvider } from "./auth-provider";
import { readCachedSessionUser, SESSION_USER_KEY } from "./session-user-cache";

const user = { id: "u1", email: "ana@ventylab.demo", name: "Ana", image: null, role: "TEACHER" as const };

const server = setupServer(
  http.get(`${BACKEND_ORIGIN}/api/auth/me`, () =>
    HttpResponse.json({
      success: true,
      message: null,
      data: { user, permissions: [] },
      code: null,
      timestamp: "2026-10-14T00:00:00.000Z",
      traceId: "trace-ok",
      pagination: null,
    })),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("session user cache", () => {
  it("stores the /me user and removes it when the session ends", async() => {
    saveTokens("access-1", "refresh-1");
    render(<AuthProvider><span>app</span></AuthProvider>);

    await waitFor(() => expect(readCachedSessionUser()).toEqual(user), { timeout: 5000 });

    act(() => {
      clearTokens();
    });

    expect(readCachedSessionUser()).toBeNull();
    expect(window.localStorage.getItem(SESSION_USER_KEY)).toBeNull();
  });

  it("returns null for corrupt or incomplete snapshots", () => {
    window.localStorage.setItem(SESSION_USER_KEY, "{not json");
    expect(readCachedSessionUser()).toBeNull();

    window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify({ id: "u1" }));
    expect(readCachedSessionUser()).toBeNull();
  });
});
