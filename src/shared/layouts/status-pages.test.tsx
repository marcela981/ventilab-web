/*
* Funcionalidad: Status pages tests
* Descripción: The 404 and 500 pages show their Spanish title and message, link a signed-in user to the home of the role and an anonymous visitor to the login page, and the 500 page offers "Reintentar". Depends on vitest, Testing Library, next/head (mocked) and the session context.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Role, SessionStatus } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { NotFoundPage, ServerErrorPage, STATUS_PAGES_COPY } from "./status-pages";

vi.mock("next/head", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

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

function renderWith(page: ReactElement, value: SessionContextValue) {
  return render(<SessionContext.Provider value={value}>{page}</SessionContext.Provider>);
}

describe("NotFoundPage", () => {
  it("shows the Spanish title and message", () => {
    renderWith(<NotFoundPage />, sessionValue("unauthenticated"));

    expect(screen.getByRole("heading", { level: 1, name: STATUS_PAGES_COPY.notFound.title })).toBeInTheDocument();
    expect(screen.getByText(STATUS_PAGES_COPY.notFound.message)).toBeInTheDocument();
  });

  it.each([
    ["STUDENT", "/me"],
    ["TEACHER", "/teacher"],
    ["ADMIN", "/teacher"],
  ] as const)("links a %s back to %s", (role, href) => {
    renderWith(<NotFoundPage />, sessionValue("authenticated", role));

    expect(screen.getByRole("link", { name: STATUS_PAGES_COPY.home })).toHaveAttribute("href", href);
  });

  it("links an anonymous visitor to the login page", () => {
    renderWith(<NotFoundPage />, sessionValue("unauthenticated"));

    expect(screen.getByRole("link", { name: STATUS_PAGES_COPY.login })).toHaveAttribute("href", "/auth/login");
  });
});

describe("ServerErrorPage", () => {
  it("shows the Spanish title, the role home link and the retry button", () => {
    renderWith(<ServerErrorPage />, sessionValue("authenticated", "STUDENT"));

    expect(screen.getByRole("heading", { level: 1, name: STATUS_PAGES_COPY.serverError.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: STATUS_PAGES_COPY.home })).toHaveAttribute("href", "/me");
    expect(screen.getByRole("button", { name: STATUS_PAGES_COPY.retry })).toBeInTheDocument();
  });
});
