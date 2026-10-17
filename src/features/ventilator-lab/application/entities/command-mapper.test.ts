/*
* Funcionalidad: Ventilator command mapper tests
* Descripción: The console confirmation becomes a SendVentilatorCommandRequestDTO only from values the operator confirmed or the device reported: FiO2 % → fraction, flow trigger → sensitivity, the unchanged required fields of the mode taken from the reported settings, the I:E ratio dropped when RR/Ti change, fields without a console control carried only while the mode is unchanged; it refuses (never guesses) without changes, without a known mode, for a change into PCV/PSV (absolute pressure limit with no console control), for a parameter without a backend field, out of the limits, when a required field was never reported and for incoherent times or pressures. The limits are the stricter of the vendored engine limits and the backend safety maxima; the editable parameters per mode and the mode options; the device report keeps the latest settings and mode; a report matches the targets within the backend tolerance. v1.1 (T8 review fix): a Vt/Ti change is refused while the device reports a fixed flow (B1), a report must be closer to the target than to the pre-command base (W1), an unsupported reported mode (S2) and a reported I:E inconsistent with FR/Ti (S3) are explained. v1.2 (T8 review fix 2): the B1 refusal also applies across a mode change and in PCV. v1.3 (T8 review fix 3): the reported flow is carried across VCV ↔ SIMV (W3) and an FR change under a reported I:E without a reported Ti is refused. v1.4 (T8 review fix 4): W1 that refusal also applies across a mode change (the device keeps its I:E even when the command does not carry it). Depends on vitest and the command mapper entity.
* Versión: 1.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { VentilatorTelemetryFrame } from "@shared/realtime";
import { LAB_SETTING_DEFAULTS } from "./lab-settings.entity";
import type { LabSettings } from "./lab-settings.entity";
import {
  buildCommandLimits,
  COMMAND_APPLICABILITY,
  commandModeOptions,
  commandRefusalMessage,
  EMPTY_DEVICE_REPORT,
  mapConfirmationToCommand,
  reduceDeviceReport,
  reportMatchesTargets,
} from "./command-mapper";
import type { DeviceReport } from "./command-mapper";

const LIMITS = buildCommandLimits(LAB_SETTING_DEFAULTS);
const OPTIONS = { limits: LIMITS, settings: LAB_SETTING_DEFAULTS };

const VCV_REPORT: DeviceReport = {
  mode: "VCV",
  settings: { tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.4, inspiratoryTime: 1, sensitivity: 2, pressureLimit: 35 },
};

const PCV_REPORT: DeviceReport = {
  mode: "PCV",
  settings: { pressureLimit: 20, respiratoryRate: 14, peep: 5, fio2: 0.4, inspiratoryTime: 1 },
};

describe("buildCommandLimits", () => {
  it("takes the stricter of the engine limits and the backend safety maxima, in console units", () => {
    expect(LIMITS).toEqual({
      tidalVolume: { min: 200, max: 700, step: 10, unit: "mL" },
      respiratoryRate: { min: 5, max: 35, step: 1, unit: "rpm" },
      peep: { min: 0, max: 15, step: 1, unit: "cmH2O" },
      fio2: { min: 21, max: 100, step: 1, unit: "%" },
      inspiratoryTime: { min: 0.5, max: 3, step: 0.1, unit: "s" },
      flowTrigger: { min: 0.5, max: 10, step: 0.5, unit: "L/min" },
    });
  });

  it("follows stricter server safety settings and never widens past the engine limits", () => {
    const strict: LabSettings = { ...LAB_SETTING_DEFAULTS, "commands.safety.maxPeep": 10, "commands.safety.maxTidalVolume": 900 };
    const limits = buildCommandLimits(strict);

    expect(limits.peep?.max).toBe(10);
    expect(limits.tidalVolume?.max).toBe(800);
  });

  it("offers no pressure parameter and no PEEP in the pressure modes", () => {
    expect(COMMAND_APPLICABILITY.VCV).toContain("peep");
    expect(COMMAND_APPLICABILITY.PCV).not.toContain("peep");
    expect(COMMAND_APPLICABILITY.PSV).not.toContain("peep");
    Object.values(COMMAND_APPLICABILITY).forEach((parameters) => {
      expect(parameters).not.toContain("inspiratoryPressure");
      expect(parameters).not.toContain("pressureSupport");
    });
  });

  it("offers VCV and SIMV, and a pressure mode only while the device runs it", () => {
    expect(commandModeOptions("VCV").map((option) => option.id)).toEqual(["VCV", "SIMV"]);
    expect(commandModeOptions("PCV").map((option) => option.id)).toEqual(["VCV", "PCV", "SIMV"]);
    expect(commandModeOptions(null).map((option) => option.id)).toEqual(["VCV", "SIMV"]);
  });
});

describe("mapConfirmationToCommand", () => {
  it("maps units and fills the unchanged fields from the reported settings", () => {
    const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "fio2", value: 60 }, { parameter: "flowTrigger", value: 3.5 }] }, VCV_REPORT, OPTIONS);

    expect(result).toEqual({
      ok: true,
      command: {
        mode: "VCV",
        modeChanged: false,
        request: { mode: "VCV", tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.6, inspiratoryTime: 1, sensitivity: 3.5, pressureLimit: 35 },
        targets: [{ parameter: "fio2", value: 60, base: 40 }, { parameter: "flowTrigger", value: 3.5, base: 2 }],
      },
    });
  });

  it("keeps the binary noise out of the FiO2 fraction", () => {
    const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "fio2", value: 29 }] }, VCV_REPORT, OPTIONS);

    expect(result.ok && result.command.request.fio2).toBe(0.29);
  });

  it("drops a reported I:E ratio when the rate or the inspiratory time changes (the backend derives it)", () => {
    const report: DeviceReport = { mode: "VCV", settings: { ...VCV_REPORT.settings, ieRatio: 0.3 } };
    const changed = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "respiratoryRate", value: 16 }] }, report, OPTIONS);
    const unchanged = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "peep", value: 6 }] }, report, OPTIONS);

    expect(changed.ok && changed.command.request.ieRatio).toBeUndefined();
    expect(unchanged.ok && unchanged.command.request.ieRatio).toBe(0.3);
  });

  it("switches VCV → SIMV carrying only the fields the console shows", () => {
    const result = mapConfirmationToCommand({ mode: "SIMV", changes: [] }, VCV_REPORT, OPTIONS);

    expect(result).toEqual({
      ok: true,
      command: {
        mode: "SIMV",
        modeChanged: true,
        request: { mode: "SIMV", tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.4, inspiratoryTime: 1, sensitivity: 2 },
        targets: [],
      },
    });
  });

  it("keeps the absolute pressure limit unchanged while the device stays in PCV", () => {
    const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "respiratoryRate", value: 18 }] }, PCV_REPORT, OPTIONS);

    expect(result.ok && result.command.request).toEqual({ mode: "PCV", pressureLimit: 20, respiratoryRate: 18, peep: 5, fio2: 0.4, inspiratoryTime: 1 });
  });

  it("matches the reported mode case-insensitively", () => {
    const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "peep", value: 6 }] }, { ...VCV_REPORT, mode: "vcv" }, OPTIONS);

    expect(result.ok && result.command.modeChanged).toBe(false);
  });

  it.each([
    ["no changes", { mode: null, changes: [] }, VCV_REPORT, "no_changes"],
    ["no reported mode", { mode: null, changes: [{ parameter: "peep", value: 6 }] }, { ...VCV_REPORT, mode: null }, "unknown_mode"],
    ["a mode the backend does not take", { mode: "CPAP", changes: [] }, VCV_REPORT, "unsupported_mode"],
    ["a change into PCV", { mode: "PCV", changes: [] }, VCV_REPORT, "pressure_mode_change"],
    ["a change into PSV", { mode: "PSV", changes: [] }, PCV_REPORT, "pressure_mode_change"],
    ["a parameter without a backend field", { mode: null, changes: [{ parameter: "inspiratoryPressure", value: 15 }] }, PCV_REPORT, "unmappable_parameter"],
    ["PEEP in PCV (absolute pressure limit)", { mode: null, changes: [{ parameter: "peep", value: 8 }] }, PCV_REPORT, "unmappable_parameter"],
    ["a value out of the limits", { mode: null, changes: [{ parameter: "peep", value: 16 }] }, VCV_REPORT, "out_of_limits"],
    ["a non-finite value", { mode: null, changes: [{ parameter: "peep", value: Number.NaN }] }, VCV_REPORT, "out_of_limits"],
    ["a required field never reported", { mode: null, changes: [{ parameter: "peep", value: 6 }] }, { mode: "VCV", settings: { respiratoryRate: 14, peep: 5, fio2: 0.4 } }, "missing_required"],
    ["no reported settings at all", { mode: null, changes: [{ parameter: "peep", value: 6 }] }, { mode: "VCV", settings: null }, "missing_required"],
    ["an expiratory time below 0.3 s", { mode: null, changes: [{ parameter: "respiratoryRate", value: 35 }] }, { mode: "VCV", settings: { ...VCV_REPORT.settings, inspiratoryTime: 1.5 } }, "expiratory_time"],
    ["an inverse I:E ratio", { mode: null, changes: [{ parameter: "inspiratoryTime", value: 2.5 }] }, VCV_REPORT, "ie_ratio"],
    ["a pressure limit not above PEEP", { mode: null, changes: [{ parameter: "peep", value: 15 }] }, { mode: "VCV", settings: { ...VCV_REPORT.settings, pressureLimit: 12 } }, "pressure_not_above_peep"],
  ] as const)("refuses %s", (_label, confirmation, report, code) => {
    const result = mapConfirmationToCommand(confirmation, report, OPTIONS);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.refusal.code).toBe(code);
    expect(!result.ok && commandRefusalMessage(result.refusal).length).toBeGreaterThan(10);
  });

  describe("a fixed inspiratory flow reported by the device (T8 review B1)", () => {
    const FLOW_REPORT: DeviceReport = { mode: "VCV", settings: { ...VCV_REPORT.settings, flowRate: 27 } };

    it.each([
      ["Vt", "tidalVolume", 600],
      ["Ti", "inspiratoryTime", 1.2],
    ])("refuses a %s change instead of resending the stale flow", (_label, parameter, value) => {
      const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter, value }] }, FLOW_REPORT, OPTIONS);

      expect(result.ok).toBe(false);
      expect(!result.ok && result.refusal).toEqual({ code: "fixed_flow", parameter, flowRate: 27 });
      expect(!result.ok && commandRefusalMessage(result.refusal)).toBe(
        "El equipo informa un flujo inspiratorio fijo (27 L/min): cambiar Vt o Ti con ese flujo cambiaría el otro valor sin que nadie lo confirme, y esta consola no permite ajustar el flujo. No se envió nada.",
      );
    });

    it("still sends changes that keep Vt and Ti, carrying the reported flow", () => {
      const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "peep", value: 6 }, { parameter: "respiratoryRate", value: 16 }] }, FLOW_REPORT, OPTIONS);

      expect(result.ok && result.command.request.flowRate).toBe(27);
    });

    it("sends a Vt change when the device reports no flow", () => {
      const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "tidalVolume", value: 600 }] }, VCV_REPORT, OPTIONS);

      expect(result.ok && result.command.request.flowRate).toBeUndefined();
      expect(result.ok && result.command.request.tidalVolume).toBe(600);
    });

    // T8 review fix 2 (B1): the backend encoder never sends flowRate, so the device keeps its own flow whatever the mode.
    it.each([
      ["Vt", "tidalVolume", 600],
      ["Ti", "inspiratoryTime", 1.2],
    ])("refuses a %s change on a mode change too (the device keeps its own flow)", (_label, parameter, value) => {
      const result = mapConfirmationToCommand({ mode: "SIMV", changes: [{ parameter, value }] }, FLOW_REPORT, OPTIONS);

      expect(!result.ok && result.refusal).toEqual({ code: "fixed_flow", parameter, flowRate: 27 });
    });

    it("refuses a Ti change in a pressure mode while a flow is reported", () => {
      const report: DeviceReport = { mode: "PCV", settings: { ...PCV_REPORT.settings, flowRate: 30 } };
      const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "inspiratoryTime", value: 1.2 }] }, report, OPTIONS);

      expect(!result.ok && result.refusal).toEqual({ code: "fixed_flow", parameter: "inspiratoryTime", flowRate: 30 });
    });

    // T8 review fix 3 (W3): the default JSON encoder DOES send flowRate; VCV and SIMV are both fixed-flow modes, so the
    // reported flow is carried across VCV ↔ SIMV (a dropped flow could let the device fall back to a default flow).
    it.each([
      ["VCV → SIMV", FLOW_REPORT, "SIMV"],
      ["SIMV → VCV", { ...FLOW_REPORT, mode: "SIMV" }, "VCV"],
    ] as const)("still allows a mode change %s that keeps Vt and Ti, carrying the reported flow", (_label, report, mode) => {
      const result = mapConfirmationToCommand({ mode, changes: [{ parameter: "peep", value: 6 }] }, report, OPTIONS);

      expect(result.ok).toBe(true);
      expect(result.ok && result.command.request.flowRate).toBe(27);
    });
  });

  // T8 review fix 3 (pre-existing): the backend never derives Ti from I:E; the device semantics are not documented.
  it("refuses an RR change while the device reports an I:E ratio but no Ti (the device Ti would shift unconfirmed)", () => {
    const report: DeviceReport = { mode: "VCV", settings: { tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.4, sensitivity: 2, ieRatio: 0.5 } };
    const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "respiratoryRate", value: 16 }] }, report, OPTIONS);

    expect(!result.ok && result.refusal).toEqual({ code: "ie_ratio_without_timing", parameter: "respiratoryRate", missing: "inspiratoryTime", ieRatio: 0.5 });
    expect(!result.ok && commandRefusalMessage(result.refusal)).toBe(
      "El equipo informa una relación I:E (0,5) pero no informa Ti (tiempo inspiratorio): cambiar FR (frecuencia respiratoria) con esa relación cambiaría Ti (tiempo inspiratorio) en el equipo sin que nadie lo confirme. No se envió nada.",
    );

    // A change that does not touch the timing still carries the reported I:E.
    const peep = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "peep", value: 6 }] }, report, OPTIONS);

    expect(peep.ok && peep.command.request.ieRatio).toBe(0.5);
  });

  // T8 review fix 4 (W1): a mode change does not carry the I:E (not a console field), but the device still keeps it.
  it("refuses an RR change across a mode change while the device reports an I:E ratio but no Ti", () => {
    const report: DeviceReport = { mode: "VCV", settings: { tidalVolume: 450, respiratoryRate: 14, peep: 5, fio2: 0.4, sensitivity: 2, ieRatio: 0.5 } };
    const result = mapConfirmationToCommand({ mode: "SIMV", changes: [{ parameter: "respiratoryRate", value: 16 }] }, report, OPTIONS);

    expect(!result.ok && result.refusal).toEqual({ code: "ie_ratio_without_timing", parameter: "respiratoryRate", missing: "inspiratoryTime", ieRatio: 0.5 });

    // With both timing values known the reported I:E is not an obstacle (the backend derives it).
    const both = mapConfirmationToCommand(
      { mode: "SIMV", changes: [{ parameter: "respiratoryRate", value: 16 }] },
      { mode: "VCV", settings: { ...report.settings, inspiratoryTime: 1 } },
      OPTIONS,
    );

    expect(both.ok && both.command.request.ieRatio).toBeUndefined();
    expect(both.ok).toBe(true);
  });

  it("explains a reported mode the console cannot command (T8 review S2)", () => {
    const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "peep", value: 6 }] }, { ...VCV_REPORT, mode: "CPAP" }, OPTIONS);

    expect(!result.ok && result.refusal).toEqual({ code: "reported_mode_unsupported", mode: "CPAP" });
    expect(!result.ok && commandRefusalMessage(result.refusal)).toBe(
      "El equipo informa el modo CPAP, que esta consola no puede comandar: elige VCV o SIMV para enviar un cambio.",
    );
  });

  it("explains a reported I:E ratio inconsistent with the reported FR and Ti instead of sending it (T8 review S3)", () => {
    // FR 14 and Ti 1 s give Te 3,29 s and I:E 0,30; the device reports 0,5.
    const report: DeviceReport = { mode: "VCV", settings: { ...VCV_REPORT.settings, ieRatio: 0.5 } };
    const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "peep", value: 6 }] }, report, OPTIONS);

    expect(!result.ok && result.refusal.code).toBe("reported_ie_inconsistent");
    expect(!result.ok && commandRefusalMessage(result.refusal)).toBe(
      "El equipo informa una relación I:E de 0,5 que no coincide con su FR y su Ti (0,3): el servidor rechazaría el cambio. Cambia la FR o el Ti para que la relación se recalcule.",
    );

    const consistent = mapConfirmationToCommand(
      { mode: null, changes: [{ parameter: "peep", value: 6 }] },
      { mode: "VCV", settings: { ...VCV_REPORT.settings, ieRatio: 0.3 } },
      OPTIONS,
    );

    expect(consistent.ok).toBe(true);
  });

  it("names the missing fields in Spanish", () => {
    const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "peep", value: 6 }] }, { mode: "VCV", settings: { peep: 5, fio2: 0.4 } }, OPTIONS);

    expect(!result.ok && commandRefusalMessage(result.refusal)).toBe(
      "El equipo no ha informado Vt (volumen corriente), FR (frecuencia respiratoria): no se puede enviar el cambio sin esos valores.",
    );
  });
});

describe("reduceDeviceReport / reportMatchesTargets", () => {
  const frame = (patch: Partial<VentilatorTelemetryFrame>): VentilatorTelemetryFrame => ({ serverTs: 1, pressure: 0, flow: 0, volume: 0, deviceId: "esp", ...patch });

  it("keeps the latest settings object and mode the frames report", () => {
    const first = reduceDeviceReport(EMPTY_DEVICE_REPORT, [frame({ mode: "VCV", settings: { peep: 5, fio2: 0.4 } }), frame({})]);

    expect(first).toEqual({ mode: "VCV", settings: { peep: 5, fio2: 0.4 } });
    expect(reduceDeviceReport(first, [frame({})])).toBe(first);
    expect(reduceDeviceReport(first, [frame({ settings: { peep: 6 } })])).toEqual({ mode: "VCV", settings: { peep: 6 } });
  });

  it("matches the targets in console units within the backend tolerance", () => {
    const targets = [{ parameter: "fio2", value: 60 }, { parameter: "peep", value: 8 }];

    expect(reportMatchesTargets({ mode: "VCV", settings: { fio2: 0.6, peep: 8 } }, targets)).toBe(true);
    expect(reportMatchesTargets({ mode: "VCV", settings: { fio2: 0.6, peep: 5 } }, targets)).toBe(false);
    expect(reportMatchesTargets({ mode: "VCV", settings: { fio2: 0.6 } }, targets)).toBe(false);
    expect(reportMatchesTargets({ mode: "VCV", settings: null }, [])).toBe(true);
  });

  it("needs the report closer to the target than to the value before the command (T8 review W1)", () => {
    const vt = [{ parameter: "tidalVolume", value: 460, base: 450 }];
    const fio2 = [{ parameter: "fio2", value: 41, base: 40 }];

    // Within 5 % of the target but still the old value: not applied.
    expect(reportMatchesTargets({ mode: "VCV", settings: { tidalVolume: 450 } }, vt)).toBe(false);
    expect(reportMatchesTargets({ mode: "VCV", settings: { tidalVolume: 455 } }, vt)).toBe(false);
    expect(reportMatchesTargets({ mode: "VCV", settings: { tidalVolume: 458 } }, vt)).toBe(true);
    expect(reportMatchesTargets({ mode: "VCV", settings: { tidalVolume: 460 } }, vt)).toBe(true);
    expect(reportMatchesTargets({ mode: "VCV", settings: { fio2: 0.4 } }, fio2)).toBe(false);
    expect(reportMatchesTargets({ mode: "VCV", settings: { fio2: 0.41 } }, fio2)).toBe(true);
  });

  it("records the reported value before the command as the base of each target", () => {
    const result = mapConfirmationToCommand({ mode: null, changes: [{ parameter: "fio2", value: 60 }] }, VCV_REPORT, OPTIONS);

    expect(result.ok && result.command.targets).toEqual([{ parameter: "fio2", value: 60, base: 40 }]);
  });
});
