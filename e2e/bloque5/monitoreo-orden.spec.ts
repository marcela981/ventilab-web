/*
* Funcionalidad: E2E July Monitoreo order of the Real monitor (Bloque 5, W5-1)
* Descripción: The Real monitor of DISENO_BLOQUE5 §6.3, at 1920×1080 and 1280×720, by role and accessible name with boundingBox (1 px tolerance). The student reserves the ventilator ("Reservar ahora"), connects with control and opens Monitoreo → Real; the local stack has no physical device (MQTT disabled), so the monitor shows "Equipo sin datos" and a read-only console, which is enough to check the disposition. Checked: the "Ventilador físico" strip above the columns with "Liberar control" left of "Grabar sesión"; the regions Valores < Curvas < Controles in x; the left column in y (logos, "Modo del monitor" with Real pressed, "Reserva activa", "Deshacer último cambio" (disabled), "Ajustar", the value cards; no Confirmar nor Cancelar since Ajustes A); the centre in y (alarms, signal chip "Conectado (Físico)" left of the zoom group, curves); the right column in y (group "Modo ventilatorio", "Más modos …", "Pausa espiratoria", "Estado de la mecánica", "Ver alertas detalladas"). Also no horizontal scroll and the curves canvas at least 360 px high. The digital order is covered by monitoreo-julio.spec.ts. Cleanup disconnects and releases the reservation. v0.1 (Bloque 5, W5-1): first version. v0.2 (Ajustes A, A2): automatic send: "Deshacer último cambio" replaces Confirmar, Cancelar and the pending status. Depends on @playwright/test and the simulator and layout order e2e helpers.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Page, test } from "@playwright/test";
import { boxOf, expectHorizontalOrder, expectVerticalOrder, TOLERANCE_PX } from "../support/layout-order";
import {
  COMPACT_VIEWPORT,
  connectionCard,
  connectToVentilator,
  CURVES_LABEL,
  openRealMonitor,
  releaseReservation,
  reserveNow,
  SIMULATOR_VIEWPORT,
  workspaceTab,
} from "../support/simulator";

async function checkRealOrder(page: Page): Promise<void> {
  const values = page.getByRole("region", { name: "Valores" });
  const curves = page.getByRole("region", { name: "Curvas" });
  const controls = page.getByRole("complementary", { name: "Controles" });
  const consoleZone = page.getByRole("region", { name: "Consola del ventilador" });

  // The Real strip sits above the three columns.
  await expectVerticalOrder([["Ventilador físico", consoleZone.getByRole("heading", { name: "Ventilador físico" })], ["Valores", values]]);
  await expectHorizontalOrder([["Liberar control", page.getByRole("button", { name: "Liberar control" })], ["Grabar sesión", page.getByRole("button", { name: "Grabar sesión" })]]);
  await expectHorizontalOrder([["Valores", values], ["Curvas", curves], ["Controles", controls]]);

  // Left column.
  const mode = values.getByRole("group", { name: "Modo del monitor" });

  await expect(mode.getByRole("button", { name: "Real" })).toHaveAttribute("aria-pressed", "true");
  await expectVerticalOrder([
    ["logo VentyLab", values.getByRole("img", { name: "VentyLab" })],
    ["logo Univalle", values.getByRole("img", { name: "Univalle" })],
    ["Modo del monitor", mode],
    ["Reserva activa", values.getByRole("status", { name: "Reserva activa" })],
    ["Deshacer último cambio", values.getByRole("button", { name: "Deshacer último cambio" })],
    ["Ajustar", values.getByRole("button", { name: "Ajustar" })],
    ["Valores del monitor", values.getByRole("list", { name: "Valores del monitor" })],
  ]);
  // Ajustes A: commands go out on their own; nothing to confirm and nothing to undo yet.
  await expect(values.getByRole("button", { name: "Deshacer último cambio" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Confirmar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancelar" })).toHaveCount(0);

  // Centre.
  const chip = curves.getByRole("status", { name: "Estado de la señal" });

  await expect(chip).toHaveText("Conectado (Físico)");
  await expectVerticalOrder([
    ["Alarmas", page.getByRole("region", { name: "Alarmas" })],
    ["Estado de la señal", chip],
    ["curves", page.getByRole("img", { name: CURVES_LABEL })],
  ]);
  await expectHorizontalOrder([["Estado de la señal", chip], ["Zoom de las curvas", curves.getByRole("group", { name: "Zoom de las curvas" })]]);

  // Right column.
  await expectVerticalOrder([
    ["Modo ventilatorio", controls.getByRole("group", { name: "Modo ventilatorio" })],
    ["Más modos", controls.getByRole("button", { name: /^Más modos( \(PSV, CPAP, SIMV\)| \S+)$/ })],
    ["Pausa espiratoria", controls.getByRole("spinbutton", { name: "Pausa espiratoria" })],
    ["Estado de la mecánica", controls.getByRole("region", { name: "Estado de la mecánica" })],
    ["Ver alertas detalladas", controls.getByRole("button", { name: "Ver alertas detalladas" })],
  ]);
}

test("July Monitoreo order of the Real monitor at 1920×1080 and 1280×720", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(SIMULATOR_VIEWPORT);
  await reserveNow(page);

  try {
    await connectToVentilator(page);
    await openRealMonitor(page);

    for (const viewport of [SIMULATOR_VIEWPORT, COMPACT_VIEWPORT]) {
      await test.step(`${viewport.width}×${viewport.height}`, async () => {
        await page.setViewportSize(viewport);
        await checkRealOrder(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        expect((await boxOf(page.getByRole("img", { name: CURVES_LABEL }), "curves")).height).toBeGreaterThanOrEqual(360 - TOLERANCE_PX);
      });
    }

    await workspaceTab(page, "Conexión").click();
    await connectionCard(page).getByRole("button", { name: "Desconectar" }).click();
    await expect(connectionCard(page).getByRole("button", { name: "Conectar", exact: true })).toBeEnabled({ timeout: 15_000 });
  } finally {
    await releaseReservation(page);
  }
});
