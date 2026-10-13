/*
* Funcionalidad: AuthProvider behavior tests
* Descripción: msw-backed tests of the session layer: boot with and without a stored token, establishSession, best-effort signOut (tokens and session SWR entries cleared even when logout fails), idempotent session-expired handling, cross-tab token removal, /me failures and handleRoleChanged (refresh + reload only for the current user). Depends on vitest, Testing Library, msw, swr and the api-client modules.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useEffect, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import useSWR, { SWRConfig, unstable_serialize } from "swr";
import type { Cache } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { emitAuthEvent } from "@shared/api-client/auth-events";
import {
  ACCESS_TOKEN_KEY,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "@shared/api-client/token-storage";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { AuthProvider } from "./auth-provider";
import type { Role } from "./session.entity";
import type { SessionContextValue } from "./session-context";
import { useSession } from "./use-session";

const url = (path: string): string => `${BACKEND_ORIGIN}${path}`;

const envelope = (data: unknown) => ({
  success: true,
  message: null,
  data,
  code: null,
  timestamp: "2026-10-13T00:00:00.000Z",
  traceId: "trace-ok",
  pagination: null,
});

const errorResponse = (code: string, status: number) =>
  HttpResponse.json(
    {
      success: false,
      message: code,
      data: null,
      code,
      timestamp: "2026-10-13T00:00:00.000Z",
      traceId: "trace-error",
      pagination: null,
    },
    { status },
  );

const GROUPS_KEY = ["/api/groups", { params: undefined, query: undefined }] as const;

const server = setupServer();
let meCalls = 0;
let refreshCalls = 0;
let logoutAuthorization: string | null = null;
let currentRole: Role = "STUDENT";
let session: SessionContextValue | null = null;
let statuses: string[] = [];

function meHandler() {
  return http.get(url("/api/auth/me"), () => {
    meCalls += 1;

    return HttpResponse.json(
      envelope({
        user: { id: "u1", email: "ana@ventylab.demo", name: "Ana", image: null, role: currentRole },
        permissions: currentRole === "TEACHER" ? ["groups:manage"] : ["levels:read"],
      }),
    );
  });
}

function refreshHandler() {
  return http.post(url("/api/auth/refresh"), () => {
    refreshCalls += 1;

    return HttpResponse.json(envelope({ accessToken: `access-${refreshCalls + 1}`, userId: "u1" }));
  });
}

function Probe() {
  const value = useSession();

  // Layout effect: published in the same commit as the DOM, so it never lags behind waitFor on the text.
  useLayoutEffect(() => {
    session = value;
  });

  useEffect(() => {
    statuses.push(value.status);
  }, [value.status]);

  return <output data-testid="status">{`${value.status}:${value.role ?? "none"}`}</output>;
}

// Mirrors a mounted useApiQuery: SWR only records the original key (used by key filters) for hook-owned entries.
function SeedGroups() {
  useSWR(GROUPS_KEY, () => ({ data: ["g1"] }));

  return null;
}

function renderSession(cache: Cache = new Map(), extra?: ReactNode) {
  return render(
    <SWRConfig value={{ provider: () => cache }}>
      <AuthProvider>
        <Probe />
        {extra}
      </AuthProvider>
    </SWRConfig>,
  );
}

const statusText = () => screen.getByTestId("status").textContent;

async function renderAuthenticated(cache?: Cache, extra?: ReactNode) {
  saveTokens("access-1", "refresh-1");
  renderSession(cache, extra);
  await waitFor(() => expect(statusText()).toBe("authenticated:STUDENT"));
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  meCalls = 0;
  refreshCalls = 0;
  logoutAuthorization = null;
  currentRole = "STUDENT";
  session = null;
  statuses = [];
  server.use(meHandler(), refreshHandler());
});

afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});

describe("AuthProvider boot", () => {
  it("is unauthenticated without a token and sends no request", async() => {
    renderSession();

    await waitFor(() => expect(statusText()).toBe("unauthenticated:none"));
    expect(meCalls).toBe(0);
  });

  it("loads /me when an access token is stored", async() => {
    saveTokens("access-1", "refresh-1");
    renderSession();

    expect(statusText()).toBe("loading:none");
    await waitFor(() => expect(statusText()).toBe("authenticated:STUDENT"));
    expect(meCalls).toBe(1);
    expect(session?.user?.email).toBe("ana@ventylab.demo");
    expect(session?.hasRole("STUDENT", "TEACHER")).toBe(true);
    expect(session?.hasRole("ADMIN")).toBe(false);
    expect(session?.hasPermission("levels:read")).toBe(true);
    expect(session?.hasPermission("groups:manage")).toBe(false);
  });

  it("clears the tokens when /me rejects the session", async() => {
    server.use(http.get(url("/api/auth/me"), () => errorResponse("auth.user_inactive", 403)));
    saveTokens("access-1", "refresh-1");
    renderSession();

    await waitFor(() => expect(statusText()).toBe("unauthenticated:none"));
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("keeps the tokens and exposes the error when /me fails for a server reason", async() => {
    server.use(http.get(url("/api/auth/me"), () => errorResponse("common.internal_error", 500)));
    saveTokens("access-1", "refresh-1");
    renderSession();

    await waitFor(() => expect(statusText()).toBe("unauthenticated:none"));
    expect(session?.error?.status).toBe(500);
    expect(getAccessToken()).toBe("access-1");
  });
});

describe("establishSession", () => {
  it("stores the tokens and loads /me once", async() => {
    renderSession();
    await waitFor(() => expect(statusText()).toBe("unauthenticated:none"));

    let user: unknown;

    await act(async() => {
      user = await session?.establishSession({ accessToken: "access-1", refreshToken: "refresh-1" });
    });

    expect(statusText()).toBe("authenticated:STUDENT");
    expect(user).toMatchObject({ id: "u1" });
    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
    expect(meCalls).toBe(1);
  });
});

describe("signOut", () => {
  it("clears both tokens and the session SWR entries even when logout fails", async() => {
    server.use(
      http.post(url("/api/auth/logout"), ({ request }) => {
        logoutAuthorization = request.headers.get("authorization");

        return errorResponse("common.internal_error", 500);
      }),
    );
    const cache: Cache = new Map();

    await renderAuthenticated(cache, <SeedGroups />);
    await waitFor(() => expect(cache.get(unstable_serialize(GROUPS_KEY))?.data).toEqual({ data: ["g1"] }));

    await act(async() => {
      await session?.signOut();
    });

    expect(logoutAuthorization).toBe("Bearer access-1");
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(statusText()).toBe("unauthenticated:none");
    expect(cache.get(unstable_serialize(GROUPS_KEY))?.data).toBeUndefined();
  });
});

describe("session expiry", () => {
  it("handles session-expired fired twice as a single transition", async() => {
    await renderAuthenticated();

    act(() => {
      clearTokens();
      emitAuthEvent({ type: "session-expired", reason: "auth.refresh_token_expired" });
      emitAuthEvent({ type: "session-expired", reason: "token_refresh_failed" });
    });

    expect(statusText()).toBe("unauthenticated:none");
    expect(statuses).toEqual(["loading", "authenticated", "unauthenticated"]);
  });

  it("ends the session on session-expired alone", async() => {
    await renderAuthenticated();

    act(() => {
      emitAuthEvent({ type: "session-expired", reason: "socket" });
    });

    expect(statusText()).toBe("unauthenticated:none");
  });

  it("ignores a lone legacy bridge token", async() => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, "nextauth-bridge-token");
    renderSession();

    await waitFor(() => expect(statusText()).toBe("unauthenticated:none"));
    expect(meCalls).toBe(0);
    expect(getAccessToken()).toBe("nextauth-bridge-token");
  });

  it("follows a token removal made in another tab", async() => {
    await renderAuthenticated();

    act(() => {
      window.localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: ACCESS_TOKEN_KEY, newValue: null }));
    });

    expect(statusText()).toBe("unauthenticated:none");
  });
});

describe("handleRoleChanged", () => {
  it("refreshes the token and reloads /me for the current user", async() => {
    await renderAuthenticated();
    currentRole = "TEACHER";

    let handled: boolean | undefined;

    await act(async() => {
      handled = await session?.handleRoleChanged({ userId: "u1", previousRole: "STUDENT", newRole: "TEACHER" });
    });

    expect(handled).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(meCalls).toBe(2);
    expect(getAccessToken()).toBe("access-2");
    expect(statusText()).toBe("authenticated:TEACHER");
    expect(session?.hasPermission("groups:manage")).toBe(true);
    expect(statuses).toEqual(["loading", "authenticated"]);
  });

  it("ignores events for another user", async() => {
    await renderAuthenticated();

    let handled: boolean | undefined;

    await act(async() => {
      handled = await session?.handleRoleChanged({ userId: "u2", previousRole: "STUDENT", newRole: "TEACHER" });
    });

    expect(handled).toBe(false);
    expect(refreshCalls).toBe(0);
    expect(meCalls).toBe(1);
  });
});
