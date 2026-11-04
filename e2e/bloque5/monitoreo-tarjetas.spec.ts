/*
* Funcionalidad: E2E July value cards of Monitoreo (Bloque 5, W5-1)
* Descripción: The per-user value cards of the July left column (DISENO_BLOQUE5 §6.7, D27) on a FREE session (Simular Paciente → "Aleatorio") at 1280×720. (1) "Ajustar" (aria-pressed) shows the adjust tools: "Ocultar PEEP total" keeps the card dimmed with "Oculta" while adjusting and drops it from the plain list; "Bajar Ppico" pressed with the keyboard swaps Ppico and Pmedia; the "Mover Vte" drag handle with the keyboard (Space lifts, ArrowUp moves, Space drops) puts Vte above "Flujo mín". The preference is stored under `ventylab.monitor.cards.v1.<userId>` and survives a reload; "Restablecer tarjetas" brings back the default order and removes the key. (2) A corrupt stored value (not JSON) and a preference stored for another user both leave the default order, without page errors. The order is read from the terms of the list "Valores del monitor". Each test finishes its session. v0.1 (Bloque 5, W5-1): first version. Depends on @playwright/test and the auth, backend API and simulator e2e helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Locator, type Page, test } from "@playwright/test";
import { STUDENT_STORAGE_STATE } from "../support/auth";
import { savedUserOf } from "../support/backend-api";
import { COMPACT_VIEWPORT, finishWorkspaceSession, startPatientSession } from "../support/simulator";

test.use({ viewport: COMPACT_VIEWPORT });

const STORAGE_PREFIX = "ventylab.monitor.cards.v1.";
const DEFAULT_START = ["Ppico", "Pmedia", "PEEP total", "Flujo máx", "Flujo mín", "Vte"];

function cardsList(page: Page): Locator {
  return page.getByRole("region", { name: "Valores" }).getByRole("list", { name: "Valores del monitor" });
}

async function cardOrder(page: Page): Promise<string[]> {
  return (await cardsList(page).getByRole("term").allInnerTexts()).map((text) => text.trim());
}

async function storedPref(page: Page, key: string): Promise<string | null> {
  return page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key);
}

async function waitForSimulating(page: Page): Promise<void> {
  await expect(page.getByRole("status", { name: "Estado de la señal" })).toHaveText("Simulando", { timeout: 30_000 });
  await expect(cardsList(page)).toBeVisible();
}

test("Ajustar hides, moves with the keyboard, persists across a reload and resets", async ({ page }) => {
  test.setTimeout(180_000);
  const key = `${STORAGE_PREFIX}${savedUserOf(STUDENT_STORAGE_STATE).id}`;

  await page.goto("/simulador");
  await page.evaluate((storageKey) => window.localStorage.removeItem(storageKey), key);
  await startPatientSession(page);
  expect((await cardOrder(page)).slice(0, 6)).toEqual(DEFAULT_START);

  const adjust = page.getByRole("button", { name: "Ajustar" });

  await adjust.click();
  await expect(adjust).toHaveAttribute("aria-pressed", "true");

  // Hide PEEP total: dimmed with "Oculta" while adjusting.
  await cardsList(page).getByRole("button", { name: "Ocultar PEEP total" }).click();
  const show = cardsList(page).getByRole("button", { name: "Mostrar PEEP total" });

  await expect(show).toHaveAttribute("aria-pressed", "true");
  await expect(cardsList(page).getByRole("listitem").filter({ has: page.getByRole("button", { name: "Mostrar PEEP total" }) })).toContainText("Oculta");

  // "Bajar Ppico" from the keyboard.
  await cardsList(page).getByRole("button", { name: "Bajar Ppico" }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await cardOrder(page)).slice(0, 2)).toEqual(["Pmedia", "Ppico"]);

  // The drag handle with the keyboard sensor: Space lifts, ArrowUp moves, Space drops.
  await cardsList(page).getByRole("button", { name: "Mover Vte" }).focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await expect.poll(async () => (await cardOrder(page)).slice(0, 6)).toEqual(["Pmedia", "Ppico", "PEEP total", "Flujo máx", "Vte", "Flujo mín"]);

  // Out of "Ajustar" the hidden card leaves the list.
  await adjust.click();
  await expect(adjust).toHaveAttribute("aria-pressed", "false");
  const adjusted = ["Pmedia", "Ppico", "Flujo máx", "Vte", "Flujo mín"];

  await expect.poll(async () => (await cardOrder(page)).slice(0, 5)).toEqual(adjusted);
  expect(await storedPref(page, key)).toContain("totalPeep");

  // Persisted per user: the same order after a reload.
  await page.reload();
  await waitForSimulating(page);
  await expect.poll(async () => (await cardOrder(page)).slice(0, 5)).toEqual(adjusted);
  expect(await cardOrder(page)).not.toContain("PEEP total");

  // "Restablecer tarjetas": defaults again and the key is removed.
  await adjust.click();
  await page.getByRole("button", { name: "Restablecer tarjetas" }).click();
  await expect.poll(async () => (await cardOrder(page)).slice(0, 6)).toEqual(DEFAULT_START);
  await adjust.click();
  expect(await storedPref(page, key)).toBeNull();

  await finishWorkspaceSession(page);
});

test("a corrupt preference or another user's preference leaves the default cards", async ({ page }) => {
  test.setTimeout(180_000);
  const key = `${STORAGE_PREFIX}${savedUserOf(STUDENT_STORAGE_STATE).id}`;
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/simulador");
  await page.evaluate(({ own, other }) => {
    window.localStorage.setItem(own, "{not json");
    window.localStorage.setItem(other, JSON.stringify({ version: 1, order: ["vte"], hidden: ["peakPressure"], known: [] }));
  }, { own: key, other: `${STORAGE_PREFIX}another-user` });

  try {
    await startPatientSession(page);
    expect((await cardOrder(page)).slice(0, 6)).toEqual(DEFAULT_START);
    await expect(page.getByRole("button", { name: "Ajustar" })).toBeEnabled();
    expect(errors).toEqual([]);
    await finishWorkspaceSession(page);
  } finally {
    await page.evaluate(({ own, other }) => {
      window.localStorage.removeItem(own);
      window.localStorage.removeItem(other);
    }, { own: key, other: `${STORAGE_PREFIX}another-user` });
  }
});
