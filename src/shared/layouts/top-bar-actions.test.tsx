/*
* Funcionalidad: Top bar actions slot tests
* Descripción: Verifies that the AppShell renders the actions registered through TopBarActionsProvider inside its top bar (banner), before the user menu, and renders no extra action without a provider. Depends on vitest, Testing Library, next/router and next/link (mocked), the session context, the AppShell and the top-bar-actions slot.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { AppShell } from "./app-shell";
import { TopBarActionsProvider } from "./top-bar-actions";

const router = vi.hoisted(() => ({ pathname: "/panel", asPath: "/panel", isReady: true, replace: vi.fn() }));

vi.mock("next/router", () => ({ useRouter: () => router }));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const SESSION: SessionContextValue = {
  status: "authenticated",
  user: { id: "u1", email: "laura@ventylab.demo", name: "Laura Gómez", image: null, role: "STUDENT" },
  role: "STUDENT",
  permissions: [],
  error: null,
  hasRole: (...roles) => roles.includes("STUDENT"),
  hasPermission: () => false,
  establishSession: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
  reloadSession: vi.fn(),
  handleRoleChanged: vi.fn(),
};

describe("AppShell top bar actions", () => {
  it("renders the registered actions in the top bar before the user menu", () => {
    render(
      <SessionContext.Provider value={SESSION}>
        <TopBarActionsProvider actions={<button type="button">Acción registrada</button>}>
          <AppShell>
            <p>Contenido</p>
          </AppShell>
        </TopBarActionsProvider>
      </SessionContext.Provider>,
    );

    const banner = screen.getByRole("banner");
    const action = within(banner).getByRole("button", { name: "Acción registrada" });
    const userMenu = within(banner).getByRole("button", { name: "Abrir menú de usuario" });

    expect(action.compareDocumentPosition(userMenu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders no extra action without a provider", () => {
    render(
      <SessionContext.Provider value={SESSION}>
        <AppShell>
          <p>Contenido</p>
        </AppShell>
      </SessionContext.Provider>,
    );

    expect(within(screen.getByRole("banner")).getAllByRole("button").map((button) => button.getAttribute("aria-label")))
      .toEqual(["Abrir menú de navegación", "Abrir menú de usuario"]);
  });
});
