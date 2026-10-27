/*
* Funcionalidad: Tab-switch performance run of /simulador
* Descripción: Starts a FREE session from Simular Paciente (same case as the perf scenarios), then for PERF_TAB_SWITCH_S seconds (60) switches between Monitoreo and Conexión every PERF_TAB_SWITCH_EVERY_S seconds (10) while the in-page probe and the CDP counters record the window. It checks that the session survives (same ?session, simulated clock advancing about one second per second, "Simulando" when back in Monitoreo) and that no long task above 50 ms happened, and writes <PERF_OUT_DIR>/<PERF_LABEL>-tab-switch.json before asserting so a failure still leaves the numbers. Runs only with PERF_FLOW=simulador (it measures the workspace itself). Depends on @playwright/test, the perf probe, the perf support helpers and the e2e simulator helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { finishWorkspaceSession, simulatedSeconds, startPatientSession, workspaceTab } from "../support/simulator";
import { installPerfProbe, type PerfProbeSnapshot, type PerfProbeWindow } from "./perf-probe";
import { currentCommit, MAIN_THREAD_UNIT, mainThreadPerSecond, readCdpMetrics } from "./perf-support";

const FLOW = process.env.PERF_FLOW ?? "legacy";
const LABEL = process.env.PERF_LABEL ?? "baseline";
const DURATION_S = Number(process.env.PERF_TAB_SWITCH_S ?? 60);
const EVERY_S = Number(process.env.PERF_TAB_SWITCH_EVERY_S ?? 10);
const WARMUP_S = Number(process.env.PERF_WARMUP_S ?? 5);
const CASE_TITLE = process.env.PERF_CASE_TITLE ?? "Pulmón normal: postoperatorio inmediato";
const OUT_DIR = process.env.PERF_OUT_DIR ?? "docs/bloque1/perf";
const TABS = ["Conexión", "Monitoreo"] as const;

test("simulador · tab-switch", async ({ page, browser }) => {
  test.skip(FLOW !== "simulador", "measures /simulador only (PERF_FLOW=simulador)");
  test.setTimeout((WARMUP_S + DURATION_S) * 1000 + 180_000);

  await page.addInitScript(installPerfProbe);
  const cdp = await page.context().newCDPSession(page);

  await cdp.send("Performance.enable");
  const { sessionId } = await startPatientSession(page, { caseTitle: CASE_TITLE });

  await page.waitForTimeout(WARMUP_S * 1000);
  await page.evaluate(() => (window as PerfProbeWindow).__perfProbe?.reset());
  const before = await readCdpMetrics(cdp);
  const clockStart = await simulatedSeconds(page);
  const startedAt = Date.now();
  const switches: { atS: number, tab: string, session: string | null }[] = [];

  for (let index = 0; (index + 1) * EVERY_S <= DURATION_S; index += 1) {
    await page.waitForTimeout(Math.max(0, startedAt + (index + 1) * EVERY_S * 1000 - Date.now()));
    const tab = TABS[index % TABS.length] ?? "Monitoreo";

    await workspaceTab(page, tab).click();
    switches.push({ atS: Number(((Date.now() - startedAt) / 1000).toFixed(1)), tab, session: new URL(page.url()).searchParams.get("session") });
  }

  const probe = await page.evaluate(() => (window as PerfProbeWindow).__perfProbe?.snapshot() ?? null) as PerfProbeSnapshot | null;
  const after = await readCdpMetrics(cdp);
  const elapsedS = (Date.now() - startedAt) / 1000;

  await workspaceTab(page, "Monitoreo").click();
  const status = await page.getByRole("status", { name: "Estado de la señal" }).innerText();
  const clockEnd = await simulatedSeconds(page);
  const windowS = (probe?.windowMs ?? DURATION_S * 1000) / 1000;
  const result = {
    meta: {
      label: LABEL,
      flow: "simulador",
      scenario: "tab-switch",
      durationS: DURATION_S,
      switchEveryS: EVERY_S,
      warmupS: WARMUP_S,
      caseTitle: CASE_TITLE,
      sessionId,
      webCommit: currentCommit(),
      browser: `chromium ${browser.version()}`,
      viewport: page.viewportSize(),
      measuredAt: new Date().toISOString(),
    },
    session: {
      switches,
      sameSessionEverySwitch: switches.every((entry) => entry.session === sessionId),
      simulatedClockStartS: clockStart,
      simulatedClockEndS: clockEnd,
      wallClockS: Number(elapsedS.toFixed(1)),
      statusBackInMonitoreo: status,
    },
    probe,
    mainThreadPerSecond: { unit: MAIN_THREAD_UNIT, ...mainThreadPerSecond(before, after, windowS) },
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${LABEL}-tab-switch.json`), `${JSON.stringify(result, null, 2)}\n`);

  expect(result.session.sameSessionEverySwitch).toBe(true);
  expect(status).toBe("Simulando");
  // The simulated clock keeps running at ×1 while Conexión is shown (a 2 s margin for the clock display rounding).
  expect(clockEnd - clockStart).toBeGreaterThanOrEqual(Math.floor(elapsedS) - 2);
  expect(probe?.longTasks.supported).toBe(true);
  expect(probe?.longTasks.count).toBe(0);

  await finishWorkspaceSession(page);
});
