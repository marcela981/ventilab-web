/*
* Funcionalidad: Simulator flows for the performance measurement
* Descripción: How the perf spec reaches each measured screen, behind one interface so the same instrumentation runs before and after the unified simulator. `legacy` is the current app: /simulator catalog → pick a case and the maximum speed → "Iniciar práctica" → /simulator/sessions/[id]; finishing goes through "Finalizar sesión"; the replay is /simulator/sessions/[id]/replay with its local speed buttons. A later flow for /simulador registers here with the same contract and is selected with PERF_FLOW. Depends on @playwright/test. v0.2 (W4, Bloque 1): since W1 the catalog lives in the Simular tab of the workspace, so the legacy flow opens /simulador?tab=simular directly (the /simulator redirect only applies to full page loads).
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Page } from "@playwright/test";

export type LiveSessionOptions = { caseTitle: string, timeMultiplier: number };

export type SimFlow = {
  name: string
  /** Starts a FREE session and resolves once the live console is painting. */
  startLiveSession: (page: Page, options: LiveSessionOptions) => Promise<{ sessionId: string }>
  /** Ends the live session currently on screen. */
  endLiveSession: (page: Page) => Promise<void>
  /** Opens the replay of an ended session at the given local speed and starts playback. */
  startReplay: (page: Page, sessionId: string, speed: number) => Promise<void>
  /** Restarts playback if it reached the end; returns true when it restarted. */
  keepReplayPlaying: (page: Page) => Promise<boolean>
};

const SESSION_URL = /\/simulator\/sessions\/([^/?#]+)(?:[?#].*)?$/;

const legacyFlow: SimFlow = {
  name: "legacy",
  async startLiveSession(page, { caseTitle, timeMultiplier }) {
    await page.goto("/simulador?tab=simular");
    const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: caseTitle, exact: true }) });

    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByLabel("Velocidad del tiempo simulado").selectOption(String(timeMultiplier));
    await card.getByRole("button", { name: "Iniciar práctica" }).click();
    await page.waitForURL(SESSION_URL, { timeout: 30_000 });
    await expect(page.getByRole("group", { name: "Control del tiempo" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("canvas").first()).toBeVisible();
    const sessionId = SESSION_URL.exec(new URL(page.url()).pathname)?.[1];

    if (!sessionId) {
      throw new Error(`No session id in ${page.url()}`);
    }

    return { sessionId };
  },
  async endLiveSession(page) {
    await page.getByRole("button", { name: "Finalizar sesión" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Finalizar", exact: true }).click();
    await expect(page).not.toHaveURL(SESSION_URL, { timeout: 60_000 });
  },
  async startReplay(page, sessionId, speed) {
    await page.goto(`/simulator/sessions/${sessionId}/replay`);
    const transport = page.getByRole("region", { name: "Controles de la repetición" });

    await expect(transport).toBeVisible({ timeout: 60_000 });
    // The replay may start playing on its own once loaded: wait until the transport settles on a state.
    await expect(transport.getByRole("button", { name: /^(Pausar|Reproducir|Repetir desde el inicio)$/ })).toBeVisible({ timeout: 60_000 });
    await transport.getByRole("group", { name: "Velocidad de reproducción" }).getByRole("button", { name: `×${speed}`, exact: true }).click();
    await legacyFlow.keepReplayPlaying(page);
    await expect(transport.getByRole("button", { name: "Pausar", exact: true })).toBeVisible({ timeout: 30_000 });
  },
  async keepReplayPlaying(page) {
    const play = page.getByRole("region", { name: "Controles de la repetición" }).getByRole("button", { name: /^(Reproducir|Repetir desde el inicio)$/ });

    if (await play.isVisible()) {
      await play.click();

      return true;
    }

    return false;
  },
};

const FLOWS: Record<string, SimFlow> = { [legacyFlow.name]: legacyFlow };

export function getSimFlow(name: string): SimFlow {
  const flow = FLOWS[name];

  if (!flow) {
    throw new Error(`Unknown PERF_FLOW "${name}". Known flows: ${Object.keys(FLOWS).join(", ")}`);
  }

  return flow;
}
