/*
* Funcionalidad: E2E helpers of the unified simulator
* Descripción: Steps shared by the functional specs and the perf flow on /simulador: start a FREE session from the Simular Paciente tab (a published case through "Cargar caso" or a random patient through "Aleatorio", optional patient name, the required vitals when the case has none) and wait for Monitoreo with ?session=; read the simulated clock of "Control del tiempo"; take a signature of the curves canvas to prove it keeps painting; finish the session through "Finalizar sesión" up to the result dialog. Depends on @playwright/test.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Locator, type Page } from "@playwright/test";

export const CURVES_LABEL = "Curvas de presión, flujo y volumen";

/**
 * Below ~1440 px wide the console grid collapses the curves column to ~1 px (layout issue found in W12, not fixed
 * here), so the simulator specs use the same 1920×1080 viewport as the perf measurement.
 */
export const SIMULATOR_VIEWPORT = { width: 1920, height: 1080 } as const;

export type StartPatientOptions = {
  /** Published case loaded through "Cargar caso"; without it the form uses "Aleatorio". */
  caseTitle?: string
  patientName?: string
};

const MONITORING_URL = /[?&]tab=monitoreo&session=[^&#]+/;

export function workspaceTab(page: Page, name: string): Locator {
  return page.getByRole("tablist", { name: "Secciones del simulador" }).getByRole("tab", { name, exact: true });
}

async function loadCase(page: Page, caseTitle: string): Promise<void> {
  await page.getByRole("button", { name: "Cargar caso" }).click();
  const dialog = page.getByRole("dialog", { name: "Cargar caso clínico" });
  const load = dialog.getByRole("button", { name: `Cargar: ${caseTitle}`, exact: true });
  const next = dialog.getByRole("button", { name: "Siguiente", exact: true });

  await expect(dialog.getByRole("list", { name: "Casos clínicos publicados" })).toBeVisible({ timeout: 30_000 });

  // The catalog is paginated: walk the pages until the case shows up.
  while (!(await load.isVisible()) && (await next.isEnabled())) {
    await next.click();
    await page.waitForTimeout(500);
  }

  await load.click();
  await expect(dialog).toBeHidden();
}

async function fillWhenEmpty(field: Locator, value: string): Promise<void> {
  if ((await field.inputValue()) === "") {
    await field.fill(value);
  }
}

/** Starts a FREE session from Simular Paciente and returns its id once Monitoreo shows it simulating. */
export async function startPatientSession(page: Page, options: StartPatientOptions = {}): Promise<{ sessionId: string }> {
  await page.goto("/simulador?tab=simular");
  await expect(page.getByRole("heading", { name: "Configuración del Paciente" })).toBeVisible({ timeout: 30_000 });

  if (options.caseTitle) {
    await loadCase(page, options.caseTitle);
  } else {
    await page.getByRole("button", { name: "Aleatorio" }).click();
  }

  if (options.patientName) {
    await page.getByRole("textbox", { name: "Nombre (opcional)" }).fill(options.patientName);
  }

  await page.getByRole("button", { name: "Siguiente →" }).click();
  // Engine cases without initial vitals leave the two required vitals empty.
  await fillWhenEmpty(page.getByRole("spinbutton", { name: "Frec. Resp." }), "16");
  await fillWhenEmpty(page.getByRole("spinbutton", { name: "SpO₂" }), "97");
  await page.getByRole("button", { name: "Enviar al Monitoreo" }).click();

  await expect(page).toHaveURL(MONITORING_URL, { timeout: 30_000 });
  await expect(page.getByRole("status", { name: "Estado de la señal" })).toHaveText("Simulando", { timeout: 30_000 });
  await expect(page.getByRole("img", { name: CURVES_LABEL })).toBeVisible();
  const sessionId = new URL(page.url()).searchParams.get("session");

  if (!sessionId) {
    throw new Error(`No session id in ${page.url()}`);
  }

  return { sessionId };
}

/** Simulated time shown by "Control del tiempo", in seconds. */
export async function simulatedSeconds(page: Page): Promise<number> {
  const text = await page.getByRole("group", { name: "Control del tiempo" }).getByRole("status").first().innerText();
  const parts = text.trim().split(":").map(Number);

  if (parts.length === 0 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Unexpected simulated clock "${text}"`);
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** Cheap signature of the curves canvas pixels (changes whenever the painter draws new samples). */
export async function curvesSignature(page: Page): Promise<string> {
  return page.getByRole("img", { name: CURVES_LABEL }).evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.toDataURL();
    let hash = 0;

    for (let index = 0; index < data.length; index += 1) {
      hash = (hash * 31 + data.charCodeAt(index)) | 0;
    }

    return `${canvas.width}x${canvas.height}:${data.length}:${hash}`;
  });
}

/** Ends the running session from Monitoreo and waits for the result dialog. */
export async function finishWorkspaceSession(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Finalizar sesión" }).click();
  await page.getByRole("dialog", { name: "¿Finalizar la sesión?" }).getByRole("button", { name: "Finalizar", exact: true }).click();
  const result = page.getByRole("dialog", { name: "Resultado de la sesión" });

  await expect(result).toBeVisible({ timeout: 60_000 });

  return result;
}
