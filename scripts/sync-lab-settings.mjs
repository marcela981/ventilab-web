/*
* Funcionalidad: Sincronizador de los valores por defecto del laboratorio
* Descripción: Vendoriza en el frontend los valores por defecto del backend que el laboratorio del ventilador real
*   necesita y que los usuarios sin el permiso settings:manage no pueden leer de GET /api/platform-settings:
*   reservas (reservations.slotMinutes, maxDurationMinutes, maxAdvanceDays, maxUpcomingPerStudent,
*   maxUpcomingPerGroup), telemetría (telemetry.staleAfterMs) y comandos (commands.ratePerSecond, ackTimeoutMs y
*   los límites de seguridad commands.safety.*). La fuente es la clase EnvironmentVariables del backend
*   (src/common/infrastructure/config/env.validation.ts), de la que el backend toma los valores por defecto de esas
*   claves (src/composition/platform-setting-defaults.ts). Ese archivo depende de class-validator y
*   class-transformer, así que no se copia: el script extrae de forma determinista el literal numérico de cada
*   `public NOMBRE: number = valor;` de la tabla CLAVE → VARIABLE y genera
*   src/features/ventilator-lab/application/config/vendored/lab-settings.defaults.ts (GENERADO). Si una variable
*   falta o deja de ser un literal numérico, falla. Los rangos de los parámetros del ventilador ya están vendorizados
*   en src/shared/sim-engine/engine/common/ventilator-limits.ts (scripts/sync-sim-engine.mjs).
*   Uso: node scripts/sync-lab-settings.mjs        (escribe la copia)
*        node scripts/sync-lab-settings.mjs --check (sale con código 1 si la copia difiere del backend)
*   v1.1 (T7): además vendoriza constantes del backend que NO son ajustes de plataforma ni se exponen por la API
*   (VENDORED_LAB_BACKEND_DEFAULTS): la gracia de presencia del operador (VENTILATOR_OPERATOR_GRACE_SECONDS), de la
*   que el frontend deriva el intervalo del heartbeat del control.
*   Depende solo de node:fs y node:path.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_BACKEND_REL = "src/common/infrastructure/config/env.validation.ts";
const ENV_SRC = path.resolve(ROOT, "..", "ventylab-server", ...ENV_BACKEND_REL.split("/"));
const OUTPUT_REL = "src/features/ventilator-lab/application/config/vendored/lab-settings.defaults.ts";
const OUTPUT = path.join(ROOT, ...OUTPUT_REL.split("/"));

// Platform-setting key → backend environment variable whose class default is the setting default
// (see readReservationSettings, readVentilatorTelemetrySettings and readVentilatorCommandsSettings in the backend).
const SETTINGS = [
  ["reservations.slotMinutes", "RESERVATION_SLOT_MINUTES"],
  ["reservations.maxDurationMinutes", "RESERVATION_MAX_DURATION_MINUTES"],
  ["reservations.maxAdvanceDays", "RESERVATION_MAX_ADVANCE_DAYS"],
  ["reservations.maxUpcomingPerStudent", "RESERVATION_MAX_FUTURE_PER_STUDENT"],
  ["reservations.maxUpcomingPerGroup", "RESERVATION_MAX_FUTURE_PER_GROUP"],
  ["telemetry.staleAfterMs", "VENTILATOR_STALE_AFTER_MS"],
  ["commands.ratePerSecond", "VENTILATOR_COMMAND_RATE_PER_SECOND"],
  ["commands.ackTimeoutMs", "VENTILATOR_COMMAND_TIMEOUT_MS"],
  ["commands.safety.maxPeep", "VENTILATOR_SAFETY_MAX_PEEP"],
  ["commands.safety.maxPressureLimit", "VENTILATOR_SAFETY_MAX_PRESSURE_LIMIT"],
  ["commands.safety.maxTidalVolume", "VENTILATOR_SAFETY_MAX_TIDAL_VOLUME"],
  ["commands.safety.maxRespiratoryRate", "VENTILATOR_SAFETY_MAX_RESPIRATORY_RATE"],
  ["commands.safety.maxIeRatio", "VENTILATOR_SAFETY_MAX_IE_RATIO"],
];

// Backend constants that are not platform settings and are not exposed by the API (env only).
const BACKEND_CONSTANTS = [
  ["control.operatorGraceSeconds", "VENTILATOR_OPERATOR_GRACE_SECONDS"],
];

const CHECK = process.argv.includes("--check");

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function toLf(text) {
  return text.replace(/\r\n/g, "\n");
}

function readDefault(source, variable) {
  const match = source.match(new RegExp(`public\\s+${variable}\\s*:\\s*number\\s*=\\s*([0-9][0-9_]*(?:\\.[0-9]+)?)\\s*;`));

  if (!match) {
    throw new Error(`${variable} has no numeric literal default in ${ENV_BACKEND_REL}`);
  }

  return Number(match[1].replace(/_/g, ""));
}

function build(source) {
  const lines = SETTINGS.map(([key, variable]) => `  "${key}": ${readDefault(source, variable)}, // ${variable}`);
  const constants = BACKEND_CONSTANTS.map(([key, variable]) => `  "${key}": ${readDefault(source, variable)}, // ${variable}`);

  return `/*
* Funcionalidad: Vendored lab setting defaults
* Descripción: GENERATED — do not edit; run node scripts/sync-lab-settings.mjs. Default value of each lab platform setting, extracted from the class defaults of EnvironmentVariables in ventylab-server/${ENV_BACKEND_REL} (the backend reads these settings from those variables). Used only when the caller may not read GET /api/platform-settings (settings:manage); the backend stays the authority and its 4xx responses are shown. VENDORED_LAB_BACKEND_DEFAULTS: backend constants that are neither platform settings nor exposed by the API.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const VENDORED_LAB_SETTING_DEFAULTS = {
${lines.join("\n")}
} as const;

export type LabSettingKey = keyof typeof VENDORED_LAB_SETTING_DEFAULTS;

export const VENDORED_LAB_BACKEND_DEFAULTS = {
${constants.join("\n")}
} as const;
`;
}

async function main() {
  if (!(await exists(ENV_SRC))) {
    throw new Error(`Backend config not found at ${ENV_SRC} (the ventylab-server repo must sit next to ventilab-web)`);
  }

  const expected = build(toLf(await readFile(ENV_SRC, "utf8")));

  if (CHECK) {
    const current = (await exists(OUTPUT)) ? toLf(await readFile(OUTPUT, "utf8")) : null;

    if (current !== expected) {
      console.error(`[sync-lab-settings] ${OUTPUT_REL} differs from the backend defaults.`);
      console.error("[sync-lab-settings] Run: node scripts/sync-lab-settings.mjs");
      process.exit(1);
    }

    console.log(`[sync-lab-settings] Vendored lab setting defaults are up to date (${SETTINGS.length} keys, ${BACKEND_CONSTANTS.length} constants).`);

    return;
  }

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, expected, "utf8");
  console.log(`[sync-lab-settings] Wrote ${SETTINGS.length} keys and ${BACKEND_CONSTANTS.length} constants to ${OUTPUT_REL}`);
}

main().catch((error) => {
  console.error("[sync-lab-settings] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
