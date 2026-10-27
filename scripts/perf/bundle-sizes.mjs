/*
* Funcionalidad: Route bundle sizes
* Descripción: Reads .next/build-manifest.json after `npm run build` (webpack, pages router) and prints, per route, the JavaScript that the route adds on top of the shared files (_app + main + polyfills) and its first load, both raw and gzip (zlib default level, the same compression `next start` serves). Routes default to the simulator ones; pass others as arguments. `--json <file>` also writes the numbers as JSON, `--next <dir>` points to another build folder. Routes missing from the manifest are reported as such, never estimated. Depends on Node only.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";

const DEFAULT_ROUTES = [
  "/simulador",
  "/simulator",
  "/simulator/sessions/[sessionId]",
  "/simulator/sessions/[sessionId]/replay",
  "/simulator/sessions/[sessionId]/result",
  "/lab/live",
  "/lab/recordings/[recordingId]",
];

function parseArgs(argv) {
  const options = { nextDir: ".next", json: null, routes: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      options.json = argv[++index];
    } else if (arg === "--next") {
      options.nextDir = argv[++index];
    } else {
      options.routes.push(arg);
    }
  }

  if (options.routes.length === 0) {
    options.routes = DEFAULT_ROUTES;
  }

  return options;
}

const kb = (bytes) => Number((bytes / 1024).toFixed(1));

function measure(nextDir, files) {
  return files
    .filter((file) => file.endsWith(".js"))
    .reduce((total, file) => {
      const body = readFileSync(join(nextDir, file));

      return { raw: total.raw + body.length, gzip: total.gzip + gzipSync(body).length };
    }, { raw: 0, gzip: 0 });
}

const options = parseArgs(process.argv.slice(2));
const manifest = JSON.parse(readFileSync(join(options.nextDir, "build-manifest.json"), "utf8"));
const shared = [...new Set([...(manifest.polyfillFiles ?? []), ...(manifest.rootMainFiles ?? []), ...(manifest.pages["/_app"] ?? [])])];
const sharedSize = measure(options.nextDir, shared);
const routes = options.routes.map((route) => {
  const files = manifest.pages[route];

  if (!files) {
    return { route, present: false };
  }

  const own = measure(options.nextDir, files.filter((file) => !shared.includes(file)));
  const firstLoad = measure(options.nextDir, [...new Set([...shared, ...files])]);

  return { route, present: true, pageOnlyGzipKb: kb(own.gzip), pageOnlyRawKb: kb(own.raw), firstLoadGzipKb: kb(firstLoad.gzip), firstLoadRawKb: kb(firstLoad.raw) };
});

console.log(`| Ruta | Propio gz (KB) | First load gz (KB) | First load sin comprimir (KB) |`);
console.log(`|---|---|---|---|`);
console.log(`| compartido (_app + main) | — | ${kb(sharedSize.gzip)} | ${kb(sharedSize.raw)} |`);

for (const entry of routes) {
  console.log(entry.present
    ? `| \`${entry.route}\` | ${entry.pageOnlyGzipKb} | ${entry.firstLoadGzipKb} | ${entry.firstLoadRawKb} |`
    : `| \`${entry.route}\` | no existe en el build | — | — |`);
}

if (options.json) {
  mkdirSync(dirname(options.json), { recursive: true });
  writeFileSync(options.json, `${JSON.stringify({ measuredAt: new Date().toISOString(), shared: { gzipKb: kb(sharedSize.gzip), rawKb: kb(sharedSize.raw) }, routes }, null, 2)}\n`);
}
