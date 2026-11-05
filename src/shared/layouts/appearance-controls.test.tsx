/*
* Funcionalidad: Appearance controls tests
* Descripción: The "Apariencia" group switches the mode (Claro/Oscuro: data-mui-color-scheme on <html>, stored in ventylab.theme.v1) and the palette (VentyLab/Univalle: data-palette), marks the active options pressed and, with a session, saves each change with PATCH /api/users/me (without a session nothing is sent); collapsed, the "Apariencia" button opens a menu of radio items with the active ones checked and its panel variant puts the panel surface on the portal. useThemePreferenceSync applies the server preference of the signed-in user, or uploads the one chosen in this browser when the server has none. Depends on vitest, Testing Library (the request layer is mocked), the MUI theme provider, the session context and ./appearance-controls.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ThemeProvider } from "@mui/material/styles";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { theme } from "@shared/design-system/theme/theme";
import { readStoredTheme, THEME_STORAGE_KEY, themeStorageManager } from "@shared/design-system/theme/theme-preference";
import type { SessionUser } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { AppearanceControls } from "./appearance-controls";
import { ThemePreferenceSync } from "./use-appearance";

vi.mock("next/font/google", () => ({
  Roboto: () => ({ className: "roboto", style: { fontFamily: "'Roboto'" } }),
}));

const { apiPatch } = vi.hoisted(() => ({ apiPatch: vi.fn(() => Promise.resolve({ data: null })) }));
vi.mock("@shared/api-client/api-request", () => ({ apiPatch }));

// The request layer is imported lazily on the first save.
const LAZY_REQUEST_WAIT = { timeout: 4_000 };
const patchBodies = () => apiPatch.mock.calls.map((call) => (call as unknown as [string, { body: unknown }])[1].body);

afterEach(() => {
  apiPatch.mockClear();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-palette");
  document.documentElement.removeAttribute("data-mui-color-scheme");
});

function sessionValue(user: Partial<SessionUser> | null): SessionContextValue {
  const full = user ? ({ id: "u1", email: "ana@ventylab.demo", name: "Ana", image: null, role: "STUDENT", themeMode: null, themePalette: null, ...user } as SessionUser) : null;

  return {
    status: full ? "authenticated" : "unauthenticated",
    user: full,
    role: full?.role ?? null,
    permissions: [],
    error: null,
    hasRole: () => false,
    hasPermission: () => false,
    establishSession: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    reloadSession: vi.fn(),
    handleRoleChanged: vi.fn(),
  };
}

function renderWith(children: ReactNode, user: Partial<SessionUser> | null = null) {
  return render(
    <ThemeProvider theme={theme} defaultMode="system" storageManager={themeStorageManager}>
      <SessionContext.Provider value={sessionValue(user)}>{children}</SessionContext.Provider>
    </ThemeProvider>,
  );
}

const html = () => document.documentElement;

describe("AppearanceControls expanded", () => {
  it("switches mode and palette at once and stores them in this browser", async () => {
    renderWith(<AppearanceControls />);

    const group = screen.getByRole("group", { name: "Apariencia" });
    fireEvent.click(within(group).getByRole("button", { name: "Claro" }));
    await waitFor(() => expect(html()).toHaveAttribute("data-mui-color-scheme", "light"));
    expect(within(group).getByRole("button", { name: "Claro" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(group).getByRole("button", { name: "Univalle" }));
    expect(html()).toHaveAttribute("data-palette", "univalle");
    expect(within(group).getByRole("button", { name: "Univalle" })).toHaveAttribute("aria-pressed", "true");
    expect(readStoredTheme()).toEqual({ mode: "light", palette: "univalle" });
    expect(patchBodies()).toEqual([]);
  });

  it("saves each change for the signed-in user", async () => {
    renderWith(<AppearanceControls />, {});

    fireEvent.click(screen.getByRole("button", { name: "Oscuro" }));
    fireEvent.click(screen.getByRole("button", { name: "Univalle" }));

    await waitFor(() => expect(patchBodies()).toEqual(expect.arrayContaining([{ themeMode: "dark" }, { themePalette: "univalle" }])), LAZY_REQUEST_WAIT);
  });
});

describe("AppearanceControls collapsed", () => {
  it("opens a menu of radio items with the active choices checked", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: "dark", palette: "ventylab" }));
    renderWith(<AppearanceControls collapsed variant="panel" />);

    const trigger = screen.getByRole("button", { name: "Apariencia" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.click(trigger);

    const menu = screen.getByRole("menu");
    expect(menu.closest("[data-surface='panel']")).not.toBeNull();
    expect(within(menu).getByRole("menuitemradio", { name: "Oscuro" })).toHaveAttribute("aria-checked", "true");
    expect(within(menu).getByRole("menuitemradio", { name: "VentyLab" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(within(menu).getByRole("menuitemradio", { name: "Univalle" }));
    expect(html()).toHaveAttribute("data-palette", "univalle");
    expect(within(screen.getByRole("menu")).getByRole("menuitemradio", { name: "Univalle" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("useThemePreferenceSync", () => {
  it("applies the server preference of the signed-in user", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: "light" }));
    renderWith(<ThemePreferenceSync />, { themeMode: "dark", themePalette: "univalle" });

    await waitFor(() => expect(html()).toHaveAttribute("data-mui-color-scheme", "dark"));
    expect(html()).toHaveAttribute("data-palette", "univalle");
    expect(readStoredTheme()).toEqual({ mode: "dark", palette: "univalle" });
    expect(patchBodies()).toEqual([]);
  });

  it("uploads the local choice when the server has none", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: "light", palette: "univalle" }));
    await act(async () => {
      renderWith(<ThemePreferenceSync />, {});
    });

    await waitFor(() => expect(patchBodies()).toEqual([{ themeMode: "light", themePalette: "univalle" }]), LAZY_REQUEST_WAIT);
  });
});
