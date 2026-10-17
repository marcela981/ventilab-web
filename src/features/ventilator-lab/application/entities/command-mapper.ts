/*
* Funcionalidad: Ventilator command mapper
* Descripción: Pure mapping from a console confirmation (mode + changed parameters, console units) to the backend
*   SendVentilatorCommandRequestDTO of POST /api/ventilator/commands, never from a guess. The backend command is a FULL
*   setting set (required fields per mode, `REQUIRED_PARAMETERS_BY_MODE` of ventylab-server
*   `ventilator-command-params.ts`), so every field the operator did not change is taken from the settings the device
*   REPORTED in its telemetry (same field names as the command: the backend matches them to resolve APPLIED); a required
*   field the device never reported refuses the command. Units: FiO2 % → fraction, flow trigger (L/min) → `sensitivity`
*   (the backend validates it with the flow-trigger range), the rest 1:1. Pressure: the backend `pressureLimit` is an
*   ABSOLUTE pressure (validated `> peep`) whose meaning per mode is not documented, while the console pressures are above
*   PEEP, so no console pressure is offered, a change INTO PCV/PSV is refused (it would need a pressure limit chosen by
*   nobody), and in PCV/PSV the PEEP is not offered either (a new PEEP under the unchanged absolute limit would silently
*   change the inspiratory pressure above PEEP); while the mode is unchanged the reported `pressureLimit`, `flowRate` and
*   `ieRatio` are carried as the device reports them, on a mode change only the fields the console shows are carried, and
*   the reported I:E ratio is dropped when the rate or the inspiratory time changes (the backend derives it, a stale one
*   would be inconsistent). Local pre-checks mirror the backend coherence rules (expiratory time ≥ 0.3 s, I:E ≤ the
*   safety maximum, pressure limit above PEEP); the backend 422 stays the authority. The control limits are the stricter
*   of the vendored engine limits (`@shared/sim-engine`, vendored from the backend shared limits) and the backend safety
*   maxima (`commands.safety.*`: platform settings for admins, vendored defaults otherwise), steps and units from the
*   shared console binding. Also the latest device report (settings + mode) reduced from telemetry frames and the
*   report-vs-target match (backend default tolerance 5 %). Depends on the sim-engine limits and console binding, the
*   console contract types, the realtime frame type, the lab settings and the generated command DTO. v1.1 (T8 review fix):
  B1 (safety) while the device reports a fixed inspiratory flow (`flowRate`, carried unchanged with the mode), a change
  of Vt or Ti is REFUSED: the backend does not check the flow coherence and nothing documents that the device derives
  the flow, so resending the stale flow would change the other value (VCV Ti = Vt / flow) without anyone confirming it.
  W1 every target keeps its pre-command reported value (`base`) and a report matches only when it is within the
  tolerance AND strictly closer to the target than to the base (a one-step change such as Vt 450 → 460 is within 5 %
  of the old report). S2 a reported mode the console cannot command (e.g. CPAP) has its own copy. S3 a reported I:E
  inconsistent with the reported FR/Ti (backend tolerance 5 %) is refused with an explanation instead of a 422 loop.
  v1.2 (T8 review fix 2): B1 the Vt/Ti refusal follows the REPORTED flow, whatever the mode.
  v1.3 (T8 review fix 3): W3 correction of the v1.2 rationale: the DEFAULT backend encoder is JSON
  (`VENTILATOR_COMMAND_ENCODING` = "json", ventylab-server `env.validation.ts`) and `json-command.encoder.ts` DOES send
  every numeric field, `flowRate` included; only the optional hex encoder omits it. Either way the device keeps a fixed
  flow (JSON: the same reported flow is resent; hex: the device keeps its own), so a Vt/Ti change under a reported flow
  is still refused (Ti = Vt / flow would move unconfirmed). VCV and SIMV are both fixed-flow modes, so a VCV ↔ SIMV change
  now carries the reported `flowRate` too (coherent with the refusal: Vt and Ti cannot change under it; dropping it could
  let the device fall back to an undocumented default flow); other mode changes still carry only the console fields.
  Pre-existing (safety): a change of FR (or Ti) while the device reports an I:E ratio but not the other timing value is
  REFUSED (`ie_ratio_without_timing`): the reported I:E would be carried and the device would shift the unreported Ti
  (or FR) without confirmation; the backend never derives Ti from I:E (it only checks I:E against FR/Ti when both are
  present) and the device behaviour is not documented. Known limitation (S2): in PCV, Ti cannot be changed while the
  device reports a `flowRate` (same fixed-flow refusal), even if the device ignores that flow in pressure control.
  v1.4 (T8 review fix 4): W1 the `ie_ratio_without_timing` refusal follows the I:E the device REPORTS, not only the
  one carried in the command: a mode change never carries `ieRatio` (not a console field), yet the device keeps it.
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { MIN_EXPIRATORY_TIME_S, VENTILATOR_LIMITS } from "@shared/sim-engine";
import { PARAMETER_SETTINGS, tidy } from "@shared/sim-engine/console-binding";
import type { VentilatorTelemetryFrame } from "@shared/realtime";
import { CONSOLE_PARAMETERS } from "@shared/ventilator-console";
import type {
  ConsoleConfirmation,
  ConsoleLimits,
  ConsoleModeOption,
  ConsoleParameterId,
  ModeParameterTable,
  ParameterLimit,
} from "@shared/ventilator-console";
import type { SendVentilatorCommandRequestDTO } from "../../api/dtos/lab.dto";
import type { LabSettings } from "./lab-settings.entity";
import { REAL_MODE_OPTIONS } from "./reported-settings";

export type CommandMode = SendVentilatorCommandRequestDTO["mode"];

export type CommandField = Exclude<keyof SendVentilatorCommandRequestDTO, "mode">;

export const COMMAND_MODES: readonly CommandMode[] = ["VCV", "PCV", "SIMV", "PSV"];

const PRESSURE_MODES: readonly CommandMode[] = ["PCV", "PSV"];

export const COMMAND_FIELDS: readonly CommandField[] = [
  "tidalVolume",
  "respiratoryRate",
  "peep",
  "fio2",
  "pressureLimit",
  "inspiratoryTime",
  "ieRatio",
  "flowRate",
  "sensitivity",
];

/** Mirror of the backend REQUIRED_PARAMETERS_BY_MODE (docs/ventilator/commands.md); its 422 `required` stays the authority. */
export const REQUIRED_FIELDS_BY_MODE: Readonly<Record<CommandMode, readonly CommandField[]>> = {
  VCV: ["tidalVolume", "respiratoryRate", "peep", "fio2"],
  PCV: ["pressureLimit", "respiratoryRate", "peep", "fio2", "inspiratoryTime"],
  SIMV: ["tidalVolume", "respiratoryRate", "peep", "fio2"],
  PSV: ["pressureLimit", "peep", "fio2"],
};

/** Console parameter → command field; command value = console value × scale. */
export const COMMAND_PARAMETERS: Readonly<Partial<Record<ConsoleParameterId, { field: CommandField, scale: number }>>> = {
  tidalVolume: { field: "tidalVolume", scale: 1 },
  respiratoryRate: { field: "respiratoryRate", scale: 1 },
  peep: { field: "peep", scale: 1 },
  fio2: { field: "fio2", scale: 0.01 },
  inspiratoryTime: { field: "inspiratoryTime", scale: 1 },
  flowTrigger: { field: "sensitivity", scale: 1 },
};

/** Command fields the console shows (the only ones carried across a mode change). */
const CONSOLE_FIELDS: ReadonlySet<CommandField> = new Set(Object.values(COMMAND_PARAMETERS).map((entry) => entry.field));

/** Editable console parameters per mode, in display order (no pressure, and no PEEP under an absolute pressure limit). */
export const COMMAND_APPLICABILITY: ModeParameterTable = {
  VCV: ["tidalVolume", "respiratoryRate", "peep", "fio2", "inspiratoryTime", "flowTrigger"],
  SIMV: ["tidalVolume", "respiratoryRate", "peep", "fio2", "inspiratoryTime", "flowTrigger"],
  PCV: ["respiratoryRate", "fio2", "inspiratoryTime", "flowTrigger"],
  PSV: ["fio2", "flowTrigger"],
};

/** Backend `IE_RATIO_CONSISTENCY_TOLERANCE` (ventilator-command-validator.ts). */
export const IE_RATIO_CONSISTENCY_TOLERANCE = 0.05;

/** Fixed-flow modes: across a change between them the reported inspiratory flow is carried (T8 review fix 3, W3). */
const FIXED_FLOW_MODES: readonly CommandMode[] = ["VCV", "SIMV"];

/** Console parameters whose change, under a fixed reported flow, would silently change the other one (Ti = Vt / flow). */
const FLOW_COUPLED_PARAMETERS: readonly string[] = ["tidalVolume", "inspiratoryTime"];

/** Backend default `VENTILATOR_APPLY_TOLERANCE_RATIO` (env only, not exposed). */
export const REPORT_MATCH_TOLERANCE = 0.05;

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
const FIELD_NAMES: Readonly<Record<CommandField, string>> = {
  tidalVolume: "Vt (volumen corriente)",
  respiratoryRate: "FR (frecuencia respiratoria)",
  peep: "PEEP",
  fio2: "FiO2",
  pressureLimit: "presión límite",
  inspiratoryTime: "Ti (tiempo inspiratorio)",
  ieRatio: "relación I:E",
  flowRate: "flujo inspiratorio",
  sensitivity: "sensibilidad (trigger de flujo)",
};

export function commandFieldName(field: string): string {
  return Object.prototype.hasOwnProperty.call(FIELD_NAMES, field) ? FIELD_NAMES[field as CommandField] : field;
}

function parameterName(parameter: string): string {
  const definition = Object.prototype.hasOwnProperty.call(CONSOLE_PARAMETERS, parameter)
    ? CONSOLE_PARAMETERS[parameter as ConsoleParameterId]
    : undefined;

  return definition ? `${definition.label} (${definition.description.toLowerCase()})` : parameter;
}

export function isCommandMode(value: unknown): value is CommandMode {
  return typeof value === "string" && (COMMAND_MODES as readonly string[]).includes(value);
}

function normalizeMode(mode: string | null): CommandMode | null {
  const upper = mode?.trim().toUpperCase() ?? null;

  return isCommandMode(upper) ? upper : null;
}

/** VCV and SIMV always; a pressure mode only while the device runs it (a change into it is never offered). */
export function commandModeOptions(reportedMode: string | null): readonly ConsoleModeOption[] {
  const current = normalizeMode(reportedMode);

  return REAL_MODE_OPTIONS.filter((option) => {
    const id = option.id as CommandMode;

    return !PRESSURE_MODES.includes(id) || id === current;
  });
}

/** Console limits of the commandable parameters: engine limits ∩ backend safety maxima (the stricter wins). */
export function buildCommandLimits(settings: LabSettings): ConsoleLimits {
  const safetyMax: Partial<Record<CommandField, number>> = {
    tidalVolume: settings["commands.safety.maxTidalVolume"],
    respiratoryRate: settings["commands.safety.maxRespiratoryRate"],
    peep: settings["commands.safety.maxPeep"],
  };
  const limits: Record<string, ParameterLimit> = {};

  (Object.keys(COMMAND_PARAMETERS) as ConsoleParameterId[]).forEach((parameter) => {
    const command = COMMAND_PARAMETERS[parameter];
    const { key, scale, step, unit } = PARAMETER_SETTINGS[parameter];
    const engine = VENTILATOR_LIMITS[key];

    if (!command) {
      return;
    }

    const safety = safetyMax[command.field];
    const max = safety === undefined || !Number.isFinite(safety) ? engine.max : Math.min(engine.max, safety);

    limits[parameter] = { min: tidy(engine.min * scale), max: tidy(max * scale), step, unit };
  });

  return limits;
}

export type DeviceReport = {
  /** Latest `settings` object of the frames, as the device reported it (command field names, device units). */
  settings: Readonly<Record<string, number>> | null
  mode: string | null
};

export const EMPTY_DEVICE_REPORT: DeviceReport = { settings: null, mode: null };

/** Latest settings object and mode of the frames; the same object when no frame carries either. */
export function reduceDeviceReport(previous: DeviceReport, frames: readonly VentilatorTelemetryFrame[]): DeviceReport {
  let next = previous;

  for (const frame of frames) {
    if (frame.settings !== null && typeof frame.settings === "object") {
      next = { ...next, settings: frame.settings };
    }

    if (typeof frame.mode === "string" && frame.mode.length > 0) {
      next = { ...next, mode: frame.mode };
    }
  }

  return next;
}

export type CommandTarget = {
  parameter: string
  value: number
  /** The value the device reported before the command (console units), or null when it reported none. */
  base?: number | null
};

export type MappedCommand = {
  mode: CommandMode
  modeChanged: boolean
  request: SendVentilatorCommandRequestDTO
  /** The confirmed changes in console units (what the device should report afterwards). */
  targets: readonly CommandTarget[]
};

export type CommandRefusal =
  | { code: "no_changes" }
  | { code: "unknown_mode" }
  | { code: "unsupported_mode", mode: string }
  | { code: "reported_mode_unsupported", mode: string }
  | { code: "fixed_flow", parameter: string, flowRate: number }
  | { code: "reported_ie_inconsistent", reported: number, derived: number }
  | { code: "ie_ratio_without_timing", parameter: string, missing: CommandField, ieRatio: number }
  | { code: "pressure_mode_change", mode: CommandMode }
  | { code: "unmappable_parameter", parameter: string, mode: CommandMode }
  | { code: "out_of_limits", parameter: string, limit: ParameterLimit | null }
  | { code: "missing_required", fields: readonly CommandField[] }
  | { code: "expiratory_time", expiratoryTimeS: number }
  | { code: "ie_ratio", ratio: number, max: number }
  | { code: "pressure_not_above_peep", pressureLimit: number, peep: number };

export type CommandMapping = { ok: true, command: MappedCommand } | { ok: false, refusal: CommandRefusal };

export type CommandMappingOptions = { limits: ConsoleLimits, settings: LabSettings };

function refuse(refusal: CommandRefusal): CommandMapping {
  return { ok: false, refusal };
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function coherenceRefusal(params: Partial<Record<CommandField, number>>, settings: LabSettings): CommandRefusal | null {
  const { respiratoryRate, inspiratoryTime, pressureLimit, peep, ieRatio } = params;

  if (respiratoryRate !== undefined && inspiratoryTime !== undefined && respiratoryRate > 0) {
    const expiratoryTimeS = 60 / respiratoryRate - inspiratoryTime;

    if (expiratoryTimeS < MIN_EXPIRATORY_TIME_S) {
      return { code: "expiratory_time", expiratoryTimeS };
    }

    const ratio = inspiratoryTime / expiratoryTimeS;

    // S3: only a carried (reported) I:E reaches here; the backend would refuse it with ie_ratio_inconsistent.
    if (ieRatio !== undefined && Math.abs(ieRatio - ratio) / ratio > IE_RATIO_CONSISTENCY_TOLERANCE) {
      return { code: "reported_ie_inconsistent", reported: ieRatio, derived: ratio };
    }
    const max = settings["commands.safety.maxIeRatio"];

    if (ratio > max) {
      return { code: "ie_ratio", ratio, max };
    }
  }

  if (pressureLimit !== undefined && peep !== undefined && pressureLimit <= peep) {
    return { code: "pressure_not_above_peep", pressureLimit, peep };
  }

  return null;
}

export function mapConfirmationToCommand(
  confirmation: ConsoleConfirmation,
  report: DeviceReport,
  { limits, settings }: CommandMappingOptions,
): CommandMapping {
  if (confirmation.mode === null && confirmation.changes.length === 0) {
    return refuse({ code: "no_changes" });
  }

  const reportedMode = normalizeMode(report.mode);
  const requested = confirmation.mode ?? reportedMode;

  if (requested === null) {
    const raw = report.mode?.trim() ?? "";

    return refuse(raw.length > 0 ? { code: "reported_mode_unsupported", mode: raw } : { code: "unknown_mode" });
  }

  const mode = normalizeMode(requested);

  if (mode === null) {
    return refuse({ code: "unsupported_mode", mode: requested });
  }

  const modeChanged = mode !== reportedMode;
  const fixedFlowSwitch = modeChanged && reportedMode !== null && FIXED_FLOW_MODES.includes(reportedMode) && FIXED_FLOW_MODES.includes(mode);

  if (modeChanged && PRESSURE_MODES.includes(mode)) {
    return refuse({ code: "pressure_mode_change", mode });
  }

  const editable = COMMAND_APPLICABILITY[mode] ?? [];
  const params: Partial<Record<CommandField, number>> = {};

  // Unchanged values: only what the device reported (across a mode change, only what the console shows, plus the
  // fixed flow between VCV and SIMV).
  for (const field of COMMAND_FIELDS) {
    const value = report.settings && Object.prototype.hasOwnProperty.call(report.settings, field) ? report.settings[field] : undefined;

    if (finite(value) && (!modeChanged || CONSOLE_FIELDS.has(field) || (field === "flowRate" && fixedFlowSwitch))) {
      params[field] = value;
    }
  }

  for (const change of confirmation.changes) {
    const command = Object.prototype.hasOwnProperty.call(COMMAND_PARAMETERS, change.parameter)
      ? COMMAND_PARAMETERS[change.parameter as ConsoleParameterId]
      : undefined;

    if (!command || !editable.includes(change.parameter)) {
      return refuse({ code: "unmappable_parameter", parameter: change.parameter, mode });
    }

    const limit = limits[change.parameter] ?? null;

    if (limit === null || !finite(change.value) || change.value < limit.min || change.value > limit.max) {
      return refuse({ code: "out_of_limits", parameter: change.parameter, limit });
    }

    params[command.field] = tidy(change.value * command.scale);
  }

  // B1: while the device reports a fixed flow it keeps that flow (the JSON encoder resends it, the hex one omits it and
  // the device keeps its own): a Vt or Ti change under that flow would move the other value unconfirmed.
  const flowCoupled = confirmation.changes.find((change) => FLOW_COUPLED_PARAMETERS.includes(change.parameter));
  const reportedFlow = report.settings?.flowRate;

  if (flowCoupled !== undefined && finite(reportedFlow)) {
    return refuse({ code: "fixed_flow", parameter: flowCoupled.parameter, flowRate: reportedFlow });
  }

  const timingChanged = confirmation.changes.some((change) => change.parameter === "respiratoryRate" || change.parameter === "inspiratoryTime");

  if (timingChanged && params.respiratoryRate !== undefined && params.inspiratoryTime !== undefined) {
    delete params.ieRatio;
  }

  // A reported I:E with only one timing value known: the device would keep the ratio and shift the other value. Fix 4
  // (W1): the device keeps its ratio even when the command does not carry it (a mode change carries no I:E).
  const timingChange = confirmation.changes.find((change) => change.parameter === "respiratoryRate" || change.parameter === "inspiratoryTime");
  const deviceIeRatio = params.ieRatio ?? report.settings?.ieRatio;
  const timingMissing = params.respiratoryRate === undefined || params.inspiratoryTime === undefined;

  if (timingChange !== undefined && timingMissing && finite(deviceIeRatio)) {
    const missing: CommandField = params.inspiratoryTime === undefined ? "inspiratoryTime" : "respiratoryRate";

    return refuse({ code: "ie_ratio_without_timing", parameter: timingChange.parameter, missing, ieRatio: deviceIeRatio });
  }

  const missing = REQUIRED_FIELDS_BY_MODE[mode].filter((field) => params[field] === undefined);

  if (missing.length > 0) {
    return refuse({ code: "missing_required", fields: missing });
  }

  const incoherent = coherenceRefusal(params, settings);

  if (incoherent !== null) {
    return refuse(incoherent);
  }

  return {
    ok: true,
    command: {
      mode,
      modeChanged,
      request: { mode, ...params },
      targets: confirmation.changes.map((change) => ({
        parameter: change.parameter,
        value: change.value,
        base: reportedConsoleValue(report, change.parameter),
      })),
    },
  };
}

/** The value the device reports for a console parameter, in console units, or null. */
export function reportedConsoleValue(report: DeviceReport, parameter: string): number | null {
  const command = Object.prototype.hasOwnProperty.call(COMMAND_PARAMETERS, parameter)
    ? COMMAND_PARAMETERS[parameter as ConsoleParameterId]
    : undefined;
  const reported = command && report.settings ? report.settings[command.field] : undefined;

  return command && finite(reported) ? tidy(reported / command.scale) : null;
}

/**
 * Whether the report shows every target within the backend apply tolerance AND strictly closer to the target than to
 * the value reported before the command (W1: a one-step change is within the tolerance of the old value).
 */
export function reportMatchesTargets(report: DeviceReport, targets: readonly CommandTarget[]): boolean {
  return targets.every((target) => {
    const reported = reportedConsoleValue(report, target.parameter);

    if (reported === null) {
      return false;
    }

    const distance = Math.abs(reported - target.value);
    const withinTolerance = distance <= REPORT_MATCH_TOLERANCE * Math.max(Math.abs(target.value), Number.EPSILON);
    const base = target.base ?? null;
    const closerThanBase = base === null || base === target.value || distance < Math.abs(reported - base);

    return withinTolerance && closerThanBase;
  });
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(2))).replace(".", ",");
}

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export function commandRefusalMessage(refusal: CommandRefusal): string {
  switch (refusal.code) {
    case "no_changes":
      return "No hay cambios para enviar.";
    case "unknown_mode":
      return "El equipo no ha informado su modo: no se puede armar el cambio sin saberlo.";
    case "unsupported_mode":
      return `El modo ${refusal.mode} no se puede enviar al ventilador físico.`;
    case "reported_mode_unsupported":
      return `El equipo informa el modo ${refusal.mode}, que esta consola no puede comandar: elige VCV o SIMV para enviar un cambio.`;
    case "fixed_flow":
      return `El equipo informa un flujo inspiratorio fijo (${formatNumber(refusal.flowRate)} L/min): cambiar Vt o Ti con ese flujo cambiaría el otro valor sin que nadie lo confirme, y esta consola no permite ajustar el flujo. No se envió nada.`;
    case "reported_ie_inconsistent":
      return `El equipo informa una relación I:E de ${formatNumber(refusal.reported)} que no coincide con su FR y su Ti (${formatNumber(refusal.derived)}): el servidor rechazaría el cambio. Cambia la FR o el Ti para que la relación se recalcule.`;
    case "ie_ratio_without_timing": {
      const changed = COMMAND_PARAMETERS[refusal.parameter as ConsoleParameterId]?.field;
      const changedName = changed ? commandFieldName(changed) : refusal.parameter;
      const missingName = commandFieldName(refusal.missing);

      return `El equipo informa una relación I:E (${formatNumber(refusal.ieRatio)}) pero no informa ${missingName}: cambiar ${changedName} con esa relación cambiaría ${missingName} en el equipo sin que nadie lo confirme. No se envió nada.`;
    }
    case "pressure_mode_change":
      return `No se puede cambiar a ${refusal.mode} desde esta consola: el equipo necesita una presión límite absoluta que la consola no permite fijar.`;
    case "unmappable_parameter":
      return `${parameterName(refusal.parameter)} no se puede ajustar en ${refusal.mode} desde esta consola.`;
    case "out_of_limits":
      return refusal.limit
        ? `${parameterName(refusal.parameter)} está fuera del rango permitido (${formatNumber(refusal.limit.min)}–${formatNumber(refusal.limit.max)} ${refusal.limit.unit}).`
        : `${parameterName(refusal.parameter)} no tiene un rango permitido para enviarlo.`;
    case "missing_required":
      return `El equipo no ha informado ${refusal.fields.map(commandFieldName).join(", ")}: no se puede enviar el cambio sin esos valores.`;
    case "expiratory_time":
      return `Con esa FR y ese Ti el tiempo espiratorio sería de ${formatNumber(refusal.expiratoryTimeS)} s; el mínimo es ${formatNumber(MIN_EXPIRATORY_TIME_S)} s.`;
    case "ie_ratio":
      return `Con esa FR y ese Ti la relación I:E sería ${formatNumber(refusal.ratio)}; el máximo permitido es ${formatNumber(refusal.max)} (no se permiten relaciones invertidas).`;
    case "pressure_not_above_peep":
      return `La PEEP (${formatNumber(refusal.peep)} cmH2O) debe quedar por debajo de la presión límite del equipo (${formatNumber(refusal.pressureLimit)} cmH2O).`;
    default:
      return "No se pudo armar el cambio.";
  }
}
