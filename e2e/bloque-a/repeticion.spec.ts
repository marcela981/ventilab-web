/*
* Funcionalidad: Bloque A E2E — the replay equals the live session
* Descripción: A live session of the unstable ARDS case (×1, patient evolution on) with two automatic PEEP changes is
*   ended from Monitoreo; then (1) the vendored engine replays the stored events in Node up to the scored time and its
*   final metrics (gas exchange, MAP, heart rate, patient status and severity) equal the server summary
*   `finalMetrics`; (2) the server outcome is the patient status the live chip showed at the end and the debrief
*   timeline holds both decisions; (3) the result dialog rebuilds the evolution in the browser worker without the
*   "no coincide" note. Depends on @playwright/test, the e2e support helpers and the vendored engine.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import {
  patientCondition,
  replayLocally,
  sessionReplay,
  sessionSummary,
  startCaseSession,
  UNSTABLE_CASE_ID,
} from "../support/bloque-a";
import { finishWorkspaceSession, SIMULATOR_VIEWPORT } from "../support/simulator";

test.use({ viewport: SIMULATOR_VIEWPORT });

function close(local: number | null | undefined, server: number | null | undefined): boolean {
  if (typeof local !== "number" || typeof server !== "number") {
    return local === server;
  }

  return Math.abs(local - server) <= 1e-6 * Math.max(1, Math.abs(local), Math.abs(server));
}

test("the replay of a session with evolution equals the live session and the server summary", async ({ page, request }) => {
  test.setTimeout(180_000);
  const { sessionId, api } = await startCaseSession(page, request, UNSTABLE_CASE_ID, 1);
  const increase = page.getByRole("button", { name: "Aumentar PEEP" });

  await page.waitForTimeout(3_000);
  await increase.click();
  await page.waitForTimeout(3_000);
  await increase.click();
  await page.waitForTimeout(5_000);

  const liveStatus = await patientCondition(page).getAttribute("data-status");
  const result = await finishWorkspaceSession(page);
  const summary = await sessionSummary(api, sessionId);
  const stored = await sessionReplay(api, sessionId);
  const local = replayLocally(stored, summary.simTimeMs);
  const server = summary.finalMetrics;

  expect(stored.events.filter((event) => event.type === "PARAM_CHANGE")).toHaveLength(2);
  expect(local.simTimeMs).toBe(server.simTimeMs);
  expect({
    spo2: close(local.gasExchange.spo2Percent, server.gasExchange.spo2Percent),
    pao2: close(local.gasExchange.pao2MmHg, server.gasExchange.pao2MmHg),
    paco2: close(local.gasExchange.paco2MmHg, server.gasExchange.paco2MmHg),
    ph: close(local.gasExchange.ph, server.gasExchange.ph),
    map: close(local.hemodynamics.meanArterialPressureMmHg, server.hemodynamics.meanArterialPressureMmHg),
    heartRate: close(local.hemodynamics.heartRateBpm, server.hemodynamics.heartRateBpm),
    severity: close(local.patient?.severity, server.patient?.severity),
  }).toEqual({ spo2: true, pao2: true, paco2: true, ph: true, map: true, heartRate: true, severity: true });
  expect(local.patient?.status).toBe(server.patient?.status);

  // The live chip showed the same patient status the server scored, and the debrief holds both decisions.
  expect(summary.outcome?.status).toBe(liveStatus);
  expect(summary.timeline.filter((item) => item.kind === "DECISION")).toHaveLength(2);

  // The browser worker rebuilds the evolution and finds no difference with the server.
  const evolution = result.getByRole("region", { name: "Evolución de la sesión" });

  await expect(evolution.getByRole("figure").first()).toBeVisible({ timeout: 60_000 });
  await expect(result.getByText(/no coincide del todo/)).toHaveCount(0);
  await result.getByRole("button", { name: "Cerrar" }).click();
});
