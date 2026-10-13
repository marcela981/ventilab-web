/*
* Funcionalidad: HTTP client behavior tests
* Descripción: msw-backed tests of the typed client: single-flight refresh for concurrent 401s, failed refresh (tokens cleared, one session-expired, pending requests rejected), no refresh/logout on 403, fast/slow timeout selection, Retry-After normalization and the non-doubled `/api` base URL. Depends on vitest, msw and the api-client modules.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { ApiError, isApiError } from "./api-error";
import { apiGet, apiPatch } from "./api-request";
import { onAuthEvent } from "./auth-events";
import type { AuthEvent } from "./auth-events";
import { httpClient } from "./http-client";
import { TIMEOUTS } from "./timeouts";
import { getAccessToken, getRefreshToken, saveTokens } from "./token-storage";

const url = (path: string): string => `${BACKEND_ORIGIN}${path}`;

const envelope = (data: unknown, extra: Record<string, unknown> = {}) => ({
  success: true,
  message: null,
  data,
  code: null,
  timestamp: "2026-10-13T00:00:00.000Z",
  traceId: "trace-ok",
  pagination: null,
  ...extra,
});

const errorEnvelope = (code: string, message: string | string[], data: unknown = null) => ({
  success: false,
  message,
  data,
  code,
  timestamp: "2026-10-13T00:00:00.000Z",
  traceId: "trace-error",
  pagination: null,
});

const server = setupServer();
let refreshCalls = 0;
let events: AuthEvent[] = [];
let unsubscribe: () => void = () => undefined;

function protectedGroupsHandler() {
  return http.get(url("/api/groups"), ({ request }) => {
    if (request.headers.get("authorization") === "Bearer fresh-token") {
      return HttpResponse.json(envelope([{ id: "g1" }]));
    }

    return HttpResponse.json(errorEnvelope("auth.token_expired", "Token expired"), { status: 401 });
  });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  refreshCalls = 0;
  events = [];
  unsubscribe = onAuthEvent((event) => events.push(event));
  saveTokens("stale-token", "refresh-1");
});

afterEach(() => {
  unsubscribe();
  server.resetHandlers();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});

describe("401 handling", () => {
  it("runs exactly one refresh for 5 concurrent 401s and retries every request", async() => {
    server.use(
      protectedGroupsHandler(),
      http.post(url("/api/auth/refresh"), async({ request }) => {
        refreshCalls += 1;
        expect(await request.json()).toEqual({ refreshToken: "refresh-1" });
        await delay(30);

        return HttpResponse.json(envelope({ accessToken: "fresh-token", userId: "u1" }));
      }),
    );

    const results = await Promise.all(Array.from({ length: 5 }, () => apiGet("/api/groups")));

    expect(refreshCalls).toBe(1);
    expect(results.every((result) => Array.isArray(result.data))).toBe(true);
    expect(getAccessToken()).toBe("fresh-token");
    expect(getRefreshToken()).toBe("refresh-1");
    expect(events).toEqual([{ type: "token-refreshed" }]);
  });

  it("clears tokens, emits session-expired once and rejects all pending requests when refresh fails", async() => {
    server.use(
      protectedGroupsHandler(),
      http.post(url("/api/auth/refresh"), async() => {
        refreshCalls += 1;
        await delay(30);

        return HttpResponse.json(errorEnvelope("auth.refresh_token_expired", "Refresh token expired"), { status: 401 });
      }),
    );

    const outcomes = await Promise.allSettled(Array.from({ length: 5 }, () => apiGet("/api/groups")));

    expect(refreshCalls).toBe(1);
    expect(outcomes.every((outcome) => outcome.status === "rejected")).toBe(true);
    outcomes.forEach((outcome) => {
      if (outcome.status === "rejected") {
        expect(isApiError(outcome.reason)).toBe(true);
        expect((outcome.reason as ApiError).status).toBe(401);
      }
    });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(events).toEqual([{ type: "session-expired", reason: "auth.refresh_token_expired" }]);
  });

  it("never refreshes for auth endpoints", async() => {
    server.use(
      http.post(url("/api/auth/login"), () =>
        HttpResponse.json(errorEnvelope("auth.invalid_credentials", "Invalid credentials"), { status: 401 })),
      http.post(url("/api/auth/refresh"), () => {
        refreshCalls += 1;

        return HttpResponse.json(envelope({ accessToken: "x", userId: "u1" }));
      }),
    );

    await expect(httpClient.post("/api/auth/login", { email: "a@b.co", password: "x" })).rejects.toMatchObject({
      code: "auth.invalid_credentials",
      status: 401,
    });
    expect(refreshCalls).toBe(0);
  });

  it("retries a request at most once when the retried request is still unauthorized", async() => {
    let groupCalls = 0;

    server.use(
      http.get(url("/api/groups"), () => {
        groupCalls += 1;

        return HttpResponse.json(errorEnvelope("auth.token_expired", "Token expired"), { status: 401 });
      }),
      http.post(url("/api/auth/refresh"), () => {
        refreshCalls += 1;

        return HttpResponse.json(envelope({ accessToken: "fresh-token", userId: "u1" }));
      }),
    );

    await expect(apiGet("/api/groups")).rejects.toMatchObject({ status: 401 });
    expect(groupCalls).toBe(2);
    expect(refreshCalls).toBe(1);
  });
});

describe("403 handling", () => {
  it("rejects with an ApiError without refreshing or expiring the session", async() => {
    server.use(
      http.patch(url("/api/groups/:id"), () =>
        HttpResponse.json(errorEnvelope("groups.management_forbidden", "Forbidden"), { status: 403 })),
      http.post(url("/api/auth/refresh"), () => {
        refreshCalls += 1;

        return HttpResponse.json(envelope({ accessToken: "x", userId: "u1" }));
      }),
    );

    const error = await apiPatch("/api/groups/{id}", { params: { id: "g1" }, body: { name: "New" } }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "groups.management_forbidden", status: 403, traceId: "trace-error" });
    expect(refreshCalls).toBe(0);
    expect(events).toEqual([]);
    expect(getAccessToken()).toBe("stale-token");
  });
});

describe("timeouts", () => {
  beforeEach(() => {
    server.use(
      http.get(url("/api/auth/me"), () => HttpResponse.json(envelope({ id: "u1" }))),
      http.get(url("/health"), () => HttpResponse.json({ status: "ok" })),
      http.get(url("/api/groups"), () => HttpResponse.json(envelope([]))),
    );
  });

  it("uses the slow timeout for registered cold-start routes", async() => {
    const me = await httpClient.get("/api/auth/me");
    const health = await httpClient.get("/health?probe=1");

    expect(me.config.timeout).toBe(TIMEOUTS.slow);
    expect(health.config.timeout).toBe(TIMEOUTS.slow);
  });

  it("uses the fast timeout for other routes", async() => {
    const groups = await httpClient.get("/api/groups");

    expect(groups.config.timeout).toBe(TIMEOUTS.fast);
  });

  it("lets a per-call category override the registry", async() => {
    let seenTimeout: number | undefined;
    const interceptor = httpClient.interceptors.response.use((response) => {
      seenTimeout = response.config.timeout;

      return response;
    });

    try {
      await apiGet("/api/auth/me", { timeout: "fast" });
      expect(seenTimeout).toBe(TIMEOUTS.fast);

      await apiGet("/api/groups", { timeout: "slow" });
      expect(seenTimeout).toBe(TIMEOUTS.slow);
    } finally {
      httpClient.interceptors.response.eject(interceptor);
    }
  });
});

describe("error normalization", () => {
  it("maps a 429 envelope to ApiError with retryAfter from the Retry-After header", async() => {
    server.use(
      http.get(url("/api/groups"), () =>
        HttpResponse.json(errorEnvelope("common.too_many_requests", ["Too many", "requests"], { limit: 20 }), {
          status: 429,
          headers: { "Retry-After": "30" },
        })),
    );

    await expect(apiGet("/api/groups")).rejects.toMatchObject({
      code: "common.too_many_requests",
      message: "Too many requests",
      status: 429,
      retryAfter: 30,
      details: { limit: 20 },
      traceId: "trace-error",
    });
  });

  it("maps a network failure to network.unavailable", async() => {
    server.use(http.get(url("/api/groups"), () => HttpResponse.error()));

    await expect(apiGet("/api/groups")).rejects.toMatchObject({ code: "network.unavailable", status: 0 });
  });
});

describe("base URL", () => {
  it("resolves spec paths against the origin without doubling /api", async() => {
    server.use(http.get(url("/api/auth/me"), () => HttpResponse.json(envelope({ id: "u1" }), { status: 200 })));

    expect(httpClient.getUri({ url: "/api/auth/me" })).toBe(`${BACKEND_ORIGIN}/api/auth/me`);
    await expect(apiGet("/api/auth/me")).resolves.toMatchObject({ data: { id: "u1" }, traceId: "trace-ok" });
  });

  it("returns raw (non-envelope) bodies as data", async() => {
    server.use(http.get(url("/health"), () => HttpResponse.json({ status: "ok" })));

    await expect(apiGet("/health")).resolves.toMatchObject({ data: { status: "ok" }, pagination: null });
  });
});
