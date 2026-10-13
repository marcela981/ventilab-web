/*
* Funcionalidad: Route guard tests
* Descripción: RequireAuth and RequireRole behavior with a mocked Next router: neutral loading state without protected content, redirect to the login page with a safe returnTo, redirect of a wrong role to its landing route, and a single redirect when the session expires twice. Depends on vitest, Testing Library, next/router (mocked) and the session modules.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { emitAuthEvent } from "@shared/api-client/auth-events";
import { saveTokens } from "@shared/api-client/token-storage";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { AuthProvider } from "./auth-provider";
import { RequireAuth } from "./require-auth";
import { RequireRole } from "./require-role";
import { DEFAULT_ROUTE_BY_ROLE } from "./routes.config";
import type { Role, SessionStatus } from "./session.entity";
import { SessionContext } from "./session-context";
import type { SessionContextValue } from "./session-context";

const router = vi.hoisted(() => ({
  asPath: "/teaching/m1/l2?tab=quiz",
  isReady: true,
  replace: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer(
  http.get(`${BACKEND_ORIGIN}/api/auth/me`, () =>
    HttpResponse.json({
      success: true,
      message: null,
      data: {
        user: { id: "u1", email: "ana@ventylab.demo", name: "Ana", image: null, role: "STUDENT" },
        permissions: [],
      },
      code: null,
      timestamp: "2026-10-13T00:00:00.000Z",
      traceId: "trace-ok",
      pagination: null,
    })),
);

function sessionValue(status: SessionStatus, role: Role | null = null): SessionContextValue {
  const user = role ? { id: "u1", email: "a@b.c", name: "Ana", image: null, role } : null;

  return {
    status,
    user,
    role,
    permissions: [],
    error: null,
    hasRole: (...roles: Role[]) => role !== null && roles.includes(role),
    hasPermission: () => false,
    establishSession: vi.fn(),
    signOut: vi.fn(),
    reloadSession: vi.fn(),
    handleRoleChanged: vi.fn(),
  };
}

function renderWith(value: SessionContextValue, guard: ReactNode) {
  return render(<SessionContext.Provider value={value}>{guard}</SessionContext.Provider>);
}

const protectedContent = <p>Contenido protegido</p>;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  router.replace.mockClear();
  router.isReady = true;
});

afterEach(() => {
  window.localStorage.clear();
});

describe("RequireAuth", () => {
  it("renders a neutral loading state while the session loads", () => {
    renderWith(sessionValue("loading"), <RequireAuth>{protectedContent}</RequireAuth>);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("redirects an unauthenticated visitor to the login page with returnTo", () => {
    renderWith(sessionValue("unauthenticated"), <RequireAuth>{protectedContent}</RequireAuth>);

    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith("/auth/login?returnTo=%2Fteaching%2Fm1%2Fl2%3Ftab%3Dquiz");
  });

  it("waits for the router before redirecting", () => {
    router.isReady = false;
    renderWith(sessionValue("unauthenticated"), <RequireAuth>{protectedContent}</RequireAuth>);

    expect(router.replace).not.toHaveBeenCalled();
  });

  it("renders the content once authenticated", () => {
    renderWith(sessionValue("authenticated", "STUDENT"), <RequireAuth>{protectedContent}</RequireAuth>);

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });

  it("redirects only once when the session expires twice", async() => {
    saveTokens("access-1", "refresh-1");
    render(
      <AuthProvider>
        <RequireAuth>{protectedContent}</RequireAuth>
      </AuthProvider>,
    );

    expect(await screen.findByText("Contenido protegido")).toBeInTheDocument();

    act(() => {
      emitAuthEvent({ type: "session-expired", reason: "auth.refresh_token_expired" });
      emitAuthEvent({ type: "session-expired", reason: "token_refresh_failed" });
    });

    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledTimes(1);
  });
});

describe("RequireRole", () => {
  it("renders the content for an allowed role", () => {
    renderWith(
      sessionValue("authenticated", "TEACHER"),
      <RequireRole roles={["TEACHER", "ADMIN"]}>{protectedContent}</RequireRole>,
    );

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });

  it("redirects a wrong role to its landing route without showing the content", () => {
    renderWith(sessionValue("authenticated", "STUDENT"), <RequireRole roles={["ADMIN"]}>{protectedContent}</RequireRole>);

    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith(DEFAULT_ROUTE_BY_ROLE.STUDENT);
  });

  it("sends an unauthenticated visitor to the login page", () => {
    renderWith(sessionValue("unauthenticated"), <RequireRole roles={["ADMIN"]}>{protectedContent}</RequireRole>);

    expect(router.replace).toHaveBeenCalledWith("/auth/login?returnTo=%2Fteaching%2Fm1%2Fl2%3Ftab%3Dquiz");
  });
});
