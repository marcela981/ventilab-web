/*
* Funcionalidad: Top bar actions slot tests
* Descripción: Verifies that the AppShell renders the actions registered through TopBarActionsProvider inside its top bar (banner), before the user menu, and renders no extra action without a provider. Depends on vitest, Testing Library, next/router and next/link (mocked), the session context, the AppShell and the top-bar-actions slot. v1.1 (Bloque 5, D10): the shell actions placement and surface hooks (top bar by default, sidebar and panel inside a provider) and the compact realtime indicator; the AppShell tests now cover the tools placement: the sidebar "Herramientas" group on desktop (matchMedia mocked) before the user card, the thin mobile bar below md, nothing extra without a provider.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import { AppShell } from "./app-shell";
import { RealtimeIndicator } from "./shell-controls";
import { ShellActionsPlacementProvider, TopBarActionsProvider, useShellActionsPlacement, useShellActionsSurface } from "./top-bar-actions";

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

function setDesktop(matches: boolean | null) {
  if (matches === null) {
    Reflect.deleteProperty(window, "matchMedia");

    return;
  }

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

function renderShell(withAction: boolean) {
  const shell = (
    <AppShell>
      <p>Contenido</p>
    </AppShell>
  );

  return render(
    <SessionContext.Provider value={SESSION}>
      {withAction ? <TopBarActionsProvider actions={<PlacementAction />}>{shell}</TopBarActionsProvider> : shell}
    </SessionContext.Provider>,
  );
}

// A registered action that reports the placement the shell gave it.
function PlacementAction() {
  return <button type="button">{`Acción en ${useShellActionsPlacement()}`}</button>;
}

afterEach(() => {
  setDesktop(null);
});

describe("AppShell tools (Bloque 5, D10, D14)", () => {
  it("puts the registered actions in the sidebar Herramientas group on desktop, with no top bar copy", () => {
    setDesktop(true);
    renderShell(true);

    const tools = screen.getByRole("group", { name: "Herramientas" });
    const card = screen.getByRole("button", { name: "Opciones" });

    expect(within(tools).getByRole("button", { name: "Acción en sidebar" })).toBeInTheDocument();
    expect(tools.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(screen.getByRole("banner")).queryByRole("button", { name: /Acción/ })).not.toBeInTheDocument();
  });

  it("puts them in the thin mobile bar below md, after the navigation button", () => {
    setDesktop(false);
    renderShell(true);

    const banner = screen.getByRole("banner");
    const buttons = within(banner).getAllByRole("button").map((button) => button.textContent || button.getAttribute("aria-label"));

    expect(buttons).toEqual(["Abrir menú de navegación", "Acción en topbar"]);
    expect(screen.queryByRole("group", { name: "Herramientas" })).not.toBeInTheDocument();
  });

  it("renders no extra action without a provider", () => {
    renderShell(false);

    expect(within(screen.getByRole("banner")).getAllByRole("button").map((button) => button.getAttribute("aria-label")))
      .toEqual(["Abrir menú de navegación"]);
  });
});

describe("shell actions placement (Bloque 5, D10)", () => {
  function Probe() {
    return <output>{`${useShellActionsPlacement()}|${useShellActionsSurface() ?? "none"}`}</output>;
  }

  it("defaults to the top bar without a scope", () => {
    render(<Probe />);

    expect(screen.getByRole("status")).toHaveTextContent("topbar|none");
  });

  it("tells the actions they are in the sidebar of the panel", () => {
    render(
      <ShellActionsPlacementProvider placement="sidebar" surface="panel">
        <Probe />
      </ShellActionsPlacementProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("sidebar|panel");
  });
});

describe("RealtimeIndicator compact", () => {
  it("keeps a status with the hidden text and no chip", () => {
    render(
      <RealtimeContext.Provider value={{ socket: null, status: "disconnected" }}>
        <RealtimeIndicator compact />
      </RealtimeContext.Provider>,
    );

    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("Sin conexión en tiempo real");
    expect(status.querySelector(".MuiChip-root")).toBeNull();
  });
});
