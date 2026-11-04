/*
* Funcionalidad: E2E "Asesoría IA" drawer of the July Monitoreo (Bloque 5, W5-1)
* Descripción: On a FREE session (Simular Paciente → "Aleatorio") at 1920×1080: the round "Asesoría IA" launcher next to the mode toggle (aria-label, Psychology icon) opens the non-modal `complementary "Asesoría IA"` drawer of 380 px ±1 (aria-expanded on the launcher), the focus moves into the drawer, the console keeps its size and the curves keep painting. "Solicitar asesoría" streams the answer of the fake LLM (scripts/e2e/fake-llm.mjs through the backend OPENAI_BASE_URL, nothing stubbed in the browser) and "Sí, fue útil" saves the rating (PUT /api/ai-ratings). The drawers are exclusive: "Mostrar caso clínico" (reached with the keyboard, the drawer overlays the right end of the strip) replaces the AI drawer with "Caso clínico". Escape closes the open drawer and returns the focus to the button that opened it. The session is finished at the end. v0.1 (Bloque 5, W5-1): first version. Depends on @playwright/test and the simulator and layout order e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Locator, test } from "@playwright/test";
import { boxOf, TOLERANCE_PX } from "../support/layout-order";
import { curvesSignature, finishWorkspaceSession, SIMULATOR_VIEWPORT, startPatientSession } from "../support/simulator";

test.use({ viewport: SIMULATOR_VIEWPORT });

// Marker of the fake provider answer (scripts/e2e/fake-llm-core.mjs).
const FAKE_ANSWER = "Respuesta de prueba (proveedor falso de E2E).";

async function focusIsInside(drawer: Locator): Promise<boolean> {
  return drawer.evaluate((element) => element.contains(document.activeElement));
}

test("Asesoría IA opens a 380 px drawer, answers with the fake LLM and gives the focus back", async ({ page }) => {
  test.setTimeout(180_000);
  await startPatientSession(page);
  const consoleZone = page.getByRole("region", { name: "Consola del ventilador" });
  const launcher = page.getByRole("complementary", { name: "Controles" }).getByRole("button", { name: "Asesoría IA", exact: true });

  await expect(launcher).toHaveAttribute("aria-label", "Asesoría IA");
  await expect(launcher.locator("svg")).toHaveCount(1);
  await expect(launcher).toHaveAttribute("aria-expanded", "false");
  const consoleBox = await boxOf(consoleZone, "console");

  await launcher.click();
  const drawer = page.getByRole("complementary", { name: "Asesoría IA" });

  await expect(drawer).toBeVisible();
  await expect(launcher).toHaveAttribute("aria-expanded", "true");
  expect(Math.abs((await boxOf(drawer, "AI drawer")).width - 380)).toBeLessThanOrEqual(TOLERANCE_PX);
  await expect.poll(() => focusIsInside(drawer)).toBe(true);
  expect(await boxOf(consoleZone, "console")).toEqual(consoleBox);

  // The simulation keeps running under the non-modal drawer.
  const before = await curvesSignature(page);

  await expect.poll(() => curvesSignature(page), { timeout: 10_000 }).not.toBe(before);

  // Answer from the fake LLM, then the rating.
  await drawer.getByRole("button", { name: "Solicitar asesoría" }).click();
  await expect(drawer).toContainText(FAKE_ANSWER.replace(/\*/g, ""), { timeout: 60_000 });
  const helpful = drawer.getByRole("button", { name: "Sí, fue útil" });

  await expect(helpful).toBeEnabled({ timeout: 30_000 });
  const ratingResponse = page.waitForResponse((res) => res.request().method() === "PUT" && res.url().endsWith("/api/ai-ratings"));

  await helpful.click();
  expect((await ratingResponse).ok()).toBe(true);
  await expect(helpful).toHaveAttribute("aria-pressed", "true");

  // Exclusive drawers: the clinical case replaces the AI drawer. The 380 px drawer overlays the right end of the
  // session strip (non-modal, fixed), so the strip button is reached with the keyboard.
  const showCase = page.getByRole("button", { name: "Mostrar caso clínico" });

  await showCase.focus();
  await page.keyboard.press("Enter");
  const caseDrawer = page.getByRole("complementary", { name: "Caso clínico" });

  await expect(caseDrawer).toBeVisible();
  await expect(drawer).toHaveCount(0);
  await expect(launcher).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Escape");
  await expect(caseDrawer).toHaveCount(0);
  await expect(showCase).toBeFocused();

  // Escape closes the AI drawer and returns the focus to the launcher.
  await launcher.click();
  await expect(drawer).toBeVisible();
  await expect.poll(() => focusIsInside(drawer)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(launcher).toBeFocused();

  await finishWorkspaceSession(page);
});
