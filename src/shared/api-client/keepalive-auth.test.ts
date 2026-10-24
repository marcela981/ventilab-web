/*
* Funcionalidad: Keepalive request authentication tests
* Descripción: msw-backed tests of the keepalive auth: the JWT expiry is read from `exp`; a valid token is sent at once
*   with the Authorization header and no refresh; a token about to expire is refreshed through the shared single-flight
*   POST /api/auth/refresh (one call for concurrent sends) before the send, which carries the fresh token; a failed
*   refresh still sends with the old token; nothing is refreshed without a refresh token; `keepAccessTokenFresh()`
*   refreshes a token that enters the refresh lead and stops after its release. Depends on vitest, msw and the
*   api-client modules.
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
import { BACKEND_ORIGIN } from "@shared/lib/env";
import {
  isTokenNearExpiry,
  keepAccessTokenFresh,
  KEEPALIVE_TOKEN_SKEW_MS,
  readTokenExpiryMs,
  sendWithFreshToken,
} from "./keepalive-auth";
import type { RequestHeaders } from "./keepalive-auth";
import { REFRESH_PATH } from "./token-refresh";
import { getAccessToken, saveTokens } from "./token-storage";

const server = setupServer();
let refreshCalls = 0;

/** Unsigned JWT whose `exp` is `expiresInMs` from now (signature is irrelevant to the client). */
function makeJwt(expiresInMs: number, lifetimeMs = 15 * 60_000): string {
  const now = Date.now();
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payload = { sub: "u1", iat: Math.floor((now + expiresInMs - lifetimeMs) / 1000), exp: Math.floor((now + expiresInMs) / 1000) };

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

function serveRefresh(result: "ok" | "fail" = "ok") {
  server.use(http.post(`${BACKEND_ORIGIN}${REFRESH_PATH}`, () => {
    refreshCalls += 1;

    return result === "ok"
      ? HttpResponse.json({ success: true, data: { accessToken: "fresh-token", userId: "u1" } })
      : HttpResponse.json({ success: false, code: "internal_server_error", message: "boom", data: null }, { status: 500 });
  }));
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  refreshCalls = 0;
});

afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});

describe("token expiry", () => {
  it("reads the exp claim and flags a token inside the skew", () => {
    const soon = makeJwt(KEEPALIVE_TOKEN_SKEW_MS - 5_000);
    const later = makeJwt(10 * 60_000);

    expect(readTokenExpiryMs(later)).toBeGreaterThan(Date.now());
    expect(isTokenNearExpiry(soon)).toBe(true);
    expect(isTokenNearExpiry(later)).toBe(false);
    expect(readTokenExpiryMs("not-a-jwt")).toBeNull();
    expect(isTokenNearExpiry("not-a-jwt")).toBe(false);
  });
});

describe("sendWithFreshToken", () => {
  it("sends a valid token at once with the Authorization header and no refresh", () => {
    const token = makeJwt(10 * 60_000);
    const send = vi.fn<(headers: RequestHeaders) => void>();

    saveTokens(token, "refresh-1");
    serveRefresh();
    sendWithFreshToken({ Accept: "application/json" }, send);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ Accept: "application/json", Authorization: `Bearer ${token}` });
    expect(refreshCalls).toBe(0);
  });

  it("refreshes a token about to expire through the shared single-flight refresh before sending", async() => {
    const send = vi.fn<(headers: RequestHeaders) => void>();

    saveTokens(makeJwt(10_000), "refresh-1");
    serveRefresh();
    sendWithFreshToken({ Accept: "application/json" }, send);
    sendWithFreshToken({ Accept: "application/json" }, send);

    expect(send).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(refreshCalls).toBe(1);
    expect(send).toHaveBeenNthCalledWith(1, { Accept: "application/json", Authorization: "Bearer fresh-token" });
    expect(getAccessToken()).toBe("fresh-token");
  });

  it("still sends with the old token when the refresh fails", async() => {
    const token = makeJwt(10_000);
    const send = vi.fn<(headers: RequestHeaders) => void>();

    saveTokens(token, "refresh-1");
    serveRefresh("fail");
    sendWithFreshToken({}, send);

    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith({ Authorization: `Bearer ${token}` });
  });

  it("does not refresh without a refresh token (the shared refresh would end the session)", () => {
    const token = makeJwt(10_000);
    const send = vi.fn<(headers: RequestHeaders) => void>();

    saveTokens(token, null);
    serveRefresh();
    sendWithFreshToken({}, send);

    expect(send).toHaveBeenCalledWith({ Authorization: `Bearer ${token}` });
    expect(refreshCalls).toBe(0);
    expect(getAccessToken()).toBe(token);
  });
});

describe("keepAccessTokenFresh", () => {
  it("refreshes a token inside the refresh lead while retained", async() => {
    saveTokens(makeJwt(60_000), "refresh-1");
    serveRefresh();

    const release = keepAccessTokenFresh();

    await vi.waitFor(() => expect(getAccessToken()).toBe("fresh-token"));
    expect(refreshCalls).toBe(1);
    release();
  });

  it("schedules nothing once released", async() => {
    saveTokens(makeJwt(10 * 60_000), "refresh-1");
    serveRefresh();

    const release = keepAccessTokenFresh();

    release();
    saveTokens(makeJwt(60_000), "refresh-1");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(refreshCalls).toBe(0);
  });
});
