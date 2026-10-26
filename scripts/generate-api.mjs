/*
* Funcionalidad: Generador del cliente de tipos OpenAPI
* Descripción: Copia el contrato del backend (../ventylab-server/openapi/openapi.json) a openapi/openapi.json
*   y genera src/shared/api-client/generated/schema.d.ts con openapi-typescript, anteponiendo el header
*   obligatorio del proyecto. Si el repo del backend no está disponible, reutiliza la copia local.
*   v1.1 (B5): BACKEND_SPEC_PATH (ruta relativa a la raíz del repo o absoluta) reemplaza la ruta por defecto del
*   contrato del backend (la CI clona el backend en otra carpeta); cuando se define y el archivo no existe, falla
*   en lugar de reutilizar la copia local, para que la verificación del contrato nunca pase sin el backend.
*   v1.2: en lugar de copiar el archivo byte a byte, parsea el contrato y lo escribe con JSON.stringify(spec, null, 2)
*   y salto de línea LF final, de modo que la copia no depende de la indentación ni de los finales de línea del
*   origen (.gitattributes fija eol=lf para openapi/** y src/shared/api-client/generated/**).
*   Uso: npm run generate:api
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPLICIT_SPEC = (process.env.BACKEND_SPEC_PATH ?? "").trim();
const BACKEND_SPEC = EXPLICIT_SPEC !== ""
  ? path.resolve(ROOT, EXPLICIT_SPEC)
  : path.resolve(ROOT, "..", "ventylab-server", "openapi", "openapi.json");
const LOCAL_SPEC = path.join(ROOT, "openapi", "openapi.json");
const OUTPUT = path.join(ROOT, "src", "shared", "api-client", "generated", "schema.d.ts");

const HEADER = `/*
* Funcionalidad: Tipos generados del contrato OpenAPI de ventylab-server
* Descripción: Archivo GENERADO por scripts/generate-api.mjs (openapi-typescript) a partir de
*   openapi/openapi.json. No editar a mano: ejecutar \`npm run generate:api\`.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
`;

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(path.dirname(LOCAL_SPEC), { recursive: true });

  if (await exists(BACKEND_SPEC)) {
    const spec = JSON.parse(await readFile(BACKEND_SPEC, "utf8"));
    await writeFile(LOCAL_SPEC, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
    console.log(`[generate:api] Copied ${path.relative(ROOT, BACKEND_SPEC)} -> openapi/openapi.json`);
  } else if (EXPLICIT_SPEC !== "") {
    throw new Error(`BACKEND_SPEC_PATH points to a missing file: ${BACKEND_SPEC}`);
  } else if (await exists(LOCAL_SPEC)) {
    console.warn("[generate:api] Backend spec not found; using the existing openapi/openapi.json");
  } else {
    throw new Error(`OpenAPI spec not found at ${BACKEND_SPEC} nor ${LOCAL_SPEC}`);
  }

  const ast = await openapiTS(pathToFileURL(LOCAL_SPEC));
  const body = astToString(ast);

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${HEADER}\n${body}`, "utf8");
  console.log(`[generate:api] Wrote ${path.relative(ROOT, OUTPUT)}`);
}

main().catch((error) => {
  console.error("[generate:api] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
