/*
* Funcionalidad: E2E — the AI help analyzes the current state of the patient (fix sim-assist-current-state)
* Descripción: In the unstable ARDS case at ×4, touching nothing until the patient status chip says "Crítico" (the
*   deterioration produces no event, so the server used to replay only up to t = 0 and the AI saw the stable initial
*   patient), the simulation is paused and the AI help is asked with the fake LLM in `echo` mode, which answers with the
*   values of the state block it received: (1) "Asesoría IA" and (2) "¿Cómo estabilizar?" of the low SpO2 alarm send
*   the console simulated time and snapshot, and the echoed SpO2 and severity match the screen (±2 %), the patient is
*   CRITICAL with the LOW_SPO2 alarm and the answer header says "Analizado en t = mm:ss · gravedad X %"; (3) with the
*   fake LLM in `claims-stable` mode (it claims a stable patient with SpO2 89 %) the answer is regenerated and then
*   replaced by the deterministic suggestion with "La IA no pudo analizar el estado actual"; (4) from 1440 px the open
*   drawer pushes the console (its curves end before the drawer). The fake LLM mode is set through its admin route and
*   restored after each test. Needs the fake LLM (scripts/e2e/fake-llm.mjs, E2E_FAKE_LLM_URL, default
*   http://127.0.0.1:4910). Depends on @playwright/test and the e2e support helpers. v1.1: the echoed JSON is read
*   from the visible answer only, not from the visually hidden aria-live copy of the StreamingMessage.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type APIRequestContext, type Locator, type Page, test } from "@playwright/test";
import { boxOf } from "../support/layout-order";
import { cardValue, patientCondition, startCaseSession, UNSTABLE_CASE_ID } from "../support/bloque-a";
import { CURVES_LABEL, finishWorkspaceSession, SIMULATOR_VIEWPORT } from "../support/simulator";

test.use({ viewport: SIMULATOR_VIEWPORT });

const FAKE_LLM_URL = process.env.E2E_FAKE_LLM_URL ?? "http://127.0.0.1:4910";
// First line of an echo answer (scripts/e2e/fake-llm-core.mjs ECHO_MARKER); the JSON of the received values follows.
const ECHO_MARKER = "ECO DEL ESTADO RECIBIDO";

type Echo = { simTime: string | null, status: string | null, severityPercent: number | null, spo2Percent: number | null, alarms: string[] };

async function setFakeLlmMode(request: APIRequestContext, mode: string): Promise<void> {
  const response = await request.put(`${FAKE_LLM_URL}/__fake-llm/mode`, { data: { mode } });

  expect(response.ok()).toBe(true);
}

/** Waits for the "Crítico" status chip (no adjustment at all), then pauses so the screen stops changing. */
async function criticalAndPaused(page: Page): Promise<{ spo2: number, severity: number }> {
  await expect(patientCondition(page)).toHaveAttribute("data-status", "CRITICAL", { timeout: 90_000 });
  await page.getByRole("button", { name: "Pausar" }).click();
  await expect(page.getByText("En pausa")).toBeVisible();

  const spo2 = await cardValue(page, "SpO2");
  const severity = Number(/gravedad (\d+) %/u.exec(await patientCondition(page).innerText())?.[1]);

  expect(spo2).not.toBeNull();

  return { spo2: spo2 ?? 0, severity };
}

async function echoIn(container: Locator): Promise<Echo> {
  await expect(container).toContainText(ECHO_MARKER, { timeout: 60_000 });

  // Reads only the visible answer: the StreamingMessage also repeats it in a visually hidden aria-live region for
  // screen readers, and including that copy would join two JSON objects.
  const text = await container.evaluate((root) => {
    const visible = root.cloneNode(true) as HTMLElement;

    visible.querySelectorAll("[aria-live]").forEach((region) => {
      region.remove();
    });

    return visible.textContent ?? "";
  });
  const json = text.slice(text.indexOf("{", text.indexOf(ECHO_MARKER)), text.lastIndexOf("}") + 1);

  return JSON.parse(json) as Echo;
}

function expectMatchesScreen(echo: Echo, screen: { spo2: number, severity: number }): void {
  expect(echo.status).toBe("CRITICAL");
  expect(echo.alarms).toContain("LOW_SPO2");
  // The screen rounds the SpO2 to whole percent; ±2 % of the shown value.
  expect(Math.abs((echo.spo2Percent ?? 0) - screen.spo2)).toBeLessThanOrEqual(screen.spo2 * 0.02 + 0.5);
  expect(Math.abs((echo.severityPercent ?? 0) - screen.severity)).toBeLessThanOrEqual(2);
  // The initial patient (stable, SpO2 ~ 89-90 %) is not what the AI analyzed.
  expect(echo.spo2Percent ?? 100).toBeLessThan(85);
}

test.afterEach(async ({ request }) => {
  await setFakeLlmMode(request, "ok");
});

test("Asesoría IA analyzes the critical patient on screen, not the initial one", async ({ page, request }) => {
  test.setTimeout(240_000);
  await setFakeLlmMode(request, "echo");
  const { sessionId } = await startCaseSession(page, request, UNSTABLE_CASE_ID, 4);
  const screen = await criticalAndPaused(page);
  const assistRequest = page.waitForRequest((sent) => sent.method() === "POST" && sent.url().endsWith(`/api/simulation/sessions/${sessionId}/assist`));

  await page.getByRole("complementary", { name: "Controles" }).getByRole("button", { name: "Asesoría IA", exact: true }).click();
  const drawer = page.getByRole("complementary", { name: "Asesoría IA" });

  await drawer.getByRole("button", { name: "Solicitar asesoría" }).click();

  const body = (await assistRequest).postDataJSON() as { simTimeMs: number, clientSnapshot: { status: string } };

  expect(body.simTimeMs).toBeGreaterThan(30_000);
  expect(body.clientSnapshot.status).toBe("CRITICAL");

  const echo = await echoIn(drawer);

  expectMatchesScreen(echo, screen);
  await expect(drawer.getByText(new RegExp(`^Analizado en t = ${echo.simTime ?? ""} · gravedad \\d+ %$`, "u"))).toBeVisible();

  // From 1440 px the open drawer pushes the console: the curves end before the drawer starts.
  const curves = await boxOf(page.getByRole("img", { name: CURVES_LABEL }), "curves");
  const panel = await boxOf(drawer, "AI drawer");

  expect(curves.x + curves.width).toBeLessThanOrEqual(panel.x + 1);

  await page.keyboard.press("Escape");
  await finishWorkspaceSession(page);
});

test("¿Cómo estabilizar? of the low SpO2 alarm analyzes the current state too", async ({ page, request }) => {
  test.setTimeout(240_000);
  await setFakeLlmMode(request, "echo");
  const { sessionId } = await startCaseSession(page, request, UNSTABLE_CASE_ID, 4);
  const screen = await criticalAndPaused(page);
  const helpRequest = page.waitForRequest((sent) => sent.method() === "POST" && sent.url().endsWith(`/api/simulation/sessions/${sessionId}/alarm-help`));

  await page.getByRole("region", { name: "Alarmas" }).getByRole("button", { name: "¿Cómo estabilizar? SpO₂ baja" }).click();
  const drawer = page.getByRole("complementary", { name: "¿Cómo estabilizar?" });

  expect((await helpRequest).postDataJSON()).toMatchObject({ alarmCode: "LOW_SPO2", language: "es", simTimeMs: expect.any(Number) });
  expectMatchesScreen(await echoIn(drawer), screen);
  await expect(drawer.getByText(/^Analizado en t = \d{2}:\d{2} · gravedad \d+ %$/u)).toBeVisible();

  await page.keyboard.press("Escape");
  await finishWorkspaceSession(page);
});

test("an AI answer that claims stability with a critical patient is replaced by the deterministic suggestion", async ({ page, request }) => {
  test.setTimeout(240_000);
  await setFakeLlmMode(request, "claims-stable");
  await startCaseSession(page, request, UNSTABLE_CASE_ID, 4);
  await criticalAndPaused(page);

  await page.getByRole("complementary", { name: "Controles" }).getByRole("button", { name: "Asesoría IA", exact: true }).click();
  const drawer = page.getByRole("complementary", { name: "Asesoría IA" });

  await drawer.getByRole("button", { name: "Solicitar asesoría" }).click();
  await expect(drawer.getByText("La IA no pudo analizar el estado actual")).toBeVisible({ timeout: 60_000 });
  await expect(drawer).not.toContainText("El paciente está estable");
  await expect(drawer.getByText("¿Te fue útil?")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await finishWorkspaceSession(page);
});
