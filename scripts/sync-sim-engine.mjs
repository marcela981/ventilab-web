/*
* Funcionalidad: Sincronizador del motor de simulación vendorizado
* Descripción: Copia el motor fisiológico del backend (../ventylab-server/src/features/simulation/domain/engine/**,
*   sin archivos de prueba) y su única dependencia externa (src/common/domain/ventilator/ventilator-limits.ts)
*   a src/shared/sim-engine/engine/, conservando la estructura relativa. Transformaciones mínimas y
*   deterministas: (1) reescribe el import `@/common/domain/ventilator/ventilator-limits` a una ruta relativa;
*   (2) marca como `type` los nombres importados que el módulo de origen solo exporta como tipos, porque
*   tsconfig.strict.json usa verbatimModuleSyntax; (3) reemplaza el header original por uno que indica que el
*   archivo es GENERADO, conservando su funcionalidad, descripción y versión; (4) normaliza los saltos de línea a LF;
*   (5) agrega `// @ts-nocheck` después del header: el frontend compila con noUncheckedIndexedAccess y el backend no,
*   así que el acceso indexado del motor (unos 13 sitios) no compila aquí. El motor ya se verifica con el tsc del
*   backend (baseline verde) y --check garantiza que la copia no se desvía; los tipos exportados siguen tipando a los
*   consumidores del frontend.
*   v1.1: escribe también engine/SOURCE.json (generado, determinista) con el SHA-256 de cada archivo fuente del
*   backend (normalizado a LF) y un hash combinado, para que la deriva sea visible en el diff; --check compara
*   TODOS los archivos de engine/ (no solo .ts), así que cualquier archivo sobrante se reporta como stale.
*   v1.2 (T11 case-editor): vendoriza también los rangos fisiológicos de los casos clínicos
*   (src/features/clinical-cases/domain/clinical-case-physiological-ranges.ts, sin dependencias) en
*   engine/clinical-cases/, la fuente única de los rangos que muestra el editor de casos (el backend
*   rechaza con 422 los valores fuera de ellos).
*   Uso: node scripts/sync-sim-engine.mjs        (escribe la copia)
*        node scripts/sync-sim-engine.mjs --check (sale con código 1 si la copia difiere del backend)
*   Depende solo de node:fs y node:path.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKEND_SRC = path.resolve(ROOT, "..", "ventylab-server", "src");
const ENGINE_SRC = path.join(BACKEND_SRC, "features", "simulation", "domain", "engine");
const LIMITS_SRC = path.join(BACKEND_SRC, "common", "domain", "ventilator", "ventilator-limits.ts");
// Physiological ranges of the clinical case definition (no imports): the case editor shows them next to each field.
const RANGES_BACKEND_REL = "src/features/clinical-cases/domain/clinical-case-physiological-ranges.ts";
const RANGES_SRC = path.join(BACKEND_SRC, "features", "clinical-cases", "domain", "clinical-case-physiological-ranges.ts");
const RANGES_OUTPUT_REL = "clinical-cases/clinical-case-physiological-ranges.ts";
const OUTPUT_DIR = path.join(ROOT, "src", "shared", "sim-engine", "engine");
// The shared limits land under engine/common/ so the engine's own ventilator-limits.ts keeps its name.
const LIMITS_OUTPUT_REL = "common/ventilator-limits.ts";
const LIMITS_ALIAS = "@/common/domain/ventilator/ventilator-limits";
// Generated provenance manifest: the hash of every backend source file, so drift shows up in the diff.
const SOURCE_MANIFEST_REL = "SOURCE.json";
const TEST_FILE = /\.(spec|test)\.ts$|-spec\.ts$/;
// The backend compiles without noUncheckedIndexedAccess; see transform (5) in the header.
const TS_NOCHECK = "// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc\n";

const CHECK = process.argv.includes("--check");

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/** Lists every file under dir (recursively) whose name passes the filter, as sorted POSIX paths relative to dir. */
async function listFiles(dir, filter = () => true, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(dir, entry.name), filter, rel)));
    } else if (filter(entry.name)) {
      files.push(rel);
    }
  }

  return files.sort();
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Deterministic provenance manifest: per-file hashes of the backend sources plus one combined hash. */
function buildSourceManifest(sources) {
  const files = sources
    .map((file) => ({ path: file.backendRel, sha256: sha256(file.content) }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const combined = sha256(files.map((file) => `${file.path}:${file.sha256}`).join("\n"));
  const manifest = {
    generatedBy: "scripts/sync-sim-engine.mjs",
    source: "ventylab-server",
    note: "GENERATED - do not edit. Hashes of the LF-normalised backend sources.",
    sourceHash: combined,
    files,
  };

  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function toLf(text) {
  return text.replace(/\r\n/g, "\n");
}

/** Names a module exports only as types (interface / type alias declarations). */
function typeOnlyExports(source) {
  const names = new Set();

  for (const match of source.matchAll(/^export\s+(?:interface|type)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(match[1]);
  }

  return names;
}

function readHeaderField(header, field) {
  const match = header.match(new RegExp(`\\*\\s*${field}:\\s*(.+)`));

  return match ? match[1].trim() : "";
}

function buildHeader(originalHeader, backendRelPath) {
  const name = readHeaderField(originalHeader, "Funcionalidad") || path.posix.basename(backendRelPath);
  const description = readHeaderField(originalHeader, "Descripción");
  const version = readHeaderField(originalHeader, "Versión") || "1.0";

  return `/*
* Funcionalidad: ${name}
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/${backendRelPath}. ${description}
* Versión: ${version}
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
`;
}

/** Adds `type` to imported names that the target module exports only as types. */
function markTypeOnlyImports(source, outputRel, typeExportsByFile) {
  return source.replace(/import\s*\{([^}]*)\}\s*from\s*"(\.{1,2}\/[^"]+)";/g, (whole, list, specifier) => {
    const targetRel = path.posix.normalize(path.posix.join(path.posix.dirname(outputRel), `${specifier}.ts`));
    const typeNames = typeExportsByFile.get(targetRel);

    if (!typeNames) {
      return whole;
    }

    const names = list
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const isType = (name) => name.startsWith("type ") || typeNames.has(name);

    if (names.every(isType)) {
      const bare = names.map((name) => name.replace(/^type\s+/, ""));

      return `import type { ${bare.join(", ")} } from "${specifier}";`;
    }

    const marked = names.map((name) => (isType(name) && !name.startsWith("type ") ? `type ${name}` : name));

    return `import { ${marked.join(", ")} } from "${specifier}";`;
  });
}

/** Builds the vendored files in memory: Map<outputRelPath, content>. */
async function buildVendoredFiles() {
  const sources = [];

  for (const rel of await listFiles(ENGINE_SRC, (name) => name.endsWith(".ts"))) {
    if (TEST_FILE.test(rel)) {
      continue;
    }

    sources.push({
      outputRel: rel,
      backendRel: `src/features/simulation/domain/engine/${rel}`,
      content: toLf(await readFile(path.join(ENGINE_SRC, rel), "utf8")),
    });
  }

  sources.push({
    outputRel: LIMITS_OUTPUT_REL,
    backendRel: "src/common/domain/ventilator/ventilator-limits.ts",
    content: toLf(await readFile(LIMITS_SRC, "utf8")),
  });

  sources.push({
    outputRel: RANGES_OUTPUT_REL,
    backendRel: RANGES_BACKEND_REL,
    content: toLf(await readFile(RANGES_SRC, "utf8")),
  });

  const typeExportsByFile = new Map(sources.map((file) => [file.outputRel, typeOnlyExports(file.content)]));
  const output = new Map();

  for (const file of sources) {
    const headerMatch = file.content.match(/^\s*\/\*[\s\S]*?\*\/\n?/);
    const originalHeader = headerMatch ? headerMatch[0] : "";
    let body = file.content.slice(originalHeader.length);
    const limitsRel = path.posix.relative(path.posix.dirname(file.outputRel), LIMITS_OUTPUT_REL.replace(/\.ts$/, ""));
    const limitsSpecifier = limitsRel.startsWith(".") ? limitsRel : `./${limitsRel}`;

    body = body.split(`"${LIMITS_ALIAS}"`).join(`"${limitsSpecifier}"`);
    body = markTypeOnlyImports(body, file.outputRel, typeExportsByFile);

    if (body.includes('"@/')) {
      throw new Error(`Unhandled @/ import in ${file.backendRel}`);
    }

    output.set(file.outputRel, `${buildHeader(originalHeader, file.backendRel)}${TS_NOCHECK}${body}`);
  }

  output.set(SOURCE_MANIFEST_REL, buildSourceManifest(sources));

  return output;
}

async function check(expected) {
  const differences = [];
  // Every file under engine/, whatever its extension, so a leftover file is reported as stale.
  const present = (await exists(OUTPUT_DIR)) ? await listFiles(OUTPUT_DIR) : [];

  for (const [rel, content] of expected) {
    const file = path.join(OUTPUT_DIR, rel);

    if (!(await exists(file))) {
      differences.push(`missing  ${rel}`);
    } else if (toLf(await readFile(file, "utf8")) !== content) {
      differences.push(`changed  ${rel}`);
    }
  }

  for (const rel of present) {
    if (!expected.has(rel)) {
      differences.push(`stale    ${rel}`);
    }
  }

  if (differences.length > 0) {
    console.error("[sync-sim-engine] The vendored engine differs from the backend:");
    differences.forEach((line) => console.error(`  ${line}`));
    console.error("[sync-sim-engine] Run: node scripts/sync-sim-engine.mjs");
    process.exit(1);
  }

  console.log(`[sync-sim-engine] Vendored engine is up to date (${expected.size} files).`);
}

async function write(expected) {
  await rm(OUTPUT_DIR, { recursive: true, force: true });

  for (const [rel, content] of expected) {
    const file = path.join(OUTPUT_DIR, rel);

    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf8");
  }

  console.log(`[sync-sim-engine] Wrote ${expected.size} files to ${path.relative(ROOT, OUTPUT_DIR)}`);
}

async function main() {
  if (!(await exists(ENGINE_SRC)) || !(await exists(LIMITS_SRC)) || !(await exists(RANGES_SRC))) {
    throw new Error(`Backend engine not found at ${ENGINE_SRC} (the ventylab-server repo must sit next to ventilab-web)`);
  }

  const expected = await buildVendoredFiles();

  if (CHECK) {
    await check(expected);
  } else {
    await write(expected);
  }
}

main().catch((error) => {
  console.error("[sync-sim-engine] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
