/*
* Funcionalidad: Bloque A E2E — real mode with the simulated device
* Descripción: The student reserves the ventilator now, connects (control taken automatically) and opens Monitoreo
*   in Real mode while the fake ventilator (scripts/e2e/fake-ventilator.mjs on the TEST broker) streams telemetry:
*   (1) three quick PEEP steps (5 → 8) stay pending (nothing sent) until Enviar, which sends ONE command (POST
*   /api/ventilator/commands with the last PEEP); the control shows "Enviando" then "Aplicado" and the device reports it; (2) at the safe maximum the
*   PEEP cannot go further (stepper disabled, the arrow key does nothing) and nothing is sent; (3) "Deshacer último
*   cambio" sends the values applied before the last command and the device reports the previous PEEP again;
*   (4) an alarm help and "Asesoría IA" exist in the real console (the AI never sends commands). The reservation is
*   released at the end. Not in the CI job: it needs a TEST MQTT broker, the fake ventilator and a backend wired to
*   them (see e2e/bloque-a/README.md). Depends on @playwright/test and the e2e support helpers. v1.1 (2026-11-10,
*   reverts A-1 to A-4): explicit Enviar instead of the 500 ms auto-send.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Page, test } from "@playwright/test";
import { stepTo } from "../support/bloque-a";
import { connectToVentilator, releaseReservation, reserveNow, SIMULATOR_VIEWPORT, workspaceTab } from "../support/simulator";

test.use({ viewport: SIMULATOR_VIEWPORT });

const PEEP = "Presión positiva al final de la espiración";

type SentCommand = { peep?: number } & Record<string, unknown>;

function recordCommands(page: Page): SentCommand[] {
  const sent: SentCommand[] = [];

  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/ventilator/commands")) {
      sent.push(request.postDataJSON() as SentCommand);
    }
  });

  return sent;
}

test("one command per Enviar, nothing beyond the safe range and undo, with the simulated device", async ({ page }) => {
  test.setTimeout(240_000);
  const commands = recordCommands(page);

  await reserveNow(page);

  try {
    await connectToVentilator(page);
    await workspaceTab(page, "Monitoreo").click();
    await page.getByRole("group", { name: "Modo del monitor" }).getByRole("button", { name: "Real" }).click();
    await expect(page.getByRole("heading", { name: "Ventilador físico" })).toBeVisible({ timeout: 30_000 });

    const peep = page.getByRole("spinbutton", { name: PEEP, exact: true });
    const peepValue = async () => Number(await peep.getAttribute("aria-valuenow"));
    const peepStatus = page.locator("[data-parameter='peep'] [data-send-status]");

    // Live telemetry from the fake device: the console is editable with the reported PEEP (5 on a fresh device; the
    // device keeps the last applied settings, so an interrupted earlier run is brought back to 5 first).
    await expect(peep).toHaveAttribute("aria-disabled", "false", { timeout: 60_000 });
    await expect.poll(peepValue, { timeout: 30_000 }).toBeGreaterThan(0);

    if ((await peepValue()) !== 5) {
      await stepTo(page, PEEP, 5);
      await expect.poll(() => commands.length, { timeout: 10_000 }).toBe(1);
      await expect(peepStatus).toHaveText(/^Aplicado/, { timeout: 30_000 });
      await page.waitForTimeout(1_500);
      commands.length = 0;
    }

    const stepped = 8;

    // (1) Three quick steps stay pending; Enviar sends one command with the last value.
    const send = page.getByRole("region", { name: "Valores" }).getByRole("button", { name: "Enviar" });

    await peep.focus();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(1_500);
    expect(commands).toHaveLength(0);
    await send.click();
    await expect(peepStatus).toHaveText(/Enviando|Confirmado|Aplicado/, { timeout: 5_000 });
    await expect.poll(() => commands.length, { timeout: 10_000 }).toBe(1);
    await expect(peepStatus).toHaveText(/^Aplicado/, { timeout: 30_000 });
    await expect.poll(peepValue, { timeout: 30_000 }).toBe(stepped);
    await page.waitForTimeout(1_500);
    expect(commands).toHaveLength(1);
    expect(JSON.stringify(commands[0])).toContain(String(stepped));

    // (2) Up to the safe maximum; beyond it the control does not move and nothing else is sent.
    await peep.focus();
    await page.keyboard.press("End");
    await send.click();
    await expect.poll(() => commands.length, { timeout: 10_000 }).toBe(2);
    await expect(peepStatus).toHaveText(/^Aplicado/, { timeout: 30_000 });
    const max = await peepValue();

    expect(max).toBe(Number(await peep.getAttribute("aria-valuemax")));
    await expect(page.getByRole("button", { name: "Aumentar PEEP" })).toBeDisabled();
    await peep.focus();
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(1_500);
    expect(await peepValue()).toBe(max);
    expect(commands).toHaveLength(2);

    // (3) Undo re-sends the values before the last command: the device reports the stepped PEEP again.
    await page.getByRole("button", { name: "Deshacer último cambio" }).click();
    await expect.poll(() => commands.length, { timeout: 10_000 }).toBe(3);
    await expect.poll(peepValue, { timeout: 30_000 }).toBe(stepped);

    // Leave the fake device at its default PEEP for the next run.
    await stepTo(page, PEEP, 5);
    await expect.poll(() => commands.length, { timeout: 10_000 }).toBe(4);
    await expect.poll(peepValue, { timeout: 30_000 }).toBe(5);

    // (4) The real console offers the AI help too (read-only for the device).
    await expect(page.getByRole("complementary", { name: "Controles" }).getByRole("button", { name: "Asesoría IA", exact: true })).toBeEnabled();

    await workspaceTab(page, "Conexión").click();
    await page.getByRole("region", { name: "2. Conexión con el ventilador" }).getByRole("button", { name: "Desconectar" }).click();
  } finally {
    await releaseReservation(page);
  }
});
