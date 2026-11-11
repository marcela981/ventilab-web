/*
* Funcionalidad: Bloque A E2E — explicit Enviar in digital
* Descripción: In a digital FREE session (normal lung case, ×1) the July console keeps every edit pending until Enviar: raising PEEP twice with the stepper shows the pending value and sends nothing; Enviar applies it as ONE PARAM_CHANGE with the new PEEP, which reaches the stored session events (the event queue flushes every few seconds); "Deshacer último cambio" then sends the previous PEEP back as another PARAM_CHANGE. Ends through "Finalizar sesión". Depends on @playwright/test and the e2e support helpers (the API session start and events). v1.0 (Bloque A): automatic application (aplicacion-automatica.spec.ts). v1.1 (2026-11-10, reverts A-1 to A-4): renamed and rewritten for the explicit Enviar and the undo. v1.2 (2026-11-11, review R1): the pending highlight is really asserted (`data-pending` of the PEEP control, true while pending, false after Enviar).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { NORMAL_CASE_ID, sessionReplay, startCaseSession } from "../support/bloque-a";
import { finishWorkspaceSession, SIMULATOR_VIEWPORT } from "../support/simulator";

test.use({ viewport: SIMULATOR_VIEWPORT });

const PEEP = "Presión positiva al final de la espiración";

test("a PEEP change waits for Enviar, goes out as one event and can be undone", async ({ page, request }) => {
  test.setTimeout(120_000);
  const { sessionId, api } = await startCaseSession(page, request, NORMAL_CASE_ID);
  const values = page.getByRole("region", { name: "Valores" });
  const peep = page.getByRole("spinbutton", { name: PEEP, exact: true });
  // v1.2 (M6): the pending highlight is the control's `data-pending` attribute (stable, not a CSS class name).
  const peepControl = page.locator('[data-parameter="peep"]').filter({ has: peep });
  const peepChanges = async () => {
    const { events } = await sessionReplay(api, sessionId);

    return events.filter((event) => event.type === "PARAM_CHANGE").map((event) => event.payload.changes?.peepCmH2O);
  };

  await expect(page.getByRole("button", { name: "Confirmar" })).toHaveCount(0);
  await expect(values.getByRole("button", { name: "Detener" })).toBeDisabled();

  const initial = Number(await peep.getAttribute("aria-valuenow"));

  await page.getByRole("button", { name: "Aumentar PEEP" }).click();
  await page.getByRole("button", { name: "Aumentar PEEP" }).click();
  const target = initial + 2;

  // Pending: shown, highlighted, counted and not applied.
  await expect.poll(async () => Number(await peep.getAttribute("aria-valuenow"))).toBe(target);
  await expect(peepControl).toHaveAttribute("data-pending", "true");
  await expect(values.getByText("1 cambio pendiente")).toBeVisible();
  await page.waitForTimeout(3000);
  expect(await peepChanges()).toEqual([]);

  await values.getByRole("button", { name: "Enviar" }).click();
  await expect(values.getByText("Sin cambios pendientes")).toBeVisible();
  await expect(peepControl).toHaveAttribute("data-pending", "false");
  await expect.poll(peepChanges, { timeout: 30_000 }).toEqual([target]);
  await expect.poll(async () => Number(await peep.getAttribute("aria-valuenow"))).toBe(target);

  await values.getByRole("button", { name: "Deshacer último cambio" }).click();
  await expect.poll(peepChanges, { timeout: 30_000 }).toEqual([target, initial]);
  await expect.poll(async () => Number(await peep.getAttribute("aria-valuenow"))).toBe(initial);

  await finishWorkspaceSession(page);
});
