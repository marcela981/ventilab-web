/*
* Funcionalidad: E2E keyboard of the July Monitoreo console (Bloque 5, W5-1)
* Descripción: The keyboard of the July console with the automatic application (DISENO_AJUSTES_A §3.1, A-4) on a FREE session (Simular Paciente → "Aleatorio") at 1280×720: no Confirmar nor keyboard hint; ArrowUp on the PEEP spinbutton applies at once and the value stays; Escape right after a step of the rate slider (inside its 300 ms debounce) drops it, and Enter right after another step applies it now. The Real variant (the 500 ms auto-send) needs device telemetry, which the local stack does not have (the Real console stays read-only without data), so it is covered by the component tests only. The session is finished at the end. v0.1 (Bloque 5, W5-1): first version. v0.2 (Ajustes A, A1): rewritten for the automatic application (it covered Confirmar / Cancelar). Depends on @playwright/test and the simulator e2e helpers.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { COMPACT_VIEWPORT, finishWorkspaceSession, startPatientSession } from "../support/simulator";

test.use({ viewport: COMPACT_VIEWPORT });

test("edits apply on their own; Enter applies and Escape drops a slider change still debouncing", async ({ page }) => {
  test.setTimeout(180_000);
  await startPatientSession(page);
  const peep = page.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" });
  const rate = page.getByRole("complementary", { name: "Controles" }).getByRole("slider", { name: "Frecuencia respiratoria" });
  const rateValue = async () => Number(await rate.inputValue());

  // No confirmation UI any more (Ajustes A).
  await expect(page.getByRole("button", { name: "Confirmar" })).toHaveCount(0);
  await expect(page.getByText("Esc: cancelar · Enter: confirmar")).toHaveCount(0);

  // A key on a spinbutton applies at once and the value stays.
  const initial = Number(await peep.getAttribute("aria-valuenow"));

  await peep.focus();
  await page.keyboard.press("ArrowUp");
  const edited = Number(await peep.getAttribute("aria-valuenow"));

  expect(edited).toBeGreaterThan(initial);
  await page.waitForTimeout(1000);
  await expect.poll(async () => Number(await peep.getAttribute("aria-valuenow"))).toBe(edited);

  // Escape right after a slider step (inside its 300 ms debounce) drops it.
  const before = await rateValue();

  await rate.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect.poll(rateValue).toBe(before);
  await page.waitForTimeout(1000);
  expect(await rateValue()).toBe(before);

  // Enter right after a slider step applies it now; it stays.
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  expect(await rateValue()).toBeGreaterThan(before);

  await finishWorkspaceSession(page);
});
