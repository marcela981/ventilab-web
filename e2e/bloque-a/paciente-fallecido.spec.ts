/*
* Funcionalidad: Bloque A E2E — the untreated unstable patient dies
* Descripción: The unstable ARDS case ("SDRA grave inestable", engine-ards-unstable) started at ×4 and left alone (no
*   change at all): the status chip shows the patient getting worse (Inestable, then Crítico); at the death the client ends the
*   session on its own (no confirmation) and the result dialog opens with "Paciente fallecido" as its outcome and the
*   "Línea de tiempo" ending with the death (status changes and alarm onsets at mm:ss). The server summary agrees
*   (outcome DECEASED, timeline with the DECEASED status). About 40 s of wall time (×4 session, patient clock ×4).
*   Depends on @playwright/test and the e2e support helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { patientCondition, sessionSummary, startCaseSession, UNSTABLE_CASE_ID } from "../support/bloque-a";
import { SIMULATOR_VIEWPORT } from "../support/simulator";

test.use({ viewport: SIMULATOR_VIEWPORT });

test("left alone at ×4 the unstable ARDS patient dies and the debrief shows it", async ({ page, request }) => {
  test.setTimeout(240_000);
  const { sessionId, api } = await startCaseSession(page, request, UNSTABLE_CASE_ID, 4);
  const condition = patientCondition(page);

  await expect(condition).toHaveText(/^(Inestable|Crítico)/, { timeout: 30_000 });
  await expect(condition).toHaveText(/^Crítico/, { timeout: 120_000 });

  // Arrest, death: the session ends on its own (no "¿Finalizar la sesión?") and the debrief opens (the monitor, and
  // its "Paciente fallecido" chip, unmount with the ended session within a second or two).
  const result = page.getByRole("dialog", { name: "Resultado de la sesión" });

  await expect(result).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole("dialog", { name: "¿Finalizar la sesión?" })).toHaveCount(0);
  await expect(result.getByRole("heading", { name: "Paciente fallecido" })).toBeVisible({ timeout: 30_000 });
  await expect(result.getByText("Fallecimiento", { exact: true })).toBeVisible();

  const timeline = result.getByRole("list", { name: "Línea de tiempo" });
  const items = timeline.getByRole("listitem");

  await expect(items.last()).toContainText("Estado del paciente: Paciente fallecido");
  await expect(timeline).toContainText("Alarma: SpO₂ baja");
  await expect(timeline).toContainText(/\d{2}:\d{2}Estado del paciente: (Inestable|Crítico)/);

  const summary = await sessionSummary(api, sessionId);

  expect(summary.outcome?.status).toBe("DECEASED");
  expect(summary.outcome?.deceasedAtMs).not.toBeNull();
  expect(summary.timeline.some((item) => item.kind === "PATIENT_STATUS" && item.code === "DECEASED")).toBe(true);
  expect(summary.timeline.some((item) => item.kind === "DECISION")).toBe(false);

  await result.getByRole("button", { name: "Cerrar" }).click();
});
