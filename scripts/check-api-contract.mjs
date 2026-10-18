/*
* Funcionalidad: Verificación del contrato OpenAPI
* Descripción: Regenera el cliente de tipos (scripts/generate-api.mjs: copia ../ventylab-server/openapi/openapi.json
*   y genera src/shared/api-client/generated/schema.d.ts) y falla (exit 1) si el resultado difiere de lo
*   commiteado, es decir si `git status --porcelain -- openapi/openapi.json src/shared/api-client/generated`
*   no está vacío. Así se detecta un contrato del backend sin consumir o un cliente editado a mano.
*   v1.1 (B5): el generador hereda BACKEND_SPEC_PATH (ruta del contrato del backend; la CI la define y, si el
*   archivo no existe, la verificación falla en lugar de comparar contra la copia local).
*   Uso: npm run check:api [BACKEND_SPEC_PATH=...]. Depende de node y git.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATOR = path.join(ROOT, "scripts", "generate-api.mjs");
const CONTRACT_PATHS = ["openapi/openapi.json", "src/shared/api-client/generated"];

function main() {
  // The generator inherits process.env, BACKEND_SPEC_PATH included.
  execFileSync(process.execPath, [GENERATOR], { cwd: ROOT, stdio: "inherit", env: process.env });

  const status = execFileSync("git", ["status", "--porcelain", "--", ...CONTRACT_PATHS], { cwd: ROOT, encoding: "utf8" }).trim();

  if (status !== "") {
    console.error("[check:api] The generated API client differs from the committed one:");
    console.error(status);
    console.error("[check:api] Commit openapi/openapi.json and src/shared/api-client/generated after `npm run generate:api`.");
    process.exit(1);
  }

  console.log("[check:api] The API client matches the backend contract.");
}

try {
  main();
} catch (error) {
  console.error("[check:api] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
