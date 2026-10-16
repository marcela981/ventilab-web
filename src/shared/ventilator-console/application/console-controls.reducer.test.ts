/*
* Funcionalidad: Console controls reducer tests
* Descripción: Unit tests of the pure pending→confirm/cancel controls of the ventilator console: step adjustment with clamping and step snapping to the injected limits, keyboard mapping (arrows, PageUp/PageDown ×10, Home/End), the confirmation diff (only changed parameters, the pending mode), the reset after confirm or cancel, the mode change that drops the pending values of parameters that no longer apply, and the console-owned mode→parameter applicability filter. Depends on Vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { getParametersForMode, MODE_PARAMETERS } from "./config/console-controls.config";
import {
  buildConfirmation,
  clampToLimit,
  controlsReducer,
  INITIAL_CONTROLS_STATE,
  keyToAdjustment,
} from "./console-controls.reducer";
import type { ControlsState } from "./console-controls.reducer";
import type { ConsoleLimits, ParameterLimit } from "./ventilator-console.entity";

const PEEP: ParameterLimit = { min: 0, max: 20, step: 1, unit: "cmH2O" };
const FIO2: ParameterLimit = { min: 0.21, max: 1, step: 0.01, unit: "" };

const LIMITS: ConsoleLimits = {
  tidalVolume: { min: 200, max: 800, step: 10, unit: "mL" },
  respiratoryRate: { min: 5, max: 40, step: 1, unit: "rpm" },
  peep: PEEP,
  fio2: FIO2,
  inspiratoryTime: { min: 0.5, max: 3, step: 0.1, unit: "s" },
  inspiratoryPressure: { min: 5, max: 40, step: 1, unit: "cmH2O" },
  pressureSupport: { min: 0, max: 30, step: 1, unit: "cmH2O" },
};

describe("clampToLimit", () => {
  it("clamps to min/max and snaps to the step grid without float noise", () => {
    expect(clampToLimit(25, PEEP)).toBe(20);
    expect(clampToLimit(-3, PEEP)).toBe(0);
    expect(clampToLimit(5.4, PEEP)).toBe(5);
    expect(clampToLimit(0.21 + 0.01 * 3, FIO2)).toBe(0.24);
    expect(clampToLimit(1.5, FIO2)).toBe(1);
  });
});

describe("keyToAdjustment", () => {
  it("maps arrows to one step, PageUp/PageDown to ten and Home/End to the limits", () => {
    expect(keyToAdjustment("ArrowUp", PEEP)).toEqual({ kind: "steps", steps: 1 });
    expect(keyToAdjustment("ArrowLeft", PEEP)).toEqual({ kind: "steps", steps: -1 });
    expect(keyToAdjustment("PageUp", PEEP)).toEqual({ kind: "steps", steps: 10 });
    expect(keyToAdjustment("PageDown", PEEP)).toEqual({ kind: "steps", steps: -10 });
    expect(keyToAdjustment("Home", PEEP)).toEqual({ kind: "value", value: 0 });
    expect(keyToAdjustment("End", PEEP)).toEqual({ kind: "value", value: 20 });
    expect(keyToAdjustment("a", PEEP)).toBeNull();
  });
});

describe("controlsReducer", () => {
  it("keeps an adjusted value pending, clamped to the limits, and selects the parameter", () => {
    let state = controlsReducer(INITIAL_CONTROLS_STATE, { type: "adjust", parameter: "peep", steps: 3, base: 5, limit: PEEP });

    expect(state.pendingValues).toEqual({ peep: 8 });
    expect(state.selected).toBe("peep");

    state = controlsReducer(state, { type: "adjust", parameter: "peep", steps: 10, base: 5, limit: PEEP });
    state = controlsReducer(state, { type: "adjust", parameter: "peep", steps: 10, base: 5, limit: PEEP });
    expect(state.pendingValues).toEqual({ peep: 20 });
  });

  it("drops the pending value when it returns to the applied value", () => {
    let state = controlsReducer(INITIAL_CONTROLS_STATE, { type: "adjust", parameter: "peep", steps: 1, base: 5, limit: PEEP });
    state = controlsReducer(state, { type: "adjust", parameter: "peep", steps: -1, base: 5, limit: PEEP });

    expect(state.pendingValues).toEqual({});
  });

  it("sets an absolute value clamped to the limits", () => {
    const state = controlsReducer(INITIAL_CONTROLS_STATE, { type: "setValue", parameter: "peep", value: 99, base: 5, limit: PEEP });

    expect(state.pendingValues).toEqual({ peep: 20 });
  });

  it("builds a confirmation with only the changed parameters and the pending mode", () => {
    const state: ControlsState = { selected: "peep", pendingValues: { peep: 8, fio2: 0.4 }, pendingMode: "PCV" };

    expect(buildConfirmation(state, { peep: 5, fio2: 0.4 })).toEqual({ mode: "PCV", changes: [{ parameter: "peep", value: 8 }] });
    expect(buildConfirmation(INITIAL_CONTROLS_STATE, { peep: 5 })).toBeNull();
  });

  it("resets everything after confirm or cancel", () => {
    const state: ControlsState = { selected: "peep", pendingValues: { peep: 8 }, pendingMode: "PCV" };

    expect(controlsReducer(state, { type: "reset" })).toEqual(INITIAL_CONTROLS_STATE);
  });

  it("makes a different mode pending and drops pending values that no longer apply", () => {
    const state: ControlsState = { selected: "tidalVolume", pendingValues: { tidalVolume: 450, peep: 8 }, pendingMode: null };
    const next = controlsReducer(state, {
      type: "selectMode",
      mode: "PCV",
      appliedMode: "VCV",
      applicable: getParametersForMode("PCV", LIMITS),
    });

    expect(next.pendingMode).toBe("PCV");
    expect(next.pendingValues).toEqual({ peep: 8 });
    expect(next.selected).toBeNull();

    const back = controlsReducer(next, { type: "selectMode", mode: "VCV", appliedMode: "VCV", applicable: getParametersForMode("VCV", LIMITS) });
    expect(back.pendingMode).toBeNull();
  });
});

describe("getParametersForMode", () => {
  it("returns only the parameters that apply to the mode and that have injected limits, in table order", () => {
    expect(getParametersForMode("VCV", LIMITS)).toEqual(["tidalVolume", "respiratoryRate", "peep", "fio2", "inspiratoryTime"]);
    expect(getParametersForMode("PCV", LIMITS)).toEqual(["inspiratoryPressure", "respiratoryRate", "peep", "fio2", "inspiratoryTime"]);
    expect(getParametersForMode("PSV", LIMITS)).toEqual(["pressureSupport", "peep", "fio2"]);
    expect(getParametersForMode("CPAP", LIMITS)).toEqual(["peep", "fio2"]);
    expect(getParametersForMode("SIMV", LIMITS)).toEqual(["tidalVolume", "respiratoryRate", "peep", "fio2", "inspiratoryTime", "pressureSupport"]);
  });

  it("returns nothing for an unknown mode and honors a consumer table", () => {
    expect(getParametersForMode("HFOV", LIMITS)).toEqual([]);
    expect(getParametersForMode("SIMV", LIMITS, { ...MODE_PARAMETERS, SIMV: ["inspiratoryPressure", "peep"] })).toEqual([
      "inspiratoryPressure",
      "peep",
    ]);
  });
});
