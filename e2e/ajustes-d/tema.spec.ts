/*
* Funcionalidad: E2E of the themes (mode × palette) and the auth pages
* Descripción: DISENO_AJUSTES_D §6 and D6. (1) The student changes the mode and the palette from the "Apariencia" group of the sidebar: <html> changes at once, the choice survives a reload and is applied before the app hydrates, and it follows the user to a browser without it (server preference of GET /api/auth/me); the test restores VentyLab dark at the end. (2) The login renders in the four combinations: data-mui-color-scheme and data-palette are already set when <body> is parsed and at DOMContentLoaded (public/theme-init.js, no flash) and the resolved tokens (surface, text, primary, accent, console base) are the ones of theme-palettes.ts. (3) Password recovery in the browser: the forgot page answers with the same notice and an unknown reset token offers a new link (the token round trip is covered by the server e2e password-reset.e2e-spec.ts, mailpit is not part of the stack). Needs the local stack (E2E_BASE_URL).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Page, test } from "@playwright/test";
import { THEME_SCHEMES, type ThemeMode, type ThemePaletteId } from "../../src/shared/design-system/theme/theme-palettes";
import { STUDENT_STORAGE_STATE } from "../support/auth";

const THEME_KEY = "ventylab.theme.v1";
const COMBINATIONS: ReadonlyArray<[ThemePaletteId, ThemeMode]> = [
  ["ventylab", "light"],
  ["ventylab", "dark"],
  ["univalle", "light"],
  ["univalle", "dark"],
];

async function htmlTheme(page: Page) {
  return await page.evaluate(() => ({
    mode: document.documentElement.getAttribute("data-mui-color-scheme"),
    palette: document.documentElement.getAttribute("data-palette"),
  }));
}

/** Records the <html> attributes when <body> is inserted and at DOMContentLoaded (before React hydrates). */
async function recordEarlyTheme(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const read = () => ({
      mode: document.documentElement.getAttribute("data-mui-color-scheme"),
      palette: document.documentElement.getAttribute("data-palette"),
    });
    const target = window as unknown as Record<string, unknown>;
    document.addEventListener("DOMContentLoaded", () => {
      target.__themeAtDcl = read();
    });
    // The init script runs before <html> exists: watch the whole document for the <body>.
    const observer = new MutationObserver(() => {
      if (document.body && !target.__themeAtBody) {
        target.__themeAtBody = read();
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
}

function appearance(page: Page) {
  return page.getByRole("group", { name: "Apariencia" });
}

async function choose(page: Page, mode: "Claro" | "Oscuro", palette: "VentyLab" | "Univalle"): Promise<void> {
  await appearance(page).getByRole("button", { name: mode }).click();
  await appearance(page).getByRole("button", { name: palette }).click();
}

test.describe("sidebar appearance", () => {
  test.use({ storageState: STUDENT_STORAGE_STATE, viewport: { width: 1280, height: 720 } });

  test("changing mode and palette persists after reload and follows the user", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await page.goto("/learn");
    await expect(appearance(page)).toBeVisible({ timeout: 30_000 });

    await choose(page, "Claro", "Univalle");
    await expect.poll(() => htmlTheme(page)).toEqual({ mode: "light", palette: "univalle" });
    await expect(appearance(page).getByRole("button", { name: "Univalle" })).toHaveAttribute("aria-pressed", "true");

    await recordEarlyTheme(page);
    await page.reload();
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__themeAtDcl)).toEqual({ mode: "light", palette: "univalle" });
    await expect(appearance(page).getByRole("button", { name: "Claro" })).toHaveAttribute("aria-pressed", "true");

    // A browser without the local choice gets it from the server once the session loads.
    const other = await browser.newContext({ storageState: STUDENT_STORAGE_STATE, viewport: { width: 1280, height: 720 } });
    await other.addInitScript((key) => {
      if (!window.sessionStorage.getItem("theme-cleared")) {
        window.localStorage.removeItem(key);
        window.sessionStorage.setItem("theme-cleared", "1");
      }
    }, THEME_KEY);
    const second = await other.newPage();
    await second.goto("/learn");
    await expect.poll(() => htmlTheme(second), { timeout: 30_000 }).toEqual({ mode: "light", palette: "univalle" });
    await other.close();

    // Restore the default look of the demo student for the other specs.
    await choose(page, "Oscuro", "VentyLab");
    await expect.poll(() => htmlTheme(page)).toEqual({ mode: "dark", palette: "ventylab" });
    await page.waitForLoadState("networkidle");
  });
});

test.describe("login in the four combinations", () => {
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1280, height: 720 } });

  for (const [paletteId, mode] of COMBINATIONS) {
    test(`${paletteId} ${mode}: no flash and the tokens of theme-palettes`, async ({ page }) => {
      await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), { key: THEME_KEY, value: JSON.stringify({ mode, palette: paletteId }) });
      await recordEarlyTheme(page);
      await page.goto("/auth/login");

      const early = await page.evaluate(() => {
        const target = window as unknown as Record<string, unknown>;
        return { body: target.__themeAtBody, dcl: target.__themeAtDcl };
      });
      expect(early).toEqual({ body: { mode, palette: paletteId }, dcl: { mode, palette: paletteId } });

      await expect(page.getByRole("heading", { level: 1, name: "Iniciar sesión" })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole("textbox", { name: "Correo electrónico" })).toBeVisible();
      await expect(page.getByText("o con tu correo")).toBeVisible();
      expect(await htmlTheme(page)).toEqual({ mode, palette: paletteId });

      const scheme = THEME_SCHEMES[paletteId][mode];
      const resolved = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        const value = (name: string) => style.getPropertyValue(name).trim().toLowerCase();
        return {
          surface: value("--mui-palette-background-paper"),
          text: value("--mui-palette-text-primary"),
          primary: value("--mui-palette-primary-main"),
          accent: value("--vl-color-accent"),
          console: value("--vl-console-bg"),
        };
      });
      expect(resolved).toEqual({
        surface: scheme.mui.background.paper,
        text: scheme.mui.text.primary,
        primary: scheme.mui.primary.main,
        accent: scheme.tokens["--vl-color-accent"],
        console: scheme.tokens["--vl-console-bg"],
      });
    });
  }
});

test.describe("password recovery pages", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the forgot page answers with the same notice and an unknown token offers a new link", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Recuperar contraseña" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("textbox", { name: "Correo electrónico" }).fill(`nadie-${Date.now()}@ventylab.test`);
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(page.getByText(/te enviamos un enlace para restablecerla/)).toBeVisible({ timeout: 30_000 });

    await page.goto("/auth/reset-password?token=desconocido");
    await page.getByLabel(/^Nueva contraseña/).fill("Nueva-Clave-2026");
    await page.getByLabel(/^Confirmar contraseña/).fill("Nueva-Clave-2026");
    await page.getByRole("button", { name: "Restablecer contraseña" }).click();
    await expect(page.getByText(/no es válido o ya venció/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute("href", "/auth/forgot-password");
  });
});
