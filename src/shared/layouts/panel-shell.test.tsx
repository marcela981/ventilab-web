/*
* Funcionalidad: PanelShell tests
* Descripción: Verifies the staff panel chrome: the "Navegación del panel" landmark with the role's items and aria-current on the active one, the header with the user's name, email and role chip, the "Volver a la plataforma" link to /simulador, the collapse toggle (aria-expanded, labels kept as accessible names, state persisted in localStorage and restored, storage failures tolerated), the skip link, the user menu, the grading badge in the Evaluaciones accessible name, the device indicator on Laboratorio, the registration as nav-badge and indicator host and the error boundary that keeps the panel. Depends on vitest, Testing Library and the session and layouts contexts.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { NavBadgeProvider, useNavBadgesVisible, useSetNavBadgeCount } from "./nav-badges";
import { NavIndicatorProvider, useNavIndicatorVisible, useSetNavIndicator } from "./nav-indicators";
import { PanelShell } from "./panel-shell";
import { PANEL_COLLAPSED_STORAGE_KEY } from "./use-panel-collapsed";

const router = vi.hoisted(() => ({
  pathname: "/teacher",
  asPath: "/teacher",
  isReady: true,
  replace: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function sessionValue(role: Role): SessionContextValue {
  return {
    status: "authenticated",
    user: { id: "u1", email: "ana@ventylab.demo", name: "Ana Torres", image: null, role },
    role,
    permissions: [],
    error: null,
    hasRole: (...roles: Role[]) => roles.includes(role),
    hasPermission: () => false,
    establishSession: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    reloadSession: vi.fn(),
    handleRoleChanged: vi.fn(),
  };
}

function renderPanel(role: Role, extra: ReactNode = null, value = sessionValue(role)) {
  return render(
    <SessionContext.Provider value={value}>
      <NavBadgeProvider>
        <NavIndicatorProvider>
          {extra}
          <PanelShell>
            <p>Contenido del panel</p>
          </PanelShell>
        </NavIndicatorProvider>
      </NavBadgeProvider>
    </SessionContext.Provider>,
  );
}

const panelNav = () => screen.getByRole("navigation", { name: "Navegación del panel" });

beforeEach(() => {
  router.pathname = "/teacher";
  router.asPath = "/teacher";
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PanelShell navigation", () => {
  it("lists the teacher items, marks the active one and hides the admin-only items", () => {
    router.pathname = "/teacher/students/[userId]";
    renderPanel("TEACHER");

    const nav = panelNav();

    expect(within(nav).getByRole("link", { name: "Estudiantes" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
    expect(within(nav).getByRole("link", { name: "Laboratorio" })).toHaveAttribute("href", "/teacher/lab");
    expect(within(nav).getByRole("link", { name: "Estado del sistema" })).toHaveAttribute("href", "/admin/status");
    expect(within(nav).queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
  });

  it("gives admins the Administración section", () => {
    renderPanel("ADMIN");

    const nav = panelNav();

    expect(within(nav).getByText("Administración")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Investigación" })).toHaveAttribute("href", "/admin/research");
  });

  it("links back to the platform", () => {
    renderPanel("TEACHER");

    expect(within(panelNav()).getByRole("link", { name: "Volver a la plataforma" })).toHaveAttribute("href", "/simulador");
  });

  it("renders the page in the main region with a skip link to it", () => {
    renderPanel("TEACHER");

    const main = screen.getByRole("main");

    expect(main).toContainElement(screen.getByText("Contenido del panel"));
    expect(screen.getByRole("link", { name: "Saltar al contenido principal" })).toHaveAttribute("href", `#${main.id}`);
  });
});

describe("PanelShell header", () => {
  it("shows the user's name, email and role chip", () => {
    renderPanel("TEACHER");

    const header = screen.getByRole("banner");

    expect(within(header).getByText("Panel docente")).toBeInTheDocument();
    expect(within(header).getByText("Ana Torres")).toBeInTheDocument();
    expect(within(header).getByText("ana@ventylab.demo")).toBeInTheDocument();
    expect(within(header).getByText("Docente")).toBeInTheDocument();
  });

  it("labels an admin as Administrador", () => {
    renderPanel("ADMIN");

    expect(within(screen.getByRole("banner")).getByText("Administrador")).toBeInTheDocument();
  });

  it("signs out from the user menu", () => {
    const value = sessionValue("TEACHER");

    renderPanel("TEACHER", null, value);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de usuario" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Cerrar sesión/ }));

    expect(value.signOut).toHaveBeenCalledTimes(1);
  });
});

describe("PanelShell collapse", () => {
  it("collapses and expands the menu, keeping the labels as accessible names", () => {
    renderPanel("TEACHER");

    const toggle = screen.getByRole("button", { name: "Contraer menú" });

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);

    const expand = screen.getByRole("button", { name: "Expandir menú" });

    expect(expand).toHaveAttribute("aria-expanded", "false");
    expect(expand).toHaveAttribute("aria-controls", panelNav().id);
    expect(within(panelNav()).getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(window.localStorage.getItem(PANEL_COLLAPSED_STORAGE_KEY)).toBe("1");

    fireEvent.click(expand);
    expect(screen.getByRole("button", { name: "Contraer menú" })).toHaveAttribute("aria-expanded", "true");
    expect(window.localStorage.getItem(PANEL_COLLAPSED_STORAGE_KEY)).toBeNull();
  });

  it("restores the collapsed state from localStorage", () => {
    window.localStorage.setItem(PANEL_COLLAPSED_STORAGE_KEY, "1");
    renderPanel("TEACHER");

    expect(screen.getByRole("button", { name: "Expandir menú" })).toHaveAttribute("aria-expanded", "false");
  });

  it("still toggles when the storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderPanel("TEACHER");

    fireEvent.click(screen.getByRole("button", { name: "Contraer menú" }));

    expect(screen.getByRole("button", { name: "Expandir menú" })).toBeInTheDocument();
  });
});

describe("PanelShell registries", () => {
  it("hosts the badges and names the pending count on Evaluaciones", () => {
    function Feeder() {
      const setCount = useSetNavBadgeCount("gradingPending");
      const visible = useNavBadgesVisible();

      useEffect(() => setCount(2), [setCount]);

      return <output data-testid="badges-visible">{String(visible)}</output>;
    }

    renderPanel("TEACHER", <Feeder />);

    expect(screen.getByTestId("badges-visible")).toHaveTextContent("true");
    expect(within(panelNav()).getByRole("link", { name: "Evaluaciones, 2 pendientes por calificar" })).toHaveAttribute("href", "/evaluations");
  });

  it("hosts the device indicator of Laboratorio", () => {
    function Feeder() {
      const feed = useSetNavIndicator("ventilatorDevice");
      const visible = useNavIndicatorVisible("ventilatorDevice");

      useEffect(() => feed({ tone: "positive", text: "Equipo en línea" }), [feed]);

      return <output data-testid="indicator-visible">{String(visible)}</output>;
    }

    renderPanel("TEACHER", <Feeder />);

    expect(screen.getByTestId("indicator-visible")).toHaveTextContent("true");
    expect(within(panelNav()).getByRole("link", { name: /Laboratorio/ })).toHaveTextContent("Equipo en línea");
  });

  it("keeps the panel when the page throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    function Broken(): never {
      throw new Error("boom");
    }

    render(
      <SessionContext.Provider value={sessionValue("TEACHER")}>
        <PanelShell>
          <Broken />
        </PanelShell>
      </SessionContext.Provider>,
    );

    expect(panelNav()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
