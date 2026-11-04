/*
* Funcionalidad: Simulator perf scenario interactions
* Descripción: What the simulator perf spec does on the page for the scenarios that measure an interaction, and the PERF_VIEWPORT parser. `prepare` runs once the live session is on screen and returns null when the scenario can run, or the reason to skip it when the control it needs is absent or disabled (e.g. "Ajustar" before the July value cards exist), so a scenario never fails on a UI that does not offer it yet; `tick` runs once per second of the measured window and `finish` after it (leaving the page as it was). live-x1-ai-drawer opens "Asesoría IA"; live-x1-adjust enters "Ajustar" and makes 10 keyboard moves spread over the window (drag handle "Mover <tarjeta>": Space, ArrowDown, Space; else the "Bajar <tarjeta>" button with Enter), then restores the default cards and leaves; live-x1-loop turns the P-V loop on (two canvases). v0.1 (Bloque 5): first version. v0.2 (Bloque 5, W5-3): live-x1-ai-drawer closes the panel from the keyboard (focus + Enter on "Asesoría IA"), since the open panel covers the button and intercepts a pointer click in both the classic and the July layouts. Depends on @playwright/test.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { Locator, Page } from "@playwright/test";

export type ScenarioInteraction = {
  /** null: ready to measure; a string: why the scenario is skipped (the control is absent or disabled). */
  prepare: (page: Page) => Promise<string | null>
  /** Once per elapsed second of the measured window. */
  tick?: (page: Page, elapsedS: number, durationS: number) => Promise<void>
  finish?: (page: Page) => Promise<void>
};

const ADJUST_MOVES = 10;

/** "1280x720" → { width: 1280, height: 720 }; unset or malformed → null (the project viewport stays). */
export function parseViewport(raw: string | undefined): { width: number, height: number } | null {
  const match = /^\s*(\d{3,5})\s*[x×]\s*(\d{3,5})\s*$/i.exec(raw ?? "");

  if (!match) {
    return null;
  }

  return { width: Number(match[1]), height: Number(match[2]) };
}

async function usable(control: Locator): Promise<boolean> {
  return (await control.count()) > 0 && (await control.first().isVisible()) && (await control.first().isEnabled());
}

function adjustButton(page: Page): Locator {
  return page.getByRole("button", { name: "Ajustar", exact: true });
}

/** One keyboard move of a value card: the dnd handle when there is one, else the deterministic "Bajar" button. */
async function moveOneCard(page: Page): Promise<void> {
  const handle = page.getByRole("button", { name: /^Mover / }).first();

  if ((await handle.count()) > 0) {
    await handle.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");

    return;
  }

  const down = page.getByRole("button", { name: /^Bajar / }).first();

  if ((await down.count()) > 0) {
    await down.focus();
    await page.keyboard.press("Enter");
  }
}

export const SCENARIO_INTERACTIONS: Readonly<Record<string, ScenarioInteraction>> = {
  "live-x1-ai-drawer": {
    async prepare(page) {
      const open = page.getByRole("button", { name: "Asesoría IA", exact: true });

      if (!(await usable(open))) {
        return "\"Asesoría IA\" is absent or disabled in this session";
      }

      await open.first().click();

      return null;
    },
    async finish(page) {
      const open = page.getByRole("button", { name: "Asesoría IA", exact: true }).first();

      // Keyboard, not a pointer click: the open panel covers the button and intercepts pointer events.
      if ((await open.getAttribute("aria-expanded")) === "true") {
        await open.press("Enter");
      }
    },
  },
  "live-x1-adjust": {
    async prepare(page) {
      if (!(await usable(adjustButton(page)))) {
        return "the value cards have no \"Ajustar\" mode in this UI (July layout not mounted)";
      }

      await adjustButton(page).first().click();

      return null;
    },
    async tick(page, elapsedS, durationS) {
      const every = Math.max(1, Math.floor(durationS / ADJUST_MOVES));

      if (elapsedS % every === 0 && elapsedS / every <= ADJUST_MOVES) {
        await moveOneCard(page);
      }
    },
    async finish(page) {
      const reset = page.getByRole("button", { name: "Restablecer tarjetas" });

      if (await usable(reset)) {
        await reset.first().click();
      }

      if ((await adjustButton(page).first().getAttribute("aria-pressed")) === "true") {
        await adjustButton(page).first().click();
      }
    },
  },
  "live-x1-loop": {
    async prepare(page) {
      const pv = page.getByRole("group", { name: "Bucles" }).getByRole("button", { name: "P-V", exact: true });

      if (!(await usable(pv))) {
        return "the curves have no \"Bucles\" P-V option in this UI";
      }

      await pv.first().click();

      return null;
    },
  },
};
