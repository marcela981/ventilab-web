/*
* Funcionalidad: Ventilator control keepalive release tests
* Descripción: The page-leave release DELETE /api/ventilator/control is a keepalive `fetch` that carries the
*   Authorization header: with a valid access token it is sent at once without a refresh; with a token about to expire
*   the shared single-flight POST /api/auth/refresh runs first and the DELETE carries the fresh token (AUDIT_SYNC F4).
*   Depends on vitest, msw, the lab test helpers, the api-client token storage and the control service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { saveTokens } from "@shared/api-client/token-storage";
import { apiUrl } from "../../application/pages/lab-test-helpers";
import { releaseControlKeepalive, VENTILATOR_CONTROL_PATH } from "./ventilator-control.service";

const server = setupServer();
let refreshCalls = 0;
let fetchSpy = vi.fn<typeof fetch>();

function jwtExpiringIn(ms: number): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${encode({ alg: "HS256" })}.${encode({ sub: "u1", exp: Math.floor((Date.now() + ms) / 1000) })}.sig`;
}

function authorizationOf(call: Parameters<typeof fetch> | undefined): string | undefined {
  return (call?.[1]?.headers as Record<string, string> | undefined)?.Authorization;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  refreshCalls = 0;
  fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 200 })));
  vi.stubGlobal("fetch", fetchSpy);
  server.use(http.post(apiUrl("/api/auth/refresh"), () => {
    refreshCalls += 1;

    return HttpResponse.json({ success: true, data: { accessToken: "fresh-token", userId: "u1" } });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  server.resetHandlers();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});

describe("releaseControlKeepalive", () => {
  it("sends the keepalive DELETE at once with the valid token and no refresh", () => {
    const token = jwtExpiringIn(10 * 60_000);

    saveTokens(token, "refresh-1");
    releaseControlKeepalive();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(apiUrl(VENTILATOR_CONTROL_PATH));
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ method: "DELETE", keepalive: true, credentials: "include" });
    expect(authorizationOf(fetchSpy.mock.calls[0])).toBe(`Bearer ${token}`);
    expect(refreshCalls).toBe(0);
  });

  it("refreshes a token about to expire through the shared refresh and sends the fresh token", async() => {
    saveTokens(jwtExpiringIn(5_000), "refresh-1");
    releaseControlKeepalive();

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(refreshCalls).toBe(1);
    expect(authorizationOf(fetchSpy.mock.calls[0])).toBe("Bearer fresh-token");
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ method: "DELETE", keepalive: true });
  });
});
