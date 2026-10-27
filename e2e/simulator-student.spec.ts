/*
* Funcionalidad: E2E student flow of the unified simulator
* Descripción: The student signs in (saved session), opens /simulador, fills Simular Paciente with "Aleatorio" plus a unique name and sends it to Monitoreo; the curves canvas keeps changing its pixels and the chip says "Simulando"; switching to Conexión and back keeps the same ?session and the simulated clock keeps advancing (the session lives above the tabs); "Finalizar sesión" opens the result dialog; Mis sesiones lists the session and opens its replay inside the panel in read-only mode. Depends on @playwright/test and the e2e support helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { curvesSignature, finishWorkspaceSession, simulatedSeconds, startPatientSession, SIMULATOR_VIEWPORT, workspaceTab } from "./support/simulator";

test.use({ viewport: SIMULATOR_VIEWPORT });

test("student simulates a patient, keeps the session across tabs, finishes it and replays it from Mis sesiones", async ({ page }) => {
  test.setTimeout(180_000);
  const patientName = `E2E ${Date.now().toString(36)}`;

  await page.goto("/simulador");
  await expect(workspaceTab(page, "Monitoreo")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Ir a Simular Paciente" })).toBeVisible();

  const { sessionId } = await startPatientSession(page, { patientName });

  // Curves keep painting: the canvas pixels change between two reads.
  const firstPaint = await curvesSignature(page);

  await expect.poll(() => curvesSignature(page), { timeout: 10_000 }).not.toBe(firstPaint);
  await expect(page.getByRole("region", { name: `Paciente: ${patientName}` })).toBeVisible();

  // Conexión and back: same session, the clock kept running.
  await expect.poll(() => simulatedSeconds(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
  const before = await simulatedSeconds(page);

  await workspaceTab(page, "Conexión").click();
  await expect(page).toHaveURL(new RegExp(`tab=conexion&session=${sessionId}`));
  await expect(page.getByRole("region", { name: "1. Reserva del ventilador" })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(3_000);
  await workspaceTab(page, "Monitoreo").click();

  await expect(page).toHaveURL(new RegExp(`tab=monitoreo&session=${sessionId}`));
  await expect(page.getByRole("status", { name: "Estado de la señal" })).toHaveText("Simulando");
  expect(await simulatedSeconds(page)).toBeGreaterThanOrEqual(before + 2);

  const resumedPaint = await curvesSignature(page);

  await expect.poll(() => curvesSignature(page), { timeout: 10_000 }).not.toBe(resumedPaint);

  // Finish → result dialog.
  const result = await finishWorkspaceSession(page);

  await expect(result.getByRole("region", { name: "Resultado del servidor" })).toBeVisible({ timeout: 60_000 });
  await expect(result.getByRole("link", { name: "Ver repetición" })).toHaveAttribute("href", `/simulador?tab=sesiones&replay=${sessionId}`);
  await result.getByRole("button", { name: "Cerrar" }).click();
  await expect(result).toBeHidden();

  // Mis sesiones → the session → its replay inside the panel.
  await workspaceTab(page, "Mis sesiones").click();
  const list = page.getByRole("list", { name: "Sesiones, de la más reciente a la más antigua" });
  const item = list.getByRole("listitem").filter({ hasText: patientName });

  await expect(item).toBeVisible({ timeout: 30_000 });
  await expect(item).toContainText("Finalizada");
  await item.getByRole("button", { name: /^Ver repetición:/ }).click();

  await expect(page).toHaveURL(new RegExp(`tab=sesiones&replay=${sessionId}`));
  const replay = page.getByRole("region", { name: "Repetición de la sesión" });

  await expect(replay).toBeVisible({ timeout: 30_000 });
  await expect(replay.getByText("Solo lectura").first()).toBeVisible();
  await expect(replay.getByRole("region", { name: "Controles de la repetición" })).toBeVisible({ timeout: 30_000 });
  await expect(replay.getByRole("region", { name: "Consola del ventilador" })).toBeVisible();
  await expect(replay.getByRole("spinbutton", { name: "Volumen corriente" })).toBeDisabled();
  await expect(replay.getByRole("button", { name: "Confirmar" })).toBeDisabled();
});
