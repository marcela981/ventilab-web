/*
* Funcionalidad: E2E keyboard of the July Monitoreo console (Bloque 5, W5-1)
* Descripción: The pending edits of the July console with the keyboard (DISENO_BLOQUE5 §6.8, hint "Esc: cancelar · Enter: confirmar") on a FREE session (Simular Paciente → "Aleatorio") at 1280×720: ArrowUp on the PEEP spinbutton makes one pending change ("1 cambio pendiente", Confirmar enabled), Enter confirms it (back to "Sin cambios pendientes" with the new value kept); another ArrowUp then Escape drops the pending edit and restores the confirmed value. The Real variant (Enter opens the summary, Escape closes it keeping the edits) needs device telemetry, which the local stack does not have (the Real console stays read-only without data), so it is covered by the component tests only. The session is finished at the end. v0.1 (Bloque 5, W5-1): first version. Depends on @playwright/test and the simulator e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { COMPACT_VIEWPORT, finishWorkspaceSession, startPatientSession } from "../support/simulator";

test.use({ viewport: COMPACT_VIEWPORT });

test("Enter confirms and Escape cancels the pending edits", async ({ page }) => {
  test.setTimeout(180_000);
  await startPatientSession(page);
  const values = page.getByRole("region", { name: "Valores" });
  const pending = values.getByRole("status").filter({ hasText: /^(Sin cambios pendientes|\d+ cambios? pendientes?)$/ });
  const confirm = values.getByRole("button", { name: "Confirmar" });
  const peep = page.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" });

  await expect(page.getByText("Esc: cancelar · Enter: confirmar")).toBeVisible();
  await expect(pending).toHaveText("Sin cambios pendientes");
  const initial = Number(await peep.getAttribute("aria-valuenow"));

  // Enter confirms.
  await peep.focus();
  await page.keyboard.press("ArrowUp");
  await expect(pending).toHaveText("1 cambio pendiente");
  await expect(confirm).toBeEnabled();
  const edited = Number(await peep.getAttribute("aria-valuenow"));

  expect(edited).toBeGreaterThan(initial);
  await page.keyboard.press("Enter");
  await expect(pending).toHaveText("Sin cambios pendientes", { timeout: 15_000 });
  await expect(confirm).toBeDisabled();
  await expect.poll(async () => Number(await peep.getAttribute("aria-valuenow"))).toBe(edited);

  // Escape cancels and restores the confirmed value.
  await peep.focus();
  await page.keyboard.press("ArrowUp");
  await expect(pending).toHaveText("1 cambio pendiente");
  expect(Number(await peep.getAttribute("aria-valuenow"))).toBeGreaterThan(edited);
  await page.keyboard.press("Escape");
  await expect(pending).toHaveText("Sin cambios pendientes");
  await expect.poll(async () => Number(await peep.getAttribute("aria-valuenow"))).toBe(edited);

  await finishWorkspaceSession(page);
});
