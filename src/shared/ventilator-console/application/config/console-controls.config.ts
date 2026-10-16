/*
* Funcionalidad: Ventilator console controls and alarms config
* Descripción: Console-owned static configuration of the console controls and alarms: the generic ventilator parameter ids (a simulator adapter maps them 1:1 to its settings) with Spanish labels, the mode→parameter applicability table and the pure getParametersForMode filter, the default alarm type→priority map (engine alarm codes; consumers may override it), the priority order and copy, and the 2-minute silence. Limits, units and steps never live here: they come from the consumer's `limits`. It knows nothing about the simulation engine.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ConsoleAlarmPriority } from "../ventilator-console.entity";

export const CONSOLE_PARAMETER_IDS = [
  "tidalVolume",
  "inspiratoryPressure",
  "pressureSupport",
  "respiratoryRate",
  "peep",
  "fio2",
  "inspiratoryTime",
  "inspiratoryPause",
  "flowTrigger",
  "pressureTrigger",
  "cycleOff",
  "apneaTime",
] as const;

export type ConsoleParameterId = (typeof CONSOLE_PARAMETER_IDS)[number];

export type ConsoleParameterDefinition = {
  label: string
  /** Longer name for screen readers and tooltips. */
  description: string
};

export const CONSOLE_PARAMETERS: Readonly<Record<ConsoleParameterId, ConsoleParameterDefinition>> = {
  tidalVolume: { label: "Vt", description: "Volumen corriente" },
  inspiratoryPressure: { label: "Pinsp", description: "Presión inspiratoria" },
  pressureSupport: { label: "PS", description: "Presión de soporte" },
  respiratoryRate: { label: "FR", description: "Frecuencia respiratoria" },
  peep: { label: "PEEP", description: "Presión positiva al final de la espiración" },
  fio2: { label: "FiO2", description: "Fracción inspirada de oxígeno" },
  inspiratoryTime: { label: "Ti", description: "Tiempo inspiratorio" },
  inspiratoryPause: { label: "Pausa insp.", description: "Pausa inspiratoria" },
  flowTrigger: { label: "Trigger flujo", description: "Sensibilidad de disparo por flujo" },
  pressureTrigger: { label: "Trigger presión", description: "Sensibilidad de disparo por presión" },
  cycleOff: { label: "Ciclado", description: "Ciclado espiratorio (% del flujo pico)" },
  apneaTime: { label: "T. apnea", description: "Tiempo de apnea" },
};

/** Mode id → applicable parameter ids, in display order. */
export type ModeParameterTable = Readonly<Record<string, readonly string[]>>;

/**
 * Applicability aligned with the simulation engine behaviour per mode:
 * - VCV/PCV: timed mandatory breaths that the patient may trigger (assist-control); the inspiratory pause applies to volume breaths only.
 * - PSV: triggered support breaths cycled by flow, with an apnea backup.
 * - CPAP: spontaneous breaths without support (no PS), cycled by flow.
 * - SIMV: volume mandatory breaths plus pressure-supported spontaneous breaths. SIMV with pressure mandatory breaths needs
 *   `inspiratoryPressure`; a consumer that runs it passes its own table.
 * Both trigger ids are listed; the adapter injects a limit only for the trigger type in use, and parameters without a limit are hidden.
 */
export const MODE_PARAMETERS: ModeParameterTable = {
  VCV: ["tidalVolume", "respiratoryRate", "peep", "fio2", "inspiratoryTime", "inspiratoryPause", "flowTrigger", "pressureTrigger"],
  PCV: ["inspiratoryPressure", "respiratoryRate", "peep", "fio2", "inspiratoryTime", "flowTrigger", "pressureTrigger"],
  PSV: ["pressureSupport", "peep", "fio2", "flowTrigger", "pressureTrigger", "cycleOff", "apneaTime"],
  CPAP: ["peep", "fio2", "flowTrigger", "pressureTrigger", "cycleOff", "apneaTime"],
  SIMV: [
    "tidalVolume",
    "respiratoryRate",
    "peep",
    "fio2",
    "inspiratoryTime",
    "inspiratoryPause",
    "pressureSupport",
    "flowTrigger",
    "pressureTrigger",
    "cycleOff",
  ],
};

/** Parameters that apply to `mode` and have an entry in `definitions` (normally the injected limits), in table order. */
export function getParametersForMode(
  mode: string,
  definitions: Readonly<Record<string, unknown>>,
  table: ModeParameterTable = MODE_PARAMETERS,
): readonly string[] {
  return (table[mode] ?? []).filter((parameter) => definitions[parameter] !== undefined);
}

export const ALARM_PRIORITY_ORDER: readonly ConsoleAlarmPriority[] = ["high", "medium", "low"];

export const ALARM_PRIORITY_COPY: Readonly<Record<ConsoleAlarmPriority, string>> = {
  high: "Prioridad alta",
  medium: "Prioridad media",
  low: "Prioridad baja",
};

/**
 * Default type → priority map (decision 7). The engine codes carry HIGH/MEDIUM severity and are mirrored here; `low` is
 * reserved for advisory types a consumer adds (none from the engine). Adapters may use the engine severity directly.
 */
export const DEFAULT_ALARM_PRIORITIES: Readonly<Record<string, ConsoleAlarmPriority>> = {
  DISCONNECTION: "high",
  APNEA: "high",
  HIGH_PRESSURE: "high",
  LOW_TIDAL_VOLUME: "high",
  HIGH_TIDAL_VOLUME: "medium",
  HIGH_RESPIRATORY_RATE: "medium",
  AUTO_PEEP: "medium",
};

/** Unknown types fall back to `medium` so a new alarm is never under-prioritised as advisory. */
export function resolveAlarmPriority(
  type: string,
  priorities: Readonly<Record<string, ConsoleAlarmPriority>> = DEFAULT_ALARM_PRIORITIES,
): ConsoleAlarmPriority {
  return priorities[type] ?? "medium";
}

/** Silence mutes the sound only; alarms stay visible. */
export const ALARM_SILENCE_MS = 120_000;

/** Session alarm history keeps the newest events up to this count. */
export const ALARM_HISTORY_MAX_EVENTS = 200;
