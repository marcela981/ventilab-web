/*
* Funcionalidad: E2E keyboard of the July Monitoreo console (Bloque 5, W5-1)
* Descripción: The keyboard of the July console with the explicit Enviar on a FREE session (Simular Paciente → "Aleatorio") at 1280×720: the hint "Esc: descartar · Enter: enviar"; ArrowUp on the PEEP spinbutton leaves a pending change (counter "1 cambio pendiente") that nothing applies on its own; Escape drops it; a rate slider step plus Enter sends it and the counter goes back to "Sin cambios pendientes". The Real variant needs device telemetry, which the local stack does not have, so it is covered by the component tests. The session is finished at the end. v0.1 (Bloque 5, W5-1): first version. v0.2 (Ajustes A, A1): rewritten for the automatic application. v0.3 (2026-11-10, reverts A-1 to A-4): rewritten for the explicit Enviar (Escape drops, Enter sends).
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { COMPACT_VIEWPORT, finishWorkspaceSession, startPatientSession } from "../support/simulator";

test.use({ viewport: COMPACT_VIEWPORT });

test("edits wait for Enviar; Escape drops them and Enter sends them", async ({ page }) => {
  test.setTimeout(180_000);
  await startPatientSession(page);
  const values = page.getByRole("region", { name: "Valores" });
  const peep = page.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" });
  const rate = page.getByRole("complementary", { name: "Controles" }).getByRole("slider", { name: "Frecuencia respiratoria" });
  const rateValue = async () => Number(await rate.inputValue());

  await expect(page.getByText("Esc: descartar · Enter: enviar")).toBeVisible();

  // A key on a spinbutton leaves a pending change; nothing applies it on its own.
  const initial = Number(await peep.getAttribute("aria-valuenow"));

  await peep.focus();
  await page.keyboard.press("ArrowUp");
  expect(Number(await peep.getAttribute("aria-valuenow"))).toBeGreaterThan(initial);
  await expect(values.getByText("1 cambio pendiente")).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(values.getByText("1 cambio pendiente")).toBeVisible();

  // Escape drops it.
  await page.keyboard.press("Escape");
  await expect.poll(async () => Number(await peep.getAttribute("aria-valuenow"))).toBe(initial);
  await expect(values.getByText("Sin cambios pendientes")).toBeVisible();

  // A slider step plus Enter sends it; it stays.
  const before = await rateValue();

  await rate.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(values.getByText("Sin cambios pendientes")).toBeVisible();
  await page.waitForTimeout(1000);
  expect(await rateValue()).toBeGreaterThan(before);

  await finishWorkspaceSession(page);
});
