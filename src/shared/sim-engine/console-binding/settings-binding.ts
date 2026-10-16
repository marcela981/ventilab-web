/*
* Funcionalidad: Engine settings ↔ ventilator console binding
* Descripción: The mapping between the engine ventilator settings and the generic ventilator console, shared by every
*   feature that shows the console over the engine (the simulator session and replay, the case editor initial
*   settings): the console parameter id → engine setting key with the display scale, step and unit (min/max always
*   come from the vendored VENTILATOR_LIMITS; FiO2 is shown in % with scale 100), the Spanish mode labels and options,
*   the applied settings in console units, the parameter limits (only the trigger in use gets one, so the other is
*   hidden), the SIMV applicability when its mandatory breaths are pressure controlled and a confirmation as engine
*   setting changes. Moved unchanged from the simulator feature (sim-console.config + sim-console-adapter) so the case
*   editor shows exactly the controls the student sees. Lives in sim-engine because the ventilator console must stay
*   engine-agnostic (it may not import sim-engine) while sim-engine may import the console. Not exported from the
*   sim-engine barrel (deep import `@shared/sim-engine/console-binding`), so the barrel stays free of console code.
*   Depends on the sim-engine vendored limits and the ventilator-console public API.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CONSOLE_PARAMETER_IDS, MODE_PARAMETERS } from "@shared/ventilator-console";
import type {
  ConsoleConfirmation,
  ConsoleLimits,
  ConsoleModeOption,
  ConsoleParameterId,
  ConsoleSettingValues,
  ModeParameterTable,
  ParameterLimit,
} from "@shared/ventilator-console";
import { VENTILATION_MODES, VENTILATOR_LIMITS } from "../engine/ventilator-limits";
import type { NumericSettingKey } from "../engine/ventilator-limits";
import type { EngineVentilationMode, VentilatorSettings } from "../engine/engine.types";

/** Rounds away binary noise of the scale conversions (0.21 × 100 = 21.000000000000004). */
export function tidy(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export type ParameterSetting = {
  /** Engine setting the console parameter edits. */
  key: NumericSettingKey
  /** Display value = engine value × scale (FiO2 fraction → %). */
  scale: number
  /** Step of the control in display units (a UI choice; the bounds come from the vendored limits). */
  step: number
  /** Display unit in Spanish. */
  unit: string
};

export const PARAMETER_SETTINGS: Readonly<Record<ConsoleParameterId, ParameterSetting>> = {
  tidalVolume: { key: "tidalVolumeMl", scale: 1, step: 10, unit: "mL" },
  inspiratoryPressure: { key: "inspiratoryPressureCmH2O", scale: 1, step: 1, unit: "cmH2O" },
  pressureSupport: { key: "pressureSupportCmH2O", scale: 1, step: 1, unit: "cmH2O" },
  respiratoryRate: { key: "respiratoryRateBpm", scale: 1, step: 1, unit: "rpm" },
  peep: { key: "peepCmH2O", scale: 1, step: 1, unit: "cmH2O" },
  fio2: { key: "fio2", scale: 100, step: 1, unit: "%" },
  inspiratoryTime: { key: "inspiratoryTimeS", scale: 1, step: 0.1, unit: "s" },
  inspiratoryPause: { key: "inspiratoryPauseS", scale: 1, step: 0.1, unit: "s" },
  flowTrigger: { key: "flowTriggerLpm", scale: 1, step: 0.5, unit: "L/min" },
  pressureTrigger: { key: "pressureTriggerCmH2O", scale: 1, step: 0.5, unit: "cmH2O" },
  cycleOff: { key: "cycleOffPercent", scale: 1, step: 5, unit: "%" },
  apneaTime: { key: "apneaTimeS", scale: 1, step: 5, unit: "s" },
};

// TODO(i18n): move the labels to a simulation namespace in src/i18n.
export const MODE_LABELS = {
  VCV: "VCV — Volumen control",
  PCV: "PCV — Presión control",
  PSV: "PSV — Presión de soporte",
  CPAP: "CPAP",
  SIMV: "SIMV",
} as const satisfies Record<EngineVentilationMode, string>;

export function toConsoleSettings(settings: VentilatorSettings): ConsoleSettingValues {
  const values: Record<string, number> = {};

  CONSOLE_PARAMETER_IDS.forEach((id) => {
    const { key, scale } = PARAMETER_SETTINGS[id];

    values[id] = tidy(settings[key] * scale);
  });

  return values;
}

function triggerApplies(id: ConsoleParameterId, settings: VentilatorSettings): boolean {
  if (id === "flowTrigger") {
    return settings.triggerType === "FLOW";
  }

  return id !== "pressureTrigger" || settings.triggerType === "PRESSURE";
}

/** Limits in console units from the vendored ventilator limits; the unused trigger gets none, so it is hidden. */
export function buildConsoleLimits(settings: VentilatorSettings): ConsoleLimits {
  const limits: Record<string, ParameterLimit> = {};

  CONSOLE_PARAMETER_IDS.forEach((id) => {
    if (triggerApplies(id, settings)) {
      const { key, scale, step, unit } = PARAMETER_SETTINGS[id];
      const limit = VENTILATOR_LIMITS[key];

      limits[id] = { min: tidy(limit.min * scale), max: tidy(limit.max * scale), step, unit };
    }
  });

  return limits;
}

export const MODE_OPTIONS: readonly ConsoleModeOption[] = VENTILATION_MODES.map((mode) => ({ id: mode, label: MODE_LABELS[mode] }));

/** SIMV with pressure-controlled mandatory breaths edits Pinsp instead of Vt and the pause. */
export function applicabilityFor(settings: VentilatorSettings): ModeParameterTable | undefined {
  if (settings.simvMandatoryType !== "PCV") {
    return undefined;
  }

  const simv = (MODE_PARAMETERS.SIMV ?? []).filter((id) => id !== "tidalVolume" && id !== "inspiratoryPause");

  return { ...MODE_PARAMETERS, SIMV: ["inspiratoryPressure", ...simv] };
}

function isVentilationMode(value: string): value is EngineVentilationMode {
  return (VENTILATION_MODES as readonly string[]).includes(value);
}

function isConsoleParameter(value: string): value is ConsoleParameterId {
  return (CONSOLE_PARAMETER_IDS as readonly string[]).includes(value);
}

/** A CONFIRMAR as engine setting changes (display units converted back); unknown ids are ignored. */
export function toSettingsChanges(confirmation: ConsoleConfirmation): Partial<VentilatorSettings> {
  const changes: Partial<Record<keyof VentilatorSettings, unknown>> = {};

  if (confirmation.mode !== null && isVentilationMode(confirmation.mode)) {
    changes.mode = confirmation.mode;
  }

  confirmation.changes.forEach(({ parameter, value }) => {
    if (isConsoleParameter(parameter) && Number.isFinite(value)) {
      const { key, scale } = PARAMETER_SETTINGS[parameter];

      changes[key] = tidy(value / scale);
    }
  });

  return changes as Partial<VentilatorSettings>;
}
