/*
* Funcionalidad: SidebarUserCard tests
* Descripción: Verifies the sidebar user card: the name and role chip link to /profile, the avatar falls back to the initials and shows the session image, the "Opciones" button (aria-haspopup, aria-expanded, aria-controls) opens the menu with the name, the email, Perfil first and Cerrar sesión last, sign-out goes through the session, the collapsed card is a single "Opciones de {nombre}" button that opens the same menu, the panel variant scopes the menu portal to the panel surface and nothing renders without a user. v1.0 (Bloque 5): new.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Role } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { SidebarUserCard } from "./sidebar-user-card";
import type { SidebarUserCardProps } from "./sidebar-user-card";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function sessionValue(role: Role | null, image: string | null = null): SessionContextValue {
  const user = role ? { id: "u1", email: "ana@ventylab.demo", name: "Ana Torres", image, role } : null;

  return {
    status: role ? "authenticated" : "unauthenticated",
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

function renderCard(value: SessionContextValue, props: SidebarUserCardProps = {}) {
  return render(
    <SessionContext.Provider value={value}>
      <SidebarUserCard {...props} />
    </SessionContext.Provider>,
  );
}

describe("SidebarUserCard expanded", () => {
  it("links the name and the role chip to the profile", () => {
    renderCard(sessionValue("TEACHER"));

    const link = screen.getByRole("link", { name: /Ana Torres/ });

    expect(link).toHaveAttribute("href", "/profile");
    expect(link).toHaveTextContent("Docente");
    expect(link).toHaveTextContent("AT");
  });

  it("shows the session image in the avatar when present", () => {
    const { container } = renderCard(sessionValue("STUDENT", "https://cdn.example/ana.png"));

    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.example/ana.png");
  });

  it("opens the options menu with Perfil first and Cerrar sesión last (D12)", () => {
    renderCard(sessionValue("STUDENT"));

    const button = screen.getByRole("button", { name: "Opciones" });

    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);

    const menu = screen.getByRole("menu");

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(button.getAttribute("aria-controls") ?? "")).toContainElement(menu);
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Perfil",
      "Mi resumen",
      "Mis notas",
      "Mis calificaciones",
      "Mi grupo",
      "Cerrar sesión",
    ]);
    expect(within(menu).getByText("ana@ventylab.demo")).toBeInTheDocument();
  });

  it("signs out through the session", () => {
    const value = sessionValue("TEACHER");

    renderCard(value);
    fireEvent.click(screen.getByRole("button", { name: "Opciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Cerrar sesión/ }));

    expect(value.signOut).toHaveBeenCalledTimes(1);
  });
});

describe("SidebarUserCard collapsed", () => {
  it("is a single avatar button that opens the same menu (D11)", () => {
    renderCard(sessionValue("ADMIN"), { collapsed: true });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Opciones de Ana Torres" }));

    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Perfil", "Cerrar sesión"]);
  });
});

describe("SidebarUserCard variants", () => {
  it("scopes the menu portal to the panel surface", () => {
    renderCard(sessionValue("TEACHER"), { variant: "panel" });
    fireEvent.click(screen.getByRole("button", { name: "Opciones" }));

    expect(screen.getByRole("menu").closest("[data-surface='panel']")).not.toBeNull();
  });

  it("renders nothing without a session user", () => {
    const { container } = renderCard(sessionValue(null));

    expect(container).toBeEmptyDOMElement();
  });
});
