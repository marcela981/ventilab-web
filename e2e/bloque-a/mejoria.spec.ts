/*
* Funcionalidad: Bloque A E2E — the right adjustment rescues the unstable patient
* Descripción: The unstable ARDS case at ×4 with the adjustment of the server test (ARDSNet PEEP 12, FiO2 80 %, a
*   protective Vt of 380 mL) entered with the July arrow keys right after the start: every key applies on its own,
*   the SpO2 card rises above its starting value and the status chip leaves Inestable / Crítico for Estable; the
*   stored events end with those three values. Ends through "Finalizar sesión" and the debrief lists the decisions
*   ("PEEP … → 12 cmH₂O"). Depends on @playwright/test and the e2e support helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { cardValue, patientCondition, sessionReplay, startCaseSession, stepTo, UNSTABLE_CASE_ID } from "../support/bloque-a";
import { finishWorkspaceSession, SIMULATOR_VIEWPORT } from "../support/simulator";

test.use({ viewport: SIMULATOR_VIEWPORT });

test("PEEP 12, FiO2 80 % and Vt 380 mL make the unstable patient stable and raise the SpO2", async ({ page, request }) => {
  test.setTimeout(240_000);
  const { sessionId, api } = await startCaseSession(page, request, UNSTABLE_CASE_ID, 4);
  const condition = patientCondition(page);

  await expect(condition).toHaveText(/^(Inestable|Crítico)/, { timeout: 30_000 });
  await expect.poll(() => cardValue(page, "SpO2"), { timeout: 30_000 }).not.toBeNull();
  const startSpo2 = (await cardValue(page, "SpO2")) ?? 0;

  await stepTo(page, "Presión positiva al final de la espiración", 12);
  await stepTo(page, "Fracción inspirada de oxígeno", 80);
  await stepTo(page, "Volumen corriente", 380);

  await expect(condition).toHaveText(/^Estable/, { timeout: 150_000 });
  await expect.poll(async () => (await cardValue(page, "SpO2")) ?? 0, { timeout: 60_000 }).toBeGreaterThan(startSpo2);

  // The last stored change of each parameter is the adjustment entered.
  await expect.poll(async () => {
    const { events } = await sessionReplay(api, sessionId);
    const last: Record<string, unknown> = {};

    events.filter((event) => event.type === "PARAM_CHANGE").forEach((event) => Object.assign(last, event.payload.changes));

    return last;
  }, { timeout: 30_000 }).toMatchObject({ peepCmH2O: 12, fio2: 0.8, tidalVolumeMl: 380 });

  const result = await finishWorkspaceSession(page);
  const timeline = result.getByRole("list", { name: "Línea de tiempo" });

  await expect(timeline).toContainText(/PEEP \d+ → \d+ cmH₂O/, { timeout: 30_000 });
  await expect(result.getByRole("heading", { name: /Estado final del paciente: Estable/ })).toBeVisible();
  await result.getByRole("button", { name: "Cerrar" }).click();
});
