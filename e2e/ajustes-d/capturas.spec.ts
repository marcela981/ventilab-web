/*
* Funcionalidad: Visual stop captures of the themes (Ajustes D)
* Descripción: Screenshots for Marcela's visual approval of D3/D4 (ENCARGO, BLOQUE D, "PARADA VISUAL"): the four combinations (VentyLab and Univalle × light and dark) of the login, the student sidebar (/learn, drawer open at 375 px), Monitoreo (/simulador?tab=monitoreo with a running digital session), Enseñanza (/learn?tab=curriculo) and the staff Panel (/teacher), at 1280×720 and 375×812, into docs/cierre/propuesta-visual/ (README.md indexes them). The combination is set in localStorage ventylab.theme.v1 before the first paint, as a returning user would have it, and on the server for the demo student and teacher (PATCH /api/users/me; left on VentyLab dark at the end). Only with E2E_CAPTURES=1. Needs the local stack (E2E_BASE_URL).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { type APIRequestContext, type Browser, expect, type Page, test } from "@playwright/test";
import { STUDENT_STORAGE_STATE, TEACHER_STORAGE_STATE } from "../support/auth";
import { backendApiAs } from "../support/backend-api";
import { finishWorkspaceSession, simulatedSeconds, startPatientSession } from "../support/simulator";

const OUT_DIR = process.env.E2E_CAPTURES_DIR ?? "docs/cierre/propuesta-visual";
const VIEWPORTS = [{ width: 1280, height: 720 }, { width: 375, height: 812 }] as const;
const COMBINATIONS = [
  { palette: "ventylab", mode: "light" },
  { palette: "ventylab", mode: "dark" },
  { palette: "univalle", mode: "light" },
  { palette: "univalle", mode: "dark" },
] as const;

type Viewport = { width: number, height: number };
type Combination = (typeof COMBINATIONS)[number];

test.skip(process.env.E2E_CAPTURES !== "1", "screenshots only with E2E_CAPTURES=1");
test.describe.configure({ mode: "serial" });

/** The signed-in users also get the combination on the server (their preference wins over the browser one). */
async function setServerPreference(request: APIRequestContext, mode: string, palette: string): Promise<void> {
  for (const state of [STUDENT_STORAGE_STATE, TEACHER_STORAGE_STATE]) {
    const api = await backendApiAs(request, state);
    await api.call("PATCH", "/api/users/me", { themeMode: mode, themePalette: palette });
  }
}

// Leave the demo users with the default look (VentyLab dark) for the other specs.
test.afterAll(async ({ request }) => {
  await setServerPreference(request, "dark", "ventylab");
});

async function contextOf(browser: Browser, storageState: string | undefined, viewport: Viewport, combination: Combination) {
  const context = await browser.newContext({
    ...(storageState === undefined ? { storageState: { cookies: [], origins: [] } } : { storageState }),
    viewport,
    deviceScaleFactor: 1,
  });
  await context.addInitScript(({ value }) => {
    try {
      window.localStorage.setItem("ventylab.theme.v1", value);
      window.localStorage.removeItem("ventylab.sidebar.collapsed");
    } catch {
      // Storage blocked: the system mode and VentyLab are shown.
    }
  }, { value: JSON.stringify(combination) });
  return context;
}

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: false, animations: "disabled" });
}

for (const viewport of VIEWPORTS) {
  for (const combination of COMBINATIONS) {
    const suffix = `${combination.palette}-${combination.mode === "light" ? "claro" : "oscuro"}-${viewport.width}`;

    test(`captures ${suffix}`, async ({ browser, request }) => {
      test.setTimeout(240_000);
      await setServerPreference(request, combination.mode, combination.palette);
      const mobile = viewport.width < 900;

      const anonymous = await contextOf(browser, undefined, viewport, combination);
      const login = await anonymous.newPage();
      await login.goto("/auth/login");
      await expect(login.getByRole("button", { name: "Iniciar sesión", exact: true })).toBeVisible({ timeout: 30_000 });
      await shot(login, `01-login-${suffix}`);
      await anonymous.close();

      const student = await contextOf(browser, STUDENT_STORAGE_STATE, viewport, combination);
      const page = await student.newPage();
      await page.goto("/learn?tab=curriculo");
      await expect(page.getByRole("heading", { name: "Aprender", level: 1 })).toBeVisible({ timeout: 30_000 });
      await shot(page, `03-ensenanza-${suffix}`);
      if (mobile) {
        await page.getByRole("button", { name: "Abrir menú de navegación" }).click();
        await expect(page.getByRole("group", { name: "Apariencia" })).toBeVisible();
      }
      await shot(page, `02-sidebar-${suffix}`);
      // A running digital session, so the console shows the curves and the values.
      await startPatientSession(page);
      await expect.poll(() => simulatedSeconds(page), { timeout: 30_000 }).toBeGreaterThanOrEqual(8);
      await shot(page, `04-monitoreo-${suffix}`);
      await finishWorkspaceSession(page);
      await student.close();

      const teacher = await contextOf(browser, TEACHER_STORAGE_STATE, viewport, combination);
      const panel = await teacher.newPage();
      await panel.goto("/teacher");
      await expect(panel.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
      await shot(panel, `05-panel-${suffix}`);
      await teacher.close();
    });
  }
}
