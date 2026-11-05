/*
* Funcionalidad: Bloque A E2E — reference captures of the curves and the Monitoreo layout
* Descripción: Screenshots for the content validation register (docs/bloque-a/capturas/, only with E2E_CAPTURES=1):
*   the July console curves at 1920×1080 in VCV (normal lung), PCV and PSV (the same session after the mode changes,
*   which apply on their own) and an auto-PEEP case (COPD exacerbation with the rate raised to 30 rpm), each after
*   enough simulated time for steady breaths; and the digital Monitoreo at 1280×720 and 1920×1080 to check the
*   smaller VentyLab logo next to the curves. Every session ends through "Finalizar sesión". Depends on
*   @playwright/test and the e2e support helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { NORMAL_CASE_ID, startCaseSession, stepTo } from "../support/bloque-a";
import { COMPACT_VIEWPORT, finishWorkspaceSession, SIMULATOR_VIEWPORT } from "../support/simulator";

const OUT_DIR = process.env.E2E_CAPTURES_DIR ?? "docs/bloque-a/capturas";
const COPD_CASE_ID = "engine-copd-exacerbation";
/** Wall time for several steady breaths after a change (the curves window is 10 s). */
const SETTLE_MS = 12_000;

test.skip(process.env.E2E_CAPTURES !== "1", "screenshots only with E2E_CAPTURES=1");
test.describe.configure({ mode: "serial" });

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: false, animations: "disabled" });
}

async function closeResult(page: Page): Promise<void> {
  const result = await finishWorkspaceSession(page);

  await result.getByRole("button", { name: "Cerrar" }).click();
  await expect(result).toBeHidden();
}

test("curves in VCV, PCV and PSV at 1920×1080", async ({ page, request }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(SIMULATOR_VIEWPORT);
  await startCaseSession(page, request, NORMAL_CASE_ID);
  const modes = page.getByRole("group", { name: "Modo ventilatorio" });

  await page.waitForTimeout(SETTLE_MS);
  await shot(page, "curvas-vcv-1920");

  await modes.getByRole("button", { name: "Presión control" }).click();
  await expect(modes.getByRole("button", { name: "Presión control" })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(SETTLE_MS);
  await shot(page, "curvas-pcv-1920");

  await page.getByRole("button", { name: /^Más modos/ }).click();
  await page.getByRole("menuitemradio", { name: /^PSV/ }).click();
  await expect(page.getByRole("button", { name: /^Más modos/ })).toContainText("PSV");
  await page.waitForTimeout(SETTLE_MS);
  await shot(page, "curvas-psv-1920");

  await closeResult(page);
});

test("auto-PEEP in the COPD exacerbation at a high rate, 1920×1080", async ({ page, request }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(SIMULATOR_VIEWPORT);
  await startCaseSession(page, request, COPD_CASE_ID);

  await stepTo(page, "Frecuencia respiratoria", 30);
  await page.waitForTimeout(SETTLE_MS);
  await shot(page, "curvas-auto-peep-1920");

  await closeResult(page);
});

for (const viewport of [COMPACT_VIEWPORT, SIMULATOR_VIEWPORT]) {
  test(`Monitoreo layout at ${viewport.width}×${viewport.height}`, async ({ page, request }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await startCaseSession(page, request, NORMAL_CASE_ID);
    await expect(page.getByRole("img", { name: "VentyLab" }).first()).toBeVisible();

    await page.waitForTimeout(SETTLE_MS);
    await shot(page, `monitoreo-${viewport.width}`);

    await closeResult(page);
  });
}
