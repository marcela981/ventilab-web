/*
* Funcionalidad: E2E — the real-mode AI help analyzes the latest telemetry (fix sim-assist-current-state)
* Descripción: With the simulated device (scripts/e2e/fake-ventilator.mjs on the TEST broker) streaming, the student
*   reserves the ventilator, connects and opens Monitoreo in Real mode; with the fake LLM in `echo` mode "Asesoría IA"
*   posts the monitor state read at the request (alarm details, time and age of the latest frame) and the echoed SpO2
*   and peak pressure match the value cards of the screen (±2 %, 1 cmH2O); the answer header says how old the device
*   data was ("Datos del equipo de hace N s"). Not in the CI job, like modo-real: it needs a TEST MQTT broker, the fake
*   ventilator and a backend wired to them (see scripts/e2e/README.md). Depends on @playwright/test and the e2e
*   support helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type APIRequestContext, test } from "@playwright/test";
import { cardValue } from "../support/bloque-a";
import { connectToVentilator, releaseReservation, reserveNow, SIMULATOR_VIEWPORT, workspaceTab } from "../support/simulator";

test.use({ viewport: SIMULATOR_VIEWPORT });

const FAKE_LLM_URL = process.env.E2E_FAKE_LLM_URL ?? "http://127.0.0.1:4910";
const ECHO_MARKER = "ECO DEL ESTADO RECIBIDO";

type RealEcho = { source: string, spo2Percent: number | null, peakPressureCmH2O: number | null, dataAgeS: number | null, stale: boolean };

async function setFakeLlmMode(request: APIRequestContext, mode: string): Promise<void> {
  expect((await request.put(`${FAKE_LLM_URL}/__fake-llm/mode`, { data: { mode } })).ok()).toBe(true);
}

test.afterEach(async ({ request }) => {
  await setFakeLlmMode(request, "ok");
});

test("Asesoría IA of the real monitor echoes the latest telemetry on screen", async ({ page, request }) => {
  test.setTimeout(240_000);
  await setFakeLlmMode(request, "echo");
  await reserveNow(page);

  try {
    await connectToVentilator(page);
    await workspaceTab(page, "Monitoreo").click();
    await page.getByRole("group", { name: "Modo del monitor" }).getByRole("button", { name: "Real" }).click();
    await expect(page.getByRole("heading", { name: "Ventilador físico" })).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => cardValue(page, "Ppico"), { timeout: 60_000 }).not.toBeNull();

    const assistRequest = page.waitForRequest((sent) => sent.method() === "POST" && sent.url().endsWith("/api/simulation/real/assist"));

    await page.getByRole("complementary", { name: "Controles" }).getByRole("button", { name: "Asesoría IA", exact: true }).click();
    const drawer = page.getByRole("complementary", { name: "Asesoría IA" });

    await drawer.getByRole("button", { name: "Solicitar asesoría" }).click();
    const peakOnScreen = (await cardValue(page, "Ppico")) ?? 0;
    const sent = (await assistRequest).postDataJSON() as { state: { lastFrameAt?: string, dataAgeMs?: number } };

    expect(typeof sent.state.lastFrameAt).toBe("string");
    expect(sent.state.dataAgeMs).toBeLessThan(2_000);

    // The real-mode answer streams: the header shows once it is complete (done).
    await expect(drawer.getByText(/^Datos del equipo de hace \d+ s$/u)).toBeVisible({ timeout: 60_000 });
    await expect(drawer).toContainText(ECHO_MARKER);
    const text = await drawer.innerText();
    const echo = JSON.parse(text.slice(text.indexOf("{", text.indexOf(ECHO_MARKER)), text.lastIndexOf("}") + 1)) as RealEcho;

    expect(echo.source).toBe("REAL_VENTILATOR");
    expect(echo.stale).toBe(false);
    // The device breathes square-flow breaths: the peak of the last breath stays within 1 cmH2O between two frames.
    expect(Math.abs((echo.peakPressureCmH2O ?? 0) - peakOnScreen)).toBeLessThanOrEqual(Math.max(1, peakOnScreen * 0.02));

    await page.keyboard.press("Escape");
    await workspaceTab(page, "Conexión").click();
    await page.getByRole("region", { name: "2. Conexión con el ventilador" }).getByRole("button", { name: "Desconectar" }).click();
  } finally {
    await releaseReservation(page);
  }
});
