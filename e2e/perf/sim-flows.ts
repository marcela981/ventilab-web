/*
* Funcionalidad: Simulator flows for the performance measurement
* Descripción: How the perf spec reaches each measured screen, behind one interface so the same instrumentation runs before and after the unified simulator. `legacy` is the current app: /simulator catalog → pick a case and the maximum speed → "Iniciar práctica" → /simulator/sessions/[id]; finishing goes through "Finalizar sesión"; the replay is /simulator/sessions/[id]/replay with its local speed buttons. A later flow for /simulador registers here with the same contract and is selected with PERF_FLOW. Depends on @playwright/test. v0.2 (W4, Bloque 1): since W1 the catalog lives in the Simular tab of the workspace, so the legacy flow opens /simulador?tab=simular directly (the /simulator redirect only applies to full page loads). v0.3 (W12, Bloque 1): adds the `simulador` flow (Simular Paciente → "Cargar caso" → "Enviar al Monitoreo" on /simulador, finish through the result dialog, replay inside Mis sesiones with ?tab=sesiones&replay=); since W8 the catalog cards are gone, so `legacy` starts the session the same way and then opens the standalone page /simulator/sessions/[id] (the direct-link and EXAM host) to keep measuring the old routes. Both flows declare `maxLiveMultiplier`: a FREE session started from the form runs at most at ×1 (the form has no speed choice), so live ×4 is not reachable any more.
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type Page } from "@playwright/test";
import { finishWorkspaceSession, startPatientSession } from "../support/simulator";

export type LiveSessionOptions = { caseTitle: string, timeMultiplier: number };

export type SimFlow = {
  name: string
  /** Highest live speed the flow can start a session with. */
  maxLiveMultiplier: number
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
const FORM_MAX_MULTIPLIER = 1;

function assertMultiplier(flow: string, timeMultiplier: number): void {
  if (timeMultiplier > FORM_MAX_MULTIPLIER) {
    throw new Error(`The ${flow} flow cannot start a live session at ×${timeMultiplier} (maximum ×${FORM_MAX_MULTIPLIER})`);
  }
}

function replayTransport(page: Page) {
  return page.getByRole("region", { name: "Controles de la repetición" });
}

async function keepReplayPlaying(page: Page): Promise<boolean> {
  const play = replayTransport(page).getByRole("button", { name: /^(Reproducir|Repetir desde el inicio)$/ });

  if (await play.isVisible()) {
    await play.click();

    return true;
  }

  return false;
}

/** Waits for the replay transport, picks the local speed and starts playback. */
async function playReplay(page: Page, speed: number): Promise<void> {
  const transport = replayTransport(page);

  await expect(transport).toBeVisible({ timeout: 60_000 });
  // The replay may start playing on its own once loaded: wait until the transport settles on a state.
  await expect(transport.getByRole("button", { name: /^(Pausar|Reproducir|Repetir desde el inicio)$/ })).toBeVisible({ timeout: 60_000 });
  await transport.getByRole("group", { name: "Velocidad de reproducción" }).getByRole("button", { name: `×${speed}`, exact: true }).click();
  await keepReplayPlaying(page);
  await expect(transport.getByRole("button", { name: "Pausar", exact: true })).toBeVisible({ timeout: 30_000 });
}

const legacyFlow: SimFlow = {
  name: "legacy",
  maxLiveMultiplier: FORM_MAX_MULTIPLIER,
  async startLiveSession(page, { caseTitle, timeMultiplier }) {
    assertMultiplier(legacyFlow.name, timeMultiplier);
    const { sessionId } = await startPatientSession(page, { caseTitle });

    await page.goto(`/simulator/sessions/${sessionId}`);
    await expect(page.getByRole("group", { name: "Control del tiempo" })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("canvas").first()).toBeVisible();

    return { sessionId };
  },
  async endLiveSession(page) {
    await page.getByRole("button", { name: "Finalizar sesión" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Finalizar", exact: true }).click();
    await expect(page).not.toHaveURL(SESSION_URL, { timeout: 60_000 });
  },
  async startReplay(page, sessionId, speed) {
    await page.goto(`/simulator/sessions/${sessionId}/replay`);
    await playReplay(page, speed);
  },
  keepReplayPlaying,
};

const simuladorFlow: SimFlow = {
  name: "simulador",
  maxLiveMultiplier: FORM_MAX_MULTIPLIER,
  async startLiveSession(page, { caseTitle, timeMultiplier }) {
    assertMultiplier(simuladorFlow.name, timeMultiplier);

    return startPatientSession(page, { caseTitle });
  },
  async endLiveSession(page) {
    const result = await finishWorkspaceSession(page);

    await result.getByRole("button", { name: "Cerrar" }).click();
    await expect(result).toBeHidden();
  },
  async startReplay(page, sessionId, speed) {
    await page.goto(`/simulador?tab=sesiones&replay=${sessionId}`);
    await playReplay(page, speed);
  },
  keepReplayPlaying,
};

const FLOWS: Record<string, SimFlow> = { [legacyFlow.name]: legacyFlow, [simuladorFlow.name]: simuladorFlow };

export function getSimFlow(name: string): SimFlow {
  const flow = FLOWS[name];

  if (!flow) {
    throw new Error(`Unknown PERF_FLOW "${name}". Known flows: ${Object.keys(FLOWS).join(", ")}`);
  }

  return flow;
}
