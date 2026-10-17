/*
* Funcionalidad: Layouts and AppShell tests
* Descripción: Verifies the guard behavior of the Student/Teacher/Admin layouts (redirect to login, wrong role to its landing route, content for the right role), the public layout without auth, and the AppShell (role-filtered nav, skip link, sign-out through the session, realtime status indicator, route error boundary). v1.1 (T11a): the user avatar shows the session image with the initials as fallback, and the student-only layout sends other roles to their landing route. v1.2 (T12 ventilator-lab): the Laboratorio item shows the device indicator. v1.3 (T12 review fix W1): the shell shows no indicator nobody fed (no invented device state), shows the one a feeder sets in the nav-indicators registry (tone + text) and declares the keys of the role's navigation as visible. Depends on vitest, Testing Library, next/router and next/link (mocked) and the session/realtime contexts. v1.4 (O5 operation): role homes /me (students) and /teacher (teachers and admins); the teacher navigation starts at "Panel docente" (/teacher) and shows "Estado del sistema" but no admin-only item; the admin navigation shows the "Administración" section subheader and its items.
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import type { RealtimeStatus } from "@shared/realtime/realtime.entity";
import type { Role, SessionStatus } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { AppShell } from "./app-shell";
import { NavIndicatorProvider, useNavIndicatorVisible, useSetNavIndicator } from "./nav-indicators";
import type { NavIndicator } from "./nav-indicators";
import { AdminLayout } from "./admin-layout";
import { PublicLayout } from "./public-layout";
import { StudentLayout, StudentOnlyLayout, withStudentLayout } from "./student-layout";
import { TeacherLayout } from "./teacher-layout";

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

function sessionValue(status: SessionStatus, role: Role | null = null, image: string | null = null): SessionContextValue {
  const user = role ? { id: "u1", email: "ana@ventylab.demo", name: "Ana Torres", image, role } : null;

  return {
    status,
    user,
    role,
    permissions: [],
    error: null,
    hasRole: (...roles: Role[]) => role !== null && roles.includes(role),
    hasPermission: () => false,
    establishSession: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    reloadSession: vi.fn(),
    handleRoleChanged: vi.fn(),
  };
}

function renderWith(value: SessionContextValue, ui: ReactNode, realtime?: RealtimeStatus) {
  const tree = <SessionContext.Provider value={value}>{ui}</SessionContext.Provider>;

  if (!realtime) {
    return render(tree);
  }

  return render(<RealtimeContext.Provider value={{ socket: null, status: realtime }}>{tree}</RealtimeContext.Provider>);
}

const content = <p>Contenido de la página</p>;

beforeEach(() => {
  router.pathname = "/teacher";
  router.asPath = "/teacher";
  router.replace.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("authenticated layouts", () => {
  it("StudentLayout redirects an unauthenticated visitor to login without showing content", () => {
    router.asPath = "/dashboard";
    renderWith(sessionValue("unauthenticated"), <StudentLayout>{content}</StudentLayout>);

    expect(router.replace).toHaveBeenCalledWith("/auth/login?returnTo=%2Fdashboard");
    expect(screen.queryByText("Contenido de la página")).not.toBeInTheDocument();
  });

  it("StudentLayout renders the page inside the shell for any authenticated role", () => {
    renderWith(sessionValue("authenticated", "STUDENT"), <StudentLayout>{content}</StudentLayout>);

    expect(screen.getByRole("main")).toContainElement(screen.getByText("Contenido de la página"));
  });

  it("StudentOnlyLayout sends a teacher to the teacher landing route", () => {
    renderWith(sessionValue("authenticated", "TEACHER"), <StudentOnlyLayout>{content}</StudentOnlyLayout>);

    expect(router.replace).toHaveBeenCalledWith("/teacher");
    expect(screen.queryByText("Contenido de la página")).not.toBeInTheDocument();
  });

  it("StudentOnlyLayout renders the page for a student", () => {
    renderWith(sessionValue("authenticated", "STUDENT"), <StudentOnlyLayout>{content}</StudentOnlyLayout>);

    expect(screen.getByRole("main")).toContainElement(screen.getByText("Contenido de la página"));
  });

  it("TeacherLayout sends a student to the student landing route", () => {
    renderWith(sessionValue("authenticated", "STUDENT"), <TeacherLayout>{content}</TeacherLayout>);

    expect(router.replace).toHaveBeenCalledWith("/me");
    expect(screen.queryByText("Contenido de la página")).not.toBeInTheDocument();
  });

  it("TeacherLayout renders for a teacher with the teacher navigation", () => {
    renderWith(sessionValue("authenticated", "TEACHER"), <TeacherLayout>{content}</TeacherLayout>);

    const nav = screen.getByRole("navigation", { name: "Navegación principal" });

    expect(screen.getByText("Contenido de la página")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /Estado del sistema/ })).toHaveAttribute("href", "/admin/status");
    expect(within(nav).queryByRole("link", { name: /Usuarios/ })).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^Panel docente/ })).toHaveAttribute("aria-current", "page");
  });

  it("AdminLayout sends a teacher to the teacher landing route", () => {
    renderWith(sessionValue("authenticated", "TEACHER"), <AdminLayout>{content}</AdminLayout>);

    expect(router.replace).toHaveBeenCalledWith("/teacher");
    expect(screen.queryByText("Contenido de la página")).not.toBeInTheDocument();
  });

  it("AdminLayout renders for an admin with the admin navigation", () => {
    renderWith(sessionValue("authenticated", "ADMIN"), <AdminLayout>{content}</AdminLayout>);

    const nav = screen.getByRole("navigation", { name: "Navegación principal" });

    expect(screen.getByText("Contenido de la página")).toBeInTheDocument();
    expect(within(nav).getByText("Administración")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /Usuarios/ })).toHaveAttribute("href", "/admin/users");
    expect(within(nav).getByRole("link", { name: /Configuración/ })).toHaveAttribute("href", "/admin/settings");
  });

  it("withStudentLayout wraps a page as a getLayout helper", () => {
    renderWith(sessionValue("authenticated", "STUDENT"), withStudentLayout(content));

    expect(screen.getByRole("main")).toContainElement(screen.getByText("Contenido de la página"));
  });
});

describe("PublicLayout", () => {
  it("renders content without a session and never redirects", () => {
    renderWith(sessionValue("unauthenticated"), <PublicLayout>{content}</PublicLayout>);

    expect(screen.getByRole("main")).toContainElement(screen.getByText("Contenido de la página"));
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("AppShell", () => {
  it("has a skip link that targets the main region", () => {
    renderWith(sessionValue("authenticated", "STUDENT"), <AppShell>{content}</AppShell>);

    const skip = screen.getByRole("link", { name: "Saltar al contenido principal" });

    expect(skip).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("shows the session user's avatar image when present", () => {
    renderWith(sessionValue("authenticated", "STUDENT", "https://cdn.example/ana.png"), <AppShell>{content}</AppShell>);

    const button = screen.getByRole("button", { name: "Abrir menú de usuario" });

    expect(button.querySelector("img")).toHaveAttribute("src", "https://cdn.example/ana.png");
  });

  it("falls back to the initials without an avatar image", () => {
    renderWith(sessionValue("authenticated", "STUDENT"), <AppShell>{content}</AppShell>);

    const button = screen.getByRole("button", { name: "Abrir menú de usuario" });

    expect(button.querySelector("img")).toBeNull();
    expect(button).toHaveTextContent("AT");
  });

  it("signs out through the session from the user menu", () => {
    const value = sessionValue("authenticated", "STUDENT");

    renderWith(value, <AppShell>{content}</AppShell>);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de usuario" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Cerrar sesión/ }));

    expect(value.signOut).toHaveBeenCalledTimes(1);
  });

  it("opens the mobile navigation drawer", () => {
    renderWith(sessionValue("authenticated", "STUDENT"), <AppShell>{content}</AppShell>);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú de navegación" }));

    // The modal drawer hides the rest of the page from the accessibility tree, so count by text.
    expect(screen.getAllByText("Inicio")).toHaveLength(2);
  });

  it.each<RealtimeStatus>(["disconnected", "unauthorized"])("shows the realtime indicator when %s", (status) => {
    renderWith(sessionValue("authenticated", "STUDENT"), <AppShell>{content}</AppShell>, status);

    expect(screen.getByText("Sin conexión en tiempo real")).toBeInTheDocument();
  });

  it("hides the realtime indicator when authenticated", () => {
    renderWith(sessionValue("authenticated", "STUDENT"), <AppShell>{content}</AppShell>, "authenticated");

    expect(screen.queryByText("Sin conexión en tiempo real")).not.toBeInTheDocument();
  });

  it("shows the Laboratorio item without any indicator nobody fed (T12 review fix W1)", () => {
    renderWith(sessionValue("authenticated", "STUDENT"), <AppShell>{content}</AppShell>, "authenticated");

    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    const lab = within(nav).getByRole("link", { name: /Laboratorio/ });
    expect(lab).toHaveAttribute("href", "/lab");
    expect(lab).not.toHaveTextContent("Equipo sin datos");
    expect(lab.querySelector("[data-indicator-tone]")).toBeNull();
    expect(within(nav).queryByRole("link", { name: /Ventilador real/ })).not.toBeInTheDocument();
  });

  it("shows the indicator a feeder sets and declares its key visible (T12 review fix W1)", () => {
    const online: NavIndicator = { tone: "positive", text: "Equipo en línea" };

    function Feeder() {
      const feed = useSetNavIndicator("ventilatorDevice");
      const visible = useNavIndicatorVisible("ventilatorDevice");

      return (
        <div>
          <output data-testid="visible">{String(visible)}</output>
          <button type="button" onClick={() => feed(online)}>feed</button>
          <button type="button" onClick={() => feed(null)}>clear</button>
        </div>
      );
    }

    renderWith(
      sessionValue("authenticated", "STUDENT"),
      <NavIndicatorProvider>
        <Feeder />
        <AppShell>{content}</AppShell>
      </NavIndicatorProvider>,
      "authenticated",
    );

    expect(screen.getByTestId("visible")).toHaveTextContent("true");
    fireEvent.click(screen.getByRole("button", { name: "feed" }));

    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    const lab = within(nav).getByRole("link", { name: /Laboratorio/ });
    expect(lab).toHaveTextContent("Equipo en línea");
    expect(lab.querySelector("[data-indicator-tone='positive']")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "clear" }));
    expect(lab.querySelector("[data-indicator-tone]")).toBeNull();
  });

  it("keeps the shell when the page throws and shows a retry", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    function Broken(): never {
      throw new Error("boom");
    }

    renderWith(
      sessionValue("authenticated", "STUDENT"),
      <AppShell>
        <Broken />
      </AppShell>,
    );

    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
