/*
* Funcionalidad: Learning performance results table
* Descripción: Prints Markdown tables from the JSON written by e2e/perf/learn-perf.spec.ts for one label, e.g. `node scripts/perf/learn-perf-table.mjs baseline docs/bloque2/perf` reads docs/bloque2/perf/baseline-learn.json: medians per screen (cold, warm and every "Siguiente" click) of the time to useful content, API requests and depth, JS chunks, long tasks and the requests fired after the content; then the API calls of the first run. A metric absent from the file prints "sin dato". Depends on Node only.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readFileSync } from "node:fs";
import { join } from "node:path";

const label = process.argv[2] ?? "baseline";
const dir = process.argv[3] ?? "docs/bloque2/perf";
const data = JSON.parse(readFileSync(join(dir, `${label}-learn.json`), "utf8"));
const NO_DATA = "sin dato";
const v = (input) => (input === undefined || input === null ? NO_DATA : input);

console.log(`Medianas de ${data.meta.runs} corridas, CPU ×${data.meta.cpuThrottlingRate}, ${data.meta.browser}, commit ${v(data.meta.webCommit)}.\n`);
console.log("| Pantalla | Visita | Tiempo al contenido (ms) | API hasta el contenido (profundidad) | Chunks JS red / caché | Profundidad con chunks | Long tasks hasta el contenido (n / ms) | Long tasks hasta +settle (n / ms / máx) | API después del contenido |");
console.log("|---|---|---|---|---|---|---|---|---|");

const row = (screen, visit, m) => {
  console.log(`| ${screen} | ${visit} | ${v(m.contentMs)} | ${v(m.api)} (${v(m.apiDepth)}) | ${v(m.chunksNetwork)} / ${v(m.chunksFromCache)} | ${v(m.depthWithChunks)} | ${v(m.longTasksUntilContent)} / ${v(m.longTasksMsUntilContent)} | ${v(m.longTasksUntilSettle)} / ${v(m.longTasksMsUntilSettle)} / ${v(m.longTaskMaxMs)} | ${v(m.apiAfterContent)} |`);
};

for (const [id, screen] of Object.entries(data.screens)) {
  row(id, "fría", screen.median.cold);
  row(id, "caliente", screen.median.warm);

  for (const next of screen.median.next) {
    row(id, `Siguiente ${next.click}`, next);
  }
}

console.log("\nPeticiones de la primera corrida:\n");

for (const [id, screen] of Object.entries(data.screens)) {
  const first = screen.runs[0];

  if (!first) {
    continue;
  }

  const visits = [["fría", first.cold], ["caliente", first.warm], ...first.next.map((next, index) => [`Siguiente ${index + 1} (${next.from} → ${next.to})`, next])];

  for (const [name, result] of visits) {
    console.log(`- ${id}, ${name}: hasta el contenido ${result.untilContent.apiCalls.join(", ") || "ninguna"}; después ${result.settle.apiAfterContent.join(", ") || "ninguna"}`);
  }
}
