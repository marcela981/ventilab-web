/*
* Funcionalidad: Navigation badges tests
* Descripción: Verifies the nav-badges registry (a setter stores a positive count, zero or null clears it, setters are no-ops without a provider) and its rendering in the AppShell: the "Calificar" item of a teacher shows the gradingPending count as a badge with screen-reader text, and shows nothing at 0. Depends on vitest, Testing Library, next/router and next/link (mocked), the session context, the AppShell and the nav-badges registry. v1.1 (G1 review W2): badges are visible only while an AppShell (badge host) is mounted. v1.2 (B4): the accessible name of a badged nav item carries a differentiated, singular/plural count ("Notificaciones, 3 sin leer", "Calificar, 2 pendientes por calificar"), nothing at 0; navBadgeText is shared with the notifications bell. v1.3 (W1 Bloque 1): "Notificaciones" left the side menu (the bell keeps the unread count), so only "Calificar" shows a badge there; a fed unread count adds no navigation item.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Role } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { AppShell } from "./app-shell";
import { navBadgeText, NavBadgeProvider, useNavBadgeCounts, useNavBadgesVisible, useSetNavBadgeCount } from "./nav-badges";

const router = vi.hoisted(() => ({ pathname: "/panel", asPath: "/panel", isReady: true, replace: vi.fn() }));

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
    user: { id: "u1", email: "laura@ventylab.demo", name: "Laura Gómez", image: null, role },
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

// Feeds the gradingPending badge the way a feature does; undefined leaves it untouched.
function Feeder({ count, notifications }: { count?: number | null | undefined, notifications?: number | undefined }) {
  const setPending = useSetNavBadgeCount("gradingPending");
  const setUnread = useSetNavBadgeCount("notificationsUnread");

  useEffect(() => {
    if (count !== undefined) {
      setPending(count);
    }
  }, [count, setPending]);

  useEffect(() => {
    if (notifications !== undefined) {
      setUnread(notifications);
    }
  }, [notifications, setUnread]);

  return null;
}

function Probe() {
  const counts = useNavBadgeCounts();

  return <output aria-label="conteo">{counts.gradingPending === undefined ? "vacío" : String(counts.gradingPending)}</output>;
}

describe("nav-badges registry", () => {
  it("stores a positive count and clears it at zero or null", () => {
    const tree = (count?: number | null): ReactElement => (
      <NavBadgeProvider>
        <Feeder count={count} />
        <Probe />
      </NavBadgeProvider>
    );
    const { rerender } = render(tree());

    expect(screen.getByLabelText("conteo")).toHaveTextContent("vacío");
    rerender(tree(4));
    expect(screen.getByLabelText("conteo")).toHaveTextContent("4");
    rerender(tree(0));
    expect(screen.getByLabelText("conteo")).toHaveTextContent("vacío");
    rerender(tree(2));
    rerender(tree(null));
    expect(screen.getByLabelText("conteo")).toHaveTextContent("vacío");
  });

  it("is a no-op without a provider", () => {
    render(
      <>
        <Feeder count={3} />
        <Probe />
      </>,
    );

    expect(screen.getByLabelText("conteo")).toHaveTextContent("vacío");
  });
});

function renderShell(count: number, notifications?: number) {
  return render(
    <SessionContext.Provider value={sessionValue("TEACHER")}>
      <NavBadgeProvider>
        <Feeder count={count} notifications={notifications} />
        <AppShell>
          <p>Contenido</p>
        </AppShell>
      </NavBadgeProvider>
    </SessionContext.Provider>,
  );
}

function desktopNavigation() {
  // The permanent drawer is always mounted; the temporary (mobile) one is closed.
  return screen.getAllByRole("navigation", { name: "Navegación principal" })[0] as HTMLElement;
}

describe("AppShell navigation badges", () => {
  it("shows the pending count on Calificar with screen-reader text", () => {
    renderShell(5);

    const link = within(desktopNavigation()).getByRole("link", { name: /Calificar/ });

    expect(link).toHaveAccessibleName("Calificar, 5 pendientes por calificar");
    expect(within(link).getByText("5")).toHaveAttribute("aria-hidden", "true");
  });

  it("names each badge count differently, singular and plural", () => {
    const { unmount } = renderShell(1, 1);

    expect(within(desktopNavigation()).getByRole("link", { name: "Calificar, 1 pendiente por calificar" })).toBeInTheDocument();
    unmount();

    renderShell(2, 3);
    expect(within(desktopNavigation()).getByRole("link", { name: "Calificar, 2 pendientes por calificar" })).toBeInTheDocument();
    expect(within(desktopNavigation()).queryByRole("link", { name: /Notificaciones/ })).not.toBeInTheDocument();
  });

  it("shares the unread text with the notifications bell", () => {
    expect(navBadgeText("notificationsUnread", 1)).toBe("1 sin leer");
    expect(navBadgeText("notificationsUnread", 12)).toBe("12 sin leer");
    expect(navBadgeText("gradingPending", 1)).toBe("1 pendiente por calificar");
  });

  it("shows no badge at zero", () => {
    renderShell(0);

    const link = within(desktopNavigation()).getByRole("link", { name: /Calificar/ });

    expect(link).toHaveAccessibleName("Calificar");
    expect(within(link).queryByText(/pendiente/)).not.toBeInTheDocument();
  });
});

function VisibilityProbe() {
  return <output aria-label="visible">{useNavBadgesVisible() ? "sí" : "no"}</output>;
}

describe("nav-badge host visibility", () => {
  it("is visible only while an AppShell is mounted", () => {
    const tree = (withShell: boolean): ReactElement => (
      <SessionContext.Provider value={sessionValue("TEACHER")}>
        <NavBadgeProvider>
          <VisibilityProbe />
          {withShell ? <AppShell><p>Contenido</p></AppShell> : null}
        </NavBadgeProvider>
      </SessionContext.Provider>
    );
    const { rerender } = render(tree(false));

    expect(screen.getByLabelText("visible")).toHaveTextContent("no");
    rerender(tree(true));
    expect(screen.getByLabelText("visible")).toHaveTextContent("sí");
    rerender(tree(false));
    expect(screen.getByLabelText("visible")).toHaveTextContent("no");
  });

  it("is never visible without a provider", () => {
    render(<VisibilityProbe />);

    expect(screen.getByLabelText("visible")).toHaveTextContent("no");
  });
});
