/*
* Funcionalidad: Lab live lazy boundary test
* Descripción: Walks the STATIC import graph (value imports and re-exports of local files; `import type` and dynamic `import()` are not followed) from the /lab route modules and the ventilator-lab public index, and checks that none reaches the shared ventilator console, the waveforms, the charts module or Chart.js: the console and its adapter must land only in the lazy /lab/live chunk. As a control, the lazily imported live console module does reach the console. v1.1 (T6 review fix S4): limitations — the scan is regex based (imports are matched as text, not parsed), it resolves only relative specifiers and the `@shared/` and `@features/` aliases (a legacy `@/` alias import, or a bare package other than the listed heavy ones, is not followed), and it checks the source graph, not the emitted chunks (the bundle check stays a manual step). v1.2 (T11): also the recordings routes and pages; the recording player (console, waveforms, charts) is reached only through the dynamic import of the lazy recording player. Depends on vitest and node:fs. v1.3 (W1 Bloque 1): the /lab and /lab/live pages are gone; the /simulador route and the simulator-workspace index (which loads the lab pages through dynamic imports) are checked instead.
*   v1.4 (W11, Bloque 1): the live page is gone; the real monitor of /simulador (and the live entry it imports) are
*   checked instead: the live console stays reachable only through its dynamic import.
*   v1.5 (W7-fix, Bloque 1): the /simulador route and the simulator-workspace index do not statically reach the lab
*   connection controller, the ventilator-lab connection entry, the request layer or axios; the controller is reached
*   only through the dynamic import of LiveLabConnectionSource.
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const ALIASES: ReadonlyArray<[string, string]> = [
  ["@shared/", "src/shared/"],
  ["@features/", "src/features/"],
];
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const HEAVY = [/^@shared\/ventilator-console(\/|$)/, /^@shared\/waveforms(\/|$)/, /^@shared\/charts(\/|$)/, /^chart\.js(\/|$)/, /^react-chartjs-2$/];
const STATIC_IMPORT = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?(?:[\w*{}\s,$]*?\s+from\s+)?["']([^"']+)["']/g;

function resolveFile(base: string): string | null {
  const candidates = [base, ...EXTENSIONS.map((extension) => `${base}${extension}`), ...EXTENSIONS.map((extension) => join(base, `index${extension}`))];

  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

function resolveSpecifier(specifier: string, from: string): string | null {
  if (specifier.startsWith(".")) {
    return resolveFile(resolve(dirname(from), specifier));
  }

  const alias = ALIASES.find(([prefix]) => specifier.startsWith(prefix));

  return alias ? resolveFile(join(ROOT, alias[1], specifier.slice(alias[0].length))) : null;
}

/** Heavy specifiers statically reachable from the entry, with the importing file. */
function heavyImports(entry: string, patterns: readonly RegExp[] = HEAVY): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const queue = [join(ROOT, entry)];

  while (queue.length > 0) {
    const file = queue.pop() as string;

    if (seen.has(file)) {
      continue;
    }

    seen.add(file);
    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(STATIC_IMPORT)) {
      const [, typeOnly, specifier = ""] = match;

      if (typeOnly) {
        continue;
      }

      if (patterns.some((pattern) => pattern.test(specifier))) {
        found.push(`${file.slice(ROOT.length + 1)} → ${specifier}`);
        continue;
      }

      const target = resolveSpecifier(specifier, file);

      if (target && !/\.(test|spec)\./.test(target)) {
        queue.push(target);
      }
    }
  }

  return found;
}

describe("/lab lazy console boundary", () => {
  it.each([
    "pages/simulador/index.tsx",
    "src/features/simulator-workspace/index.ts",
    "pages/lab/reservations/index.tsx",
    "src/features/ventilator-lab/index.ts",
    "src/features/ventilator-lab/live.entry.ts",
    "src/features/simulator-workspace/application/components/monitoring/real/real-monitor.tsx",
    // T11: the recordings list and the playback page (the player is lazy).
    "pages/lab/recordings/index.tsx",
    "pages/lab/recordings/[recordingId].tsx",
    "src/features/ventilator-lab/application/pages/lab-recordings.page.tsx",
    "src/features/ventilator-lab/application/pages/lab-recording.page.tsx",
  ])("%s does not statically import the console, waveforms or charts", (entry) => {
    expect(heavyImports(entry)).toEqual([]);
  }, 20_000);

  it("loads the console module only through a dynamic import, which does reach the console", () => {
    const lazy = readFileSync(join(ROOT, "src/features/ventilator-lab/application/components/lazy-live-console.tsx"), "utf8");

    expect(lazy).toContain('import("./live-console")');
    expect(heavyImports("src/features/ventilator-lab/application/components/live-console.tsx").length).toBeGreaterThan(0);
  });

  it("loads the recording player only through a dynamic import, which does reach the console (T11)", () => {
    const lazy = readFileSync(join(ROOT, "src/features/ventilator-lab/application/components/lazy-recording-player.tsx"), "utf8");

    expect(lazy).toContain('import("./recording-player")');
    expect(heavyImports("src/features/ventilator-lab/application/components/recording-player.tsx").length).toBeGreaterThan(0);
  });
});

// W7-fix: the connection controller of /simulador (ventilator-lab connection entry, its dialogs, the request layer and
// axios) loads lazily with LiveLabConnectionSource, never in the initial route chunk.
const CONNECTION_HEAVY = [
  /^axios$/,
  /^@shared\/api-client\/api-request$/,
  /^@features\/ventilator-lab\/connection\.entry$/,
  /use-lab-connection-controller$/,
];

describe("/simulador lazy lab connection boundary (W7-fix)", () => {
  it.each([
    "pages/simulador/index.tsx",
    "src/features/simulator-workspace/index.ts",
  ])("%s does not statically import the connection controller, the request layer or axios", (entry) => {
    expect(heavyImports(entry, CONNECTION_HEAVY)).toEqual([]);
  }, 20_000);

  it("loads the controller only through a dynamic import, which does reach the connection entry", () => {
    const provider = readFileSync(join(ROOT, "src/features/simulator-workspace/application/components/lab-connection-provider.tsx"), "utf8");

    expect(provider).toContain('import("./live-lab-connection-source")');
    expect(heavyImports("src/features/simulator-workspace/application/components/live-lab-connection-source.tsx", CONNECTION_HEAVY).length).toBeGreaterThan(0);
  });
});
