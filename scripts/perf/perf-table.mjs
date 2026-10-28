/*
* Funcionalidad: Performance results table
* Descripción: Prints a Markdown table from the JSON files written by the simulator perf spec (e2e/perf) for one label, e.g. `node scripts/perf/perf-table.mjs baseline` reads docs/bloque1/perf/baseline-*.json, so the "before" and "after" documents are built from measured files only. A metric absent from a file prints "sin dato". v0.2 (Bloque 2): skips the <label>-learn.json file of the learning perf spec, which has its own table (learn-perf-table.mjs). Depends on Node only.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const label = process.argv[2] ?? "baseline";
const dir = process.argv[3] ?? "docs/bloque1/perf";
const files = readdirSync(dir).filter((file) => file.startsWith(`${label}-`) && file.endsWith(".json") && !file.includes("bundle") && !file.endsWith("-learn.json"));
const NO_DATA = "sin dato";

const value = (input) => (input === undefined || input === null ? NO_DATA : input);

function curves(canvases) {
  // Canvases still in the page at the end of the window (a replay restart may remount one).
  const live = Array.isArray(canvases) ? canvases.filter((canvas) => canvas.connected) : [];

  if (live.length === 0) {
    return NO_DATA;
  }

  const fps = live.map((canvas) => canvas.paintFps);

  return `${Math.min(...fps)}–${Math.max(...fps)} (${live.length} canvas)`;
}

console.log("| Escenario | Curvas: fps de repintado (mín–máx por canvas) | rAF fps | Frames > 50 ms | Commits React/s (máx en 1 s) | Long tasks (n / máx ms / total ms) | Hilo principal ms/s (script) |");
console.log("|---|---|---|---|---|---|---|");

for (const file of files.sort()) {
  const data = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const probe = data.probe ?? {};
  const react = probe.react ?? {};
  const tasks = probe.longTasks ?? {};
  const main = data.mainThreadPerSecond ?? {};
  const reactCell = react.hookAttached ? `${react.commitsPerSecond} (${react.maxCommitsInOneSecond})` : NO_DATA;

  console.log(`| ${data.meta.scenario} | ${curves(probe.canvases)} | ${value(probe.raf?.fps)} | ${value(probe.raf?.framesOver50Ms)} | ${reactCell} | ${value(tasks.count)} / ${value(tasks.maxMs)} / ${value(tasks.totalMs)} | ${value(main.TaskDuration)} (${value(main.ScriptDuration)}) |`);
}
