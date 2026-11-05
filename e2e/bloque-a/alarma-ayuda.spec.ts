/*
* Funcionalidad: Bloque A E2E — "¿Cómo estabilizar?" of an alarm
* Descripción: In the unstable ARDS case (×1, so the patient lives through the spec) the low SpO2 alarm of the July
*   alarms bar is a button "¿Cómo estabilizar? SpO₂ baja": it opens the 380 px "¿Cómo estabilizar?" drawer with the
*   deterministic rules of the server ("Qué revisar primero", each with its source) and then the streamed suggestion
*   of the fake LLM with "¿Te fue útil?" (rated as an AI_CALL of the SIM_ALARM surface); the request body carries
*   only the alarm code and the language. Escape closes the drawer. Needs the fake LLM (scripts/e2e/fake-llm.mjs).
*   Depends on @playwright/test and the e2e support helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, test } from "@playwright/test";
import { boxOf, TOLERANCE_PX } from "../support/layout-order";
import { startCaseSession, UNSTABLE_CASE_ID } from "../support/bloque-a";
import { finishWorkspaceSession, SIMULATOR_VIEWPORT } from "../support/simulator";

test.use({ viewport: SIMULATOR_VIEWPORT });

// Marker of the fake provider answer (scripts/e2e/fake-llm-core.mjs).
const FAKE_ANSWER = "Respuesta de prueba (proveedor falso de E2E).";

test("an alarm opens its rules and the AI suggestion, which can be rated", async ({ page, request }) => {
  test.setTimeout(180_000);
  const { sessionId } = await startCaseSession(page, request, UNSTABLE_CASE_ID, 1);
  const alarm = page.getByRole("region", { name: "Alarmas" }).getByRole("button", { name: "¿Cómo estabilizar? SpO₂ baja" });

  await expect(alarm).toBeVisible({ timeout: 60_000 });
  const helpRequest = page.waitForRequest((sent) => sent.method() === "POST" && sent.url().endsWith(`/api/simulation/sessions/${sessionId}/alarm-help`));

  await alarm.click();
  const drawer = page.getByRole("complementary", { name: "¿Cómo estabilizar?" });

  await expect(drawer).toBeVisible();
  expect(Math.abs((await boxOf(drawer, "alarm help drawer")).width - 380)).toBeLessThanOrEqual(TOLERANCE_PX);
  expect((await helpRequest).postDataJSON()).toEqual({ alarmCode: "LOW_SPO2", language: "es" });

  const rules = drawer.getByRole("list", { name: "Qué revisar primero" });

  await expect(rules.getByRole("listitem").first()).toBeVisible({ timeout: 30_000 });
  await expect(rules.getByRole("listitem").first()).toContainText("Fuente:");
  await expect(drawer).toContainText(FAKE_ANSWER.replace(/\*/g, ""), { timeout: 60_000 });
  await expect(drawer.getByText("Sugerencia automática (IA no disponible)")).toHaveCount(0);

  const helpful = drawer.getByRole("button", { name: "Sí, fue útil" });

  await expect(helpful).toBeEnabled({ timeout: 30_000 });
  const rating = page.waitForRequest((sent) => sent.method() === "PUT" && sent.url().endsWith("/api/ai-ratings"));

  await helpful.click();
  expect((await rating).postDataJSON()).toMatchObject({ targetType: "AI_CALL", surface: "SIM_ALARM", helpful: true });
  await expect(helpful).toHaveAttribute("aria-pressed", "true");

  // Escape inside the drawer closes it (the rating button lost the focus while it saved).
  await helpful.focus();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);

  await finishWorkspaceSession(page);
});
