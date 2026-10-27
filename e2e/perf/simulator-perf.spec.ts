/*
* Funcionalidad: Simulator performance measurement
* Descripción: Runs the simulator for a fixed window per scenario and records the in-page probe (rAF fps, curve paint fps per canvas, React commits per second, long tasks, heap) plus the Chrome main-thread time from the CDP Performance domain. Scenarios: live ×1, live ×1 with CPU throttling ×4, live at the highest speed the UI offers (×4), and replay ×8 with and without throttling (the replay loops when it reaches the end). Each scenario writes <PERF_OUT_DIR>/<PERF_LABEL>-<scenario>.json. Parameters (environment): PERF_FLOW (legacy), PERF_LABEL (baseline), PERF_DURATION_S (60), PERF_WARMUP_S (5), PERF_CASE_TITLE, PERF_SCENARIOS (comma list), PERF_REPLAY_SOURCE_S (30), PERF_REPLAY_SESSION_ID (an ended session to replay instead of the last live one), PERF_OUT_DIR (docs/bloque1/perf). Depends on @playwright/test, the perf probe and the simulator flows.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { type CDPSession, type Page, test } from "@playwright/test";
import { installPerfProbe, type PerfProbeSnapshot, type PerfProbeWindow } from "./perf-probe";
import { getSimFlow } from "./sim-flows";

type Scenario = { id: string, kind: "live" | "replay", multiplier: number, cpuRate: number };

const SCENARIOS: readonly Scenario[] = [
  { id: "live-x1", kind: "live", multiplier: 1, cpuRate: 1 },
  { id: "live-x1-cpu4", kind: "live", multiplier: 1, cpuRate: 4 },
  { id: "live-x4", kind: "live", multiplier: 4, cpuRate: 1 },
  { id: "replay-x8", kind: "replay", multiplier: 8, cpuRate: 1 },
  { id: "replay-x8-cpu4", kind: "replay", multiplier: 8, cpuRate: 4 },
];

const FLOW = getSimFlow(process.env.PERF_FLOW ?? "legacy");
const LABEL = process.env.PERF_LABEL ?? "baseline";
const DURATION_S = Number(process.env.PERF_DURATION_S ?? 60);
const WARMUP_S = Number(process.env.PERF_WARMUP_S ?? 5);
const REPLAY_SOURCE_S = Number(process.env.PERF_REPLAY_SOURCE_S ?? 30);
const CASE_TITLE = process.env.PERF_CASE_TITLE ?? "Pulmón normal: postoperatorio inmediato";
const OUT_DIR = process.env.PERF_OUT_DIR ?? "docs/bloque1/perf";
const SELECTED = process.env.PERF_SCENARIOS?.split(",").map((id) => id.trim()).filter((id) => id.length > 0);
const CDP_METRICS = ["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration", "LayoutCount", "RecalcStyleCount"] as const;

type CdpMetricName = (typeof CDP_METRICS)[number];

async function readCdpMetrics(cdp: CDPSession): Promise<Record<CdpMetricName, number>> {
  const { metrics } = await cdp.send("Performance.getMetrics");
  const values = {} as Record<CdpMetricName, number>;

  for (const name of CDP_METRICS) {
    values[name] = metrics.find((metric) => metric.name === name)?.value ?? 0;
  }

  return values;
}

function currentCommit(): string | null {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function workerSizes(page: Page, urls: readonly string[]): Promise<{ url: string, rawKb: number, gzipKb: number }[]> {
  const sizes: { url: string, rawKb: number, gzipKb: number }[] = [];

  for (const url of new Set(urls)) {
    if (!url.startsWith("http")) {
      continue;
    }

    const body = await (await page.request.get(url)).body();

    sizes.push({ url: new URL(url).pathname, rawKb: Number((body.length / 1024).toFixed(1)), gzipKb: Number((gzipSync(body).length / 1024).toFixed(1)) });
  }

  return sizes;
}

// Ended session reused by the replay scenarios (the last live scenario of this run ends its session).
let endedSessionId: string | undefined = process.env.PERF_REPLAY_SESSION_ID || undefined;

test.describe.configure({ mode: "serial" });

for (const scenario of SCENARIOS) {
  const skip = SELECTED !== undefined && !SELECTED.includes(scenario.id);

  test(`${FLOW.name} · ${scenario.id}`, async ({ page, browser }) => {
    test.skip(skip, `not in PERF_SCENARIOS (${SELECTED?.join(", ") ?? ""})`);
    test.setTimeout((WARMUP_S + DURATION_S + REPLAY_SOURCE_S) * 1000 + 240_000);

    await page.addInitScript(installPerfProbe);
    const workerUrls: string[] = [];

    page.on("worker", (worker) => workerUrls.push(worker.url()));
    const cdp = await page.context().newCDPSession(page);

    await cdp.send("Performance.enable");

    let liveSessionId: string | undefined;

    if (scenario.kind === "live") {
      liveSessionId = (await FLOW.startLiveSession(page, { caseTitle: CASE_TITLE, timeMultiplier: scenario.multiplier })).sessionId;
    } else {
      if (endedSessionId === undefined) {
        const source = await FLOW.startLiveSession(page, { caseTitle: CASE_TITLE, timeMultiplier: 4 });

        await page.waitForTimeout(REPLAY_SOURCE_S * 1000);
        await FLOW.endLiveSession(page);
        endedSessionId = source.sessionId;
      }

      await FLOW.startReplay(page, endedSessionId, scenario.multiplier);
    }

    await cdp.send("Emulation.setCPUThrottlingRate", { rate: scenario.cpuRate });
    await page.waitForTimeout(WARMUP_S * 1000);
    await page.evaluate(() => (window as PerfProbeWindow).__perfProbe?.reset());
    const before = await readCdpMetrics(cdp);
    const deadline = Date.now() + DURATION_S * 1000;
    let replayRestarts = 0;

    while (Date.now() < deadline) {
      await page.waitForTimeout(Math.min(1000, Math.max(0, deadline - Date.now())));

      if (scenario.kind === "replay" && (await FLOW.keepReplayPlaying(page))) {
        replayRestarts += 1;
      }
    }

    const probe = await page.evaluate(() => (window as PerfProbeWindow).__perfProbe?.snapshot() ?? null) as PerfProbeSnapshot | null;
    const after = await readCdpMetrics(cdp);
    const windowS = (probe?.windowMs ?? DURATION_S * 1000) / 1000;
    const mainThread = Object.fromEntries(CDP_METRICS.map((name) => {
      const delta = after[name] - before[name];
      // *Duration metrics are seconds; *Count metrics are counts.
      const perSecond = name.endsWith("Duration") ? (delta * 1000) / windowS : delta / windowS;

      return [name, Number(perSecond.toFixed(2))];
    }));
    const pageUrl = page.url();

    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    const workers = await workerSizes(page, workerUrls);

    if (liveSessionId !== undefined) {
      await FLOW.endLiveSession(page);
      endedSessionId = liveSessionId;
    }

    const result = {
      meta: {
        label: LABEL,
        flow: FLOW.name,
        scenario: scenario.id,
        kind: scenario.kind,
        multiplier: scenario.multiplier,
        cpuThrottlingRate: scenario.cpuRate,
        durationS: DURATION_S,
        warmupS: WARMUP_S,
        caseTitle: CASE_TITLE,
        pageUrl: new URL(pageUrl).pathname,
        replayRestarts: scenario.kind === "replay" ? replayRestarts : null,
        webCommit: currentCommit(),
        browser: `chromium ${browser.version()}`,
        viewport: page.viewportSize(),
        measuredAt: new Date().toISOString(),
      },
      probe,
      mainThreadPerSecond: { unit: "ms of main-thread time per second (Duration) or events per second (Count)", ...mainThread },
      workers,
    };

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, `${LABEL}-${scenario.id}.json`), `${JSON.stringify(result, null, 2)}\n`);
  });
}
