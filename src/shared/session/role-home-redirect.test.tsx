/*
* Funcionalidad: RoleHomeRedirect tests
* Descripción: The role-aware entry redirect waits while the session loads, then sends each role to its home (STUDENT /me, TEACHER /teacher, ADMIN /teacher) and an anonymous visitor to the login page, only once. Depends on vitest, Testing Library, next/router (mocked) and the session modules. v1.1 (review): an authenticated session without a role goes to the login page (/auth/login), and a loading session that becomes authenticated redirects exactly once.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleHomeRedirect } from "./role-home-redirect";
import { LOGIN_PATH } from "./routes.config";
import type { Role, SessionStatus } from "./session.entity";
import { SessionContext } from "./session-context";
import type { SessionContextValue } from "./session-context";

const router = vi.hoisted(() => ({ replace: vi.fn(() => Promise.resolve(true)) }));

vi.mock("next/router", () => ({ useRouter: () => router }));

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

function renderWith(value: SessionContextValue) {
  return render(<SessionContext.Provider value={value}><RoleHomeRedirect /></SessionContext.Provider>);
}

beforeEach(() => {
  router.replace.mockClear();
});

describe("RoleHomeRedirect", () => {
  it("waits while the session loads", () => {
    renderWith(sessionValue("loading"));

    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each([
    ["STUDENT", "/me"],
    ["TEACHER", "/teacher"],
    ["ADMIN", "/teacher"],
  ] as const)("sends a %s to %s", (role, home) => {
    renderWith(sessionValue("authenticated", role));

    expect(router.replace).toHaveBeenCalledWith(home);
  });

  it("sends an anonymous visitor to the login page once", () => {
    const { rerender } = renderWith(sessionValue("unauthenticated"));

    rerender(<SessionContext.Provider value={sessionValue("unauthenticated")}><RoleHomeRedirect /></SessionContext.Provider>);

    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith(LOGIN_PATH);
  });

  it("sends an authenticated session without a role to the login page", () => {
    renderWith(sessionValue("authenticated", null));

    expect(LOGIN_PATH).toBe("/auth/login");
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith("/auth/login");
  });

  it("redirects exactly once when a loading session becomes authenticated", () => {
    const { rerender } = renderWith(sessionValue("loading"));

    expect(router.replace).not.toHaveBeenCalled();

    rerender(<SessionContext.Provider value={sessionValue("authenticated", "TEACHER")}><RoleHomeRedirect /></SessionContext.Provider>);
    rerender(<SessionContext.Provider value={sessionValue("authenticated", "TEACHER")}><RoleHomeRedirect /></SessionContext.Provider>);

    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith("/teacher");
  });
});
