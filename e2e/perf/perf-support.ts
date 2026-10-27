/*
* Funcionalidad: Shared helpers of the perf specs
* Descripción: Pieces used by every perf measurement so the scenarios and the tab-switch run report the same numbers the same way: the Chrome main-thread counters of the CDP Performance domain read before and after the window and turned into per-second rates (ms of main thread per second for *Duration, events per second for *Count), and the short hash of the web commit measured. Moved out of simulator-perf.spec.ts in W12 (Bloque 1) without changing the formulas. Depends on @playwright/test and Node.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { execSync } from "node:child_process";
import type { CDPSession } from "@playwright/test";

export const CDP_METRICS = ["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration", "LayoutCount", "RecalcStyleCount"] as const;

export type CdpMetricName = (typeof CDP_METRICS)[number];

export type CdpMetrics = Record<CdpMetricName, number>;

export async function readCdpMetrics(cdp: CDPSession): Promise<CdpMetrics> {
  const { metrics } = await cdp.send("Performance.getMetrics");
  const values = {} as CdpMetrics;

  for (const name of CDP_METRICS) {
    values[name] = metrics.find((metric) => metric.name === name)?.value ?? 0;
  }

  return values;
}

/** Per-second rates between two reads: *Duration metrics are seconds (→ ms/s), *Count metrics are counts (→ /s). */
export function mainThreadPerSecond(before: CdpMetrics, after: CdpMetrics, windowS: number): Record<CdpMetricName, number> {
  return Object.fromEntries(CDP_METRICS.map((name) => {
    const delta = after[name] - before[name];
    const perSecond = name.endsWith("Duration") ? (delta * 1000) / windowS : delta / windowS;

    return [name, Number(perSecond.toFixed(2))];
  })) as Record<CdpMetricName, number>;
}

export const MAIN_THREAD_UNIT = "ms of main-thread time per second (Duration) or events per second (Count)";

export function currentCommit(): string | null {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}
