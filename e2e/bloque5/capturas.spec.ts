/*
* Funcionalidad: Screenshots of Block 5 (visual regression against July)
* Descripción: Only with E2E_CAPTURES=1. (1) Writes PNG screenshots to docs/bloque5/capturas/ (E2E_CAPTURES_DIR overrides) of the screens of docs/bloque5/propuesta/lado-a-lado/, with the same names, at the size of the July references of docs/bloque5/referencias-julio/ (1280×720 and 1920×1080, deviceScaleFactor 1, viewport captures), so each one pairs with its July capture and its mock-up render: login (no session), the expanded sidebar of the student (/learn, Inicio) and of the teacher (/learn), the collapsed sidebar of both with the tooltip of an item, Monitoreo digital (FREE session "Aleatorio" after a few breaths, with one pending change of the rate) and Real (reservation, connected with control, no device data on the local stack), the "Asesoría IA" drawer (July 08), the curriculum (/learn Currículo), the student evaluations (/evaluations), the staff panel dashboard (/teacher) and the profile (July 14). (2) Regenerates the Monitoreo captures of Block 1 in docs/bloque1/capturas/ (E2E_CAPTURES_B1_DIR overrides) with the July layout: the long case with the case drawer open at 1280, 1440 and 1920, the case hidden at 1920, the Real monitor at 1280, 1440 and 1920, and the 1920 set "nuevo-monitoreo-*" (empty guide, digital "Pulmón normal: postoperatorio inmediato", the session result, Real without data). The ventilator is freed through the admin API before reserving and the reservation is released afterwards. It asserts only what it needs to frame each capture. v0.1 (Bloque 5, W5-2): first version. Depends on @playwright/test and the auth, backend API, panel and simulator e2e helpers. v0.2 (Ajustes A, A1): the digital Monitoreo capture shows the rate change applied on its own (no pending counter any more).
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { STUDENT_STORAGE_STATE, TEACHER_STORAGE_STATE } from "../support/auth";
import { ADMIN_EMAIL, freeVentilator, staffSession } from "../support/panel";
import {
  connectToVentilator,
  finishWorkspaceSession,
  LONG_CASE_TITLE,
  openRealMonitor,
  releaseReservation,
  reserveNow,
  simulatedSeconds,
  startPatientSession,
} from "../support/simulator";

const OUT_DIR = process.env.E2E_CAPTURES_DIR ?? "docs/bloque5/capturas";
const B1_DIR = process.env.E2E_CAPTURES_B1_DIR ?? "docs/bloque1/capturas";
const VIEWPORTS = [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }] as const;
const SIDEBAR_KEY = "ventylab.sidebar.collapsed";

test.skip(process.env.E2E_CAPTURES !== "1", "screenshots only with E2E_CAPTURES=1");
test.describe.configure({ mode: "serial" });

type Viewport = { width: number, height: number };

async function shot(page: Page, dir: string, name: string): Promise<void> {
  mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(dir, `${name}.png`), fullPage: false, animations: "disabled" });
}

async function contextOf(browser: Browser, storageState: string | undefined, viewport: Viewport, collapsed = false) {
  const context = await browser.newContext({
    ...(storageState === undefined ? { storageState: { cookies: [], origins: [] } } : { storageState }),
    viewport,
    deviceScaleFactor: 1,
  });

  await context.addInitScript(({ key, value }) => {
    try {
      if (value) {
        window.localStorage.setItem(key, "1");
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage blocked: the sidebar keeps its default.
    }
  }, { key: SIDEBAR_KEY, value: collapsed });

  return context;
}

async function openLearn(page: Page, tab: "inicio" | "curriculo"): Promise<void> {
  await page.goto(`/learn?tab=${tab}`);
  await expect(page.getByRole("heading", { name: "Aprender", level: 1 })).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle");
}

/** A few simulated breaths, so the value cards and the curves show data. */
async function waitForBreaths(page: Page): Promise<void> {
  await expect.poll(() => simulatedSeconds(page), { timeout: 30_000 }).toBeGreaterThanOrEqual(8);
}

async function hoverNavItem(page: Page, name: string): Promise<void> {
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name }).hover();
  await expect(page.getByRole("tooltip", { name })).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  const size = viewport.width;

  test(`Block 5 shell and pages at ${size}`, async ({ browser }) => {
    test.setTimeout(240_000);

    // Login without a session.
    const anonymous = await contextOf(browser, undefined, viewport);
    const login = await anonymous.newPage();

    await login.goto("/auth/login");
    await expect(login.getByRole("button", { name: "Iniciar sesión", exact: true })).toBeVisible({ timeout: 30_000 });
    await shot(login, OUT_DIR, `01-login-${size}`);
    await anonymous.close();

    // Student: expanded sidebar, curriculum, evaluations, profile; then collapsed.
    const student = await contextOf(browser, STUDENT_STORAGE_STATE, viewport);
    const page = await student.newPage();

    await openLearn(page, "inicio");
    await shot(page, OUT_DIR, `02-sidebar-expandido-estudiante-${size}`);
    await openLearn(page, "curriculo");
    await shot(page, OUT_DIR, `10-ensenanza-curriculo-${size}`);
    await page.goto("/evaluations");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");
    await shot(page, OUT_DIR, `12-evaluacion-estudiante-${size}`);
    await page.goto("/profile");
    await expect(page.getByRole("tab", { name: "Información personal" })).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");
    await shot(page, OUT_DIR, `14-perfil-${size}`);
    await student.close();

    const studentCollapsed = await contextOf(browser, STUDENT_STORAGE_STATE, viewport, true);
    const collapsedPage = await studentCollapsed.newPage();

    await openLearn(collapsedPage, "inicio");
    await expect(collapsedPage.getByRole("button", { name: "Expandir menú" })).toBeVisible();
    await hoverNavItem(collapsedPage, "Módulo de Enseñanza");
    await shot(collapsedPage, OUT_DIR, `03-sidebar-colapsado-estudiante-${size}`);
    await studentCollapsed.close();

    // Teacher: expanded and collapsed sidebar on /learn, then the staff panel.
    const teacher = await contextOf(browser, TEACHER_STORAGE_STATE, viewport);
    const teacherPage = await teacher.newPage();

    await openLearn(teacherPage, "curriculo");
    await shot(teacherPage, OUT_DIR, `02b-sidebar-expandido-docente-${size}`);
    await teacherPage.goto("/teacher");
    await expect(teacherPage.getByRole("region", { name: "Estudiantes recientes" })).toBeVisible({ timeout: 30_000 });
    await teacherPage.waitForLoadState("networkidle");
    await shot(teacherPage, OUT_DIR, `13-panel-docente-${size}`);
    await teacher.close();

    const teacherCollapsed = await contextOf(browser, TEACHER_STORAGE_STATE, viewport, true);
    const teacherCollapsedPage = await teacherCollapsed.newPage();

    await openLearn(teacherCollapsedPage, "curriculo");
    await hoverNavItem(teacherCollapsedPage, "Panel docente");
    await shot(teacherCollapsedPage, OUT_DIR, `03b-sidebar-colapsado-docente-${size}`);
    await teacherCollapsed.close();
  });

  test(`Block 5 Monitoreo at ${size}`, async ({ browser, request }) => {
    test.setTimeout(240_000);
    const admin = await staffSession(request, ADMIN_EMAIL);
    const context = await contextOf(browser, STUDENT_STORAGE_STATE, viewport);
    const page = await context.newPage();

    // Digital after a change of the rate (two steps up, applied on its own since Ajustes A).
    await startPatientSession(page);
    await waitForBreaths(page);
    const rate = page.getByRole("complementary", { name: "Controles" }).getByRole("spinbutton", { name: "Frecuencia respiratoria" });
    const initialRate = Number(await rate.getAttribute("aria-valuenow"));

    await rate.focus();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect.poll(async () => Number(await rate.getAttribute("aria-valuenow"))).toBe(initialRate + 2);
    await page.mouse.move(viewport.width / 2, 8);
    await shot(page, OUT_DIR, `05-monitoreo-digital-${size}`);
    await page.keyboard.press("Escape");

    // The "Asesoría IA" drawer (July 08).
    await page.getByRole("button", { name: "Asesoría IA", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "Asesoría IA" })).toBeVisible();
    await shot(page, OUT_DIR, `08-simulador-asesoria-ia-${size}`);
    await page.keyboard.press("Escape");
    await finishWorkspaceSession(page);

    // Real: reserved, connected with control, no device data locally.
    await freeVentilator(admin.api);
    await reserveNow(page);

    try {
      await connectToVentilator(page);
      await openRealMonitor(page);
      await shot(page, OUT_DIR, `05r-monitoreo-real-${size}`);
    } finally {
      await releaseReservation(page);
      await context.close();
    }
  });
}

test("Block 1 Monitoreo captures with the July layout", async ({ browser, request }) => {
  test.setTimeout(300_000);
  const admin = await staffSession(request, ADMIN_EMAIL);
  const sizes: Viewport[] = [{ width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }];
  const full = sizes[2] as Viewport;
  const context = await contextOf(browser, STUDENT_STORAGE_STATE, full);
  const page = await context.newPage();

  // Empty guide (no session yet).
  await page.goto("/simulador?tab=monitoreo");
  await expect(page.getByRole("link", { name: "Ir a Simular Paciente" }).or(page.getByRole("button", { name: "Ir a Simular Paciente" }))).toBeVisible({ timeout: 30_000 });
  await shot(page, B1_DIR, "nuevo-monitoreo-guia-vacia");

  // Digital, normal lung case, then the result dialog.
  await startPatientSession(page, { caseTitle: "Pulmón normal: postoperatorio inmediato" });
  await waitForBreaths(page);
  await shot(page, B1_DIR, "nuevo-monitoreo-digital");
  await finishWorkspaceSession(page);
  await shot(page, B1_DIR, "nuevo-monitoreo-resultado");

  // The long case with the case drawer open, at three widths; hidden at 1920.
  await startPatientSession(page, { caseTitle: LONG_CASE_TITLE });
  await waitForBreaths(page);
  await page.getByRole("button", { name: "Mostrar caso clínico" }).click();
  await expect(page.getByRole("complementary", { name: "Caso clínico" })).toBeVisible();
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await shot(page, B1_DIR, `monitoreo-digital-caso-largo-${viewport.width}`);
  }

  await page.keyboard.press("Escape");
  await expect(page.getByRole("complementary", { name: "Caso clínico" })).toHaveCount(0);
  await shot(page, B1_DIR, "monitoreo-digital-caso-oculto-1920");
  await finishWorkspaceSession(page);

  // Real without device data, at three widths.
  await freeVentilator(admin.api);
  await reserveNow(page);

  try {
    await connectToVentilator(page);
    await openRealMonitor(page);
    await shot(page, B1_DIR, "nuevo-monitoreo-real-sin-datos");
    for (const viewport of sizes) {
      await page.setViewportSize(viewport);
      await shot(page, B1_DIR, `monitoreo-real-${viewport.width}`);
    }
  } finally {
    await page.setViewportSize(full);
    await releaseReservation(page);
    await context.close();
  }
});
