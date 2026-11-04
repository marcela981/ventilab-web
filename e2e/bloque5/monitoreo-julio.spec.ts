/*
* Funcionalidad: E2E July Monitoreo layout (Bloque 5, C10)
* Descripción: A FREE session (Simular Paciente → "Aleatorio") on the July Monitoreo console at 1920×1080 and 1280×720 checks the control order of DISENO_BLOQUE5 §6.3 by role and accessible name with boundingBox (1 px tolerance): the regions Valores < Curvas < Controles in x; the left column in y (logos, "Modo del monitor", "Paciente activo", then Confirmar and Cancelar in ONE row — compared in x, not y — the pending status, "Ajustar" and the value cards list); the input row FiO₂ < Volumen corriente < PEEP in x and above the alarms, the signal chip, the zoom group and the curves; the right column in y (group "Modo ventilatorio" with "Asesoría IA" to its right, then the separate "Más modos (PSV, CPAP, SIMV)" button, the I:E slider and status, inspiratory time and pause, the disabled expiratory pause, the rate spinbutton and slider, "Más parámetros", "Estado de la mecánica" and "Ver alertas detalladas"); the session strip in x (Control del tiempo < Mostrar caso clínico < Finalizar sesión). Also: no horizontal scroll, curves canvas at least 360 px high, and "Ver alertas detalladas" opening the 380 px "Alertas detalladas" drawer without resizing the console, closed by Escape with the focus back on the button. The session is finished at the end of each viewport. v0.1 (Bloque 5, C10): first version. Depends on @playwright/test and the simulator e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Locator, type Page, test } from "@playwright/test";
import { COMPACT_VIEWPORT, CURVES_LABEL, finishWorkspaceSession, SIMULATOR_VIEWPORT, startPatientSession } from "../support/simulator";

const TOLERANCE_PX = 1;

type Box = { x: number, y: number, width: number, height: number };

async function boxOf(locator: Locator, name: string): Promise<Box> {
  const box = await locator.boundingBox();

  expect(box, `${name} is rendered`).not.toBeNull();

  return box as Box;
}

/** Each item starts below the previous one's top (1 px tolerance), in the given order. */
async function expectVerticalOrder(items: ReadonlyArray<[string, Locator]>): Promise<void> {
  let previous: { name: string, box: Box } | null = null;

  for (const [name, locator] of items) {
    const box = await boxOf(locator, name);

    if (previous) {
      expect(box.y, `${previous.name} is above ${name}`).toBeGreaterThan(previous.box.y + TOLERANCE_PX);
    }

    previous = { name, box };
  }
}

/** Each item starts right of the previous one's left edge, in the given order. */
async function expectHorizontalOrder(items: ReadonlyArray<[string, Locator]>): Promise<void> {
  let previous: { name: string, box: Box } | null = null;

  for (const [name, locator] of items) {
    const box = await boxOf(locator, name);

    if (previous) {
      expect(box.x, `${previous.name} is left of ${name}`).toBeGreaterThan(previous.box.x + TOLERANCE_PX);
    }

    previous = { name, box };
  }
}

async function checkOrder(page: Page): Promise<void> {
  const values = page.getByRole("region", { name: "Valores" });
  const curves = page.getByRole("region", { name: "Curvas" });
  const controls = page.getByRole("complementary", { name: "Controles" });

  await expectHorizontalOrder([["Valores", values], ["Curvas", curves], ["Controles", controls]]);

  // Left column.
  const confirm = values.getByRole("button", { name: "Confirmar" });
  const cancel = values.getByRole("button", { name: "Cancelar" });

  await expectVerticalOrder([
    ["logo VentyLab", values.getByRole("img", { name: "VentyLab" })],
    ["logo Univalle", values.getByRole("img", { name: "Univalle" })],
    ["Modo del monitor", values.getByRole("group", { name: "Modo del monitor" })],
    ["Paciente activo", values.getByRole("status", { name: "Paciente activo" })],
    ["Confirmar", confirm],
    ["pending status", values.getByRole("status").filter({ hasText: /cambios? pendientes?$/ })],
    ["Ajustar", values.getByRole("button", { name: "Ajustar" })],
    ["Valores del monitor", values.getByRole("list", { name: "Valores del monitor" })],
  ]);
  // Confirmar and Cancelar share one row (July's Enviar / Detener): compare x, not y.
  await expectHorizontalOrder([["Confirmar", confirm], ["Cancelar", cancel]]);
  expect(Math.abs((await boxOf(confirm, "Confirmar")).y - (await boxOf(cancel, "Cancelar")).y)).toBeLessThanOrEqual(TOLERANCE_PX);

  // Centre.
  const fio2 = page.getByRole("spinbutton", { name: "Fracción inspirada de oxígeno" });
  const chip = curves.getByRole("status", { name: "Estado de la señal" });
  const zoom = curves.getByRole("group", { name: "Zoom de las curvas" });

  await expectHorizontalOrder([
    ["FiO2", fio2],
    ["Volumen corriente", page.getByRole("spinbutton", { name: "Volumen corriente" })],
    ["PEEP", page.getByRole("spinbutton", { name: "Presión positiva al final de la espiración" })],
  ]);
  await expectVerticalOrder([
    ["input row", fio2],
    ["Alarmas", page.getByRole("region", { name: "Alarmas" })],
    ["Estado de la señal", chip],
    ["curves", page.getByRole("img", { name: CURVES_LABEL })],
  ]);
  await expectHorizontalOrder([["Estado de la señal", chip], ["Zoom de las curvas", zoom]]);

  // Right column.
  const modes = controls.getByRole("group", { name: "Modo ventilatorio" });

  await expectHorizontalOrder([["Modo ventilatorio", modes], ["Asesoría IA", controls.getByRole("button", { name: "Asesoría IA", exact: true })]]);
  await expect(modes.getByRole("button", { name: /^Más modos/ })).toHaveCount(0);
  await expectVerticalOrder([
    ["Modo ventilatorio", modes],
    ["Más modos", controls.getByRole("button", { name: /^Más modos( \(PSV, CPAP, SIMV\)| \S+)$/ })],
    ["I:E slider", controls.getByRole("slider", { name: "Relación inspiración/espiración" })],
    ["Relación I:E", controls.getByRole("status", { name: "Relación I:E" })],
    ["Tiempo inspiratorio", controls.getByRole("spinbutton", { name: "Tiempo inspiratorio" })],
    ["Pausa inspiratoria", controls.getByRole("spinbutton", { name: "Pausa inspiratoria" })],
    ["Pausa espiratoria", controls.getByRole("spinbutton", { name: "Pausa espiratoria" })],
    ["Frecuencia respiratoria", controls.getByRole("spinbutton", { name: "Frecuencia respiratoria" })],
    ["rate slider", controls.getByRole("slider", { name: "Frecuencia respiratoria" })],
    ["Más parámetros", controls.getByRole("button", { name: "Más parámetros" })],
    ["Estado de la mecánica", controls.getByRole("region", { name: "Estado de la mecánica" })],
    ["Ver alertas detalladas", controls.getByRole("button", { name: "Ver alertas detalladas" })],
  ]);

  // Session strip.
  await expectHorizontalOrder([
    ["Control del tiempo", page.getByRole("group", { name: "Control del tiempo" })],
    ["Mostrar caso clínico", page.getByRole("button", { name: "Mostrar caso clínico" })],
    ["Finalizar sesión", page.getByRole("button", { name: "Finalizar sesión" })],
  ]);
}

for (const viewport of [SIMULATOR_VIEWPORT, COMPACT_VIEWPORT]) {
  test(`July Monitoreo control order at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    await startPatientSession(page);
    const consoleZone = page.getByRole("region", { name: "Consola del ventilador" });

    await checkOrder(page);

    // Never a horizontal scroll; the curves keep at least 360 px.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await boxOf(page.getByRole("img", { name: CURVES_LABEL }), "curves")).height).toBeGreaterThanOrEqual(360 - TOLERANCE_PX);

    // The alerts drawer (380 px) overlays the console without resizing it; Escape closes it.
    const consoleBox = await boxOf(consoleZone, "console");
    const open = page.getByRole("button", { name: "Ver alertas detalladas" });

    await open.click();
    const drawer = page.getByRole("complementary", { name: "Alertas detalladas" });

    await expect(drawer).toBeVisible();
    expect(Math.abs((await boxOf(drawer, "drawer")).width - 380)).toBeLessThanOrEqual(TOLERANCE_PX);
    await expect(drawer.getByRole("region", { name: "Alertas de validación" })).toBeVisible();
    expect(await boxOf(consoleZone, "console")).toEqual(consoleBox);
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(open).toBeFocused();

    await finishWorkspaceSession(page);
  });
}
