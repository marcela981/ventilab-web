/*
* Funcionalidad: Navigation badges tests
* Descripción: Verifies the nav-badges registry (a setter stores a positive count, zero or null clears it, setters are no-ops without a provider) and its rendering in the AppShell: the "Calificar" item of a teacher shows the gradingPending count as a badge with screen-reader text, and shows nothing at 0. Depends on vitest, Testing Library, next/router and next/link (mocked), the session context, the AppShell and the nav-badges registry.
* Versión: 1.0
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
import { NavBadgeProvider, useNavBadgeCounts, useSetNavBadgeCount } from "./nav-badges";

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
function Feeder({ count }: { count?: number | null | undefined }) {
  const setPending = useSetNavBadgeCount("gradingPending");

  useEffect(() => {
    if (count !== undefined) {
      setPending(count);
    }
  }, [count, setPending]);

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

function renderShell(count: number) {
  return render(
    <SessionContext.Provider value={sessionValue("TEACHER")}>
      <NavBadgeProvider>
        <Feeder count={count} />
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

    expect(link).toHaveAccessibleName("Calificar , 5 pendientes");
    expect(within(link).getByText("5")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows no badge at zero", () => {
    renderShell(0);

    const link = within(desktopNavigation()).getByRole("link", { name: /Calificar/ });

    expect(link).toHaveAccessibleName("Calificar");
    expect(within(link).queryByText(/pendiente/)).not.toBeInTheDocument();
  });
});
