/*
* Funcionalidad: Auth information pages tests
* Descripción: AccessDeniedPage (loading state, authenticated user with name, role and role-home link, visitor with a login link, the `reason` query as a warning, back navigation) and ForgotPasswordPage (notice, login and registration links). Session doubles through SessionContext and a mocked Next router. Depends on vitest, Testing Library and @shared/session.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { Role, SessionStatus } from "@shared/session/session.entity";
import { AccessDeniedPage } from "./access-denied.page";
import { ForgotPasswordPage } from "./forgot-password.page";

const router = vi.hoisted(() => ({
  query: {} as Record<string, string | string[]>,
  isReady: true,
  asPath: "/auth/access-denied",
  pathname: "/auth/access-denied",
  back: vi.fn(),
  replace: vi.fn(() => Promise.resolve(true)),
  push: vi.fn(() => Promise.resolve(true)),
  prefetch: vi.fn(() => Promise.resolve()),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

function sessionValue(status: SessionStatus, role: Role | null = null): SessionContextValue {
  const user = role ? { id: "u1", email: "ana@ventylab.demo", name: "Ana Pérez", image: null, role } : null;

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

function renderWith(value: SessionContextValue, page: ReactNode) {
  return render(<SessionContext.Provider value={value}>{page}</SessionContext.Provider>);
}

beforeEach(() => {
  router.query = {};
  router.back.mockClear();
});

describe("AccessDeniedPage", () => {
  it("shows a loading state while the session loads", () => {
    renderWith(sessionValue("loading"), <AccessDeniedPage />);

    expect(screen.getByText("Cargando sesión…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Acceso denegado" })).not.toBeInTheDocument();
  });

  it("shows the user, the role and a link to the role home", () => {
    renderWith(sessionValue("authenticated", "TEACHER"), <AccessDeniedPage />);

    expect(screen.getByRole("heading", { name: "Acceso denegado" })).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Docente")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a mi inicio" })).toHaveAttribute("href", "/teacher");
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).not.toBeInTheDocument();
  });

  it("offers the login to a visitor", () => {
    renderWith(sessionValue("unauthenticated"), <AccessDeniedPage />);

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/auth/login");
    expect(screen.queryByText("Has iniciado sesión como:")).not.toBeInTheDocument();
  });

  it("shows the reason of the query and goes back", () => {
    router.query = { reason: "Solo docentes" };
    renderWith(sessionValue("authenticated", "STUDENT"), <AccessDeniedPage />);

    expect(screen.getByText("Solo docentes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver atrás" }));

    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

describe("ForgotPasswordPage", () => {
  it("explains the alternatives and links to the login and the registration", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByRole("heading", { name: "Recuperar contraseña" })).toBeInTheDocument();
    expect(screen.getByText("Funcionalidad en desarrollo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio de sesión" })).toHaveAttribute("href", "/auth/login");
    expect(screen.getByRole("link", { name: "Regístrate aquí" })).toHaveAttribute("href", "/auth/register");
  });
});
