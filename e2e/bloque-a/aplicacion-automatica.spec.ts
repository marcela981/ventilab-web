/*
* Funcionalidad: Bloque A E2E — automatic application in digital
* Descripción: In a digital FREE session (normal lung case, ×1) the July console has no Confirmar, Cancelar nor pending
*   counter; raising PEEP with the stepper applies on its own: the control keeps the new value and the PARAM_CHANGE
*   with that PEEP reaches the stored session events (the event queue flushes every few seconds). Ends through
*   "Finalizar sesión". Depends on @playwright/test and the e2e support helpers (the API session start and events).
* Versión: 1.0
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

test("a PEEP change applies on its own and reaches the session events", async ({ page, request }) => {
  test.setTimeout(120_000);
  const { sessionId, api } = await startCaseSession(page, request, NORMAL_CASE_ID);
  const peep = page.getByRole("spinbutton", { name: PEEP, exact: true });

  await expect(page.getByRole("button", { name: "Confirmar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancelar" })).toHaveCount(0);

  const initial = Number(await peep.getAttribute("aria-valuenow"));

  await page.getByRole("button", { name: "Aumentar PEEP" }).click();
  await page.getByRole("button", { name: "Aumentar PEEP" }).click();
  const target = initial + 2;

  await expect.poll(async () => Number(await peep.getAttribute("aria-valuenow"))).toBe(target);

  // Stored by the server: one PARAM_CHANGE per click, the last one with the new PEEP.
  await expect.poll(async () => {
    const { events } = await sessionReplay(api, sessionId);

    return events.filter((event) => event.type === "PARAM_CHANGE").map((event) => event.payload.changes?.peepCmH2O);
  }, { timeout: 30_000 }).toEqual([initial + 1, target]);
  await expect.poll(async () => Number(await peep.getAttribute("aria-valuenow"))).toBe(target);

  await finishWorkspaceSession(page);
});
