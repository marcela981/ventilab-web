/*
* Funcionalidad: Console controls reducer
* Descripción: Pure state of the real-device control pattern of the ventilator console: the selected parameter, the pending (unconfirmed) parameter values and the pending mode. Adjustments step or set a value clamped and snapped to the injected limit; a value back at the applied one stops being pending; a mode change makes the mode pending and drops pending values of parameters that no longer apply; reset clears everything (after confirm or cancel). Also the keyboard mapping (arrows, PageUp/PageDown ×10, Home/End) and the confirmation diff. Emits nothing itself: the component calls onConfirm with buildConfirmation, which ignores values and a mode the source already applied. A step that is zero, negative or not finite disables snapping; steps in exponent form keep their precision. v1.2: without a valid step grid the step keys (arrows, PageUp/PageDown) map to nothing and a step adjustment leaves the state unchanged; hasStepGrid is exported. Depends only on the console contract types.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ConsoleConfirmation, ConsoleSettingValues, ParameterLimit } from "./ventilator-console.entity";

export type ControlsState = {
  selected: string | null
  pendingValues: Readonly<Record<string, number>>
  /** `null`: the applied mode is kept. */
  pendingMode: string | null
};

export const INITIAL_CONTROLS_STATE: ControlsState = { selected: null, pendingValues: {}, pendingMode: null };

/** `base` is the applied value the pending one is compared with. */
export type ControlsAction =
  | { type: "select", parameter: string | null }
  | { type: "adjust", parameter: string, steps: number, base: number, limit: ParameterLimit }
  | { type: "setValue", parameter: string, value: number, base: number, limit: ParameterLimit }
  | { type: "selectMode", mode: string, appliedMode: string, applicable: readonly string[] }
  | { type: "reset" };

export type Adjustment = { kind: "steps", steps: number } | { kind: "value", value: number };

const PAGE_STEPS = 10;

/** A step that can be added to a value: finite and positive. */
export function hasStepGrid(step: number): boolean {
  return Number.isFinite(step) && step > 0;
}

/** Decimals of a step (0.01 → 2, 1e-7 → 7, 2.5e-7 → 8); used to round and to format values. 0 without a step grid. */
export function stepDecimals(step: number): number {
  if (!hasStepGrid(step)) {
    return 0;
  }

  const [mantissa = "", exponent = "0"] = String(step).toLowerCase().split("e");
  const fraction = mantissa.split(".")[1]?.length ?? 0;

  return Math.max(0, fraction - Number(exponent));
}

/**
 * Clamps to [min, max] and snaps to the step grid that starts at `min`, rounded to the step precision.
 * A step that is zero, negative or not finite means "no snapping": the value is only clamped.
 */
export function clampToLimit(value: number, limit: ParameterLimit): number {
  if (!hasStepGrid(limit.step)) {
    return Math.min(limit.max, Math.max(limit.min, value));
  }

  const snapped = limit.min + Math.round((value - limit.min) / limit.step) * limit.step;
  const clamped = Math.min(limit.max, Math.max(limit.min, snapped));

  return Number(clamped.toFixed(stepDecimals(limit.step)));
}

export function keyToAdjustment(key: string, limit: ParameterLimit): Adjustment | null {
  const stepping = hasStepGrid(limit.step);

  switch (key) {
    case "ArrowUp":
    case "ArrowRight":
      return stepping ? { kind: "steps", steps: 1 } : null;
    case "ArrowDown":
    case "ArrowLeft":
      return stepping ? { kind: "steps", steps: -1 } : null;
    case "PageUp":
      return stepping ? { kind: "steps", steps: PAGE_STEPS } : null;
    case "PageDown":
      return stepping ? { kind: "steps", steps: -PAGE_STEPS } : null;
    case "Home":
      return { kind: "value", value: limit.min };
    case "End":
      return { kind: "value", value: limit.max };
    default:
      return null;
  }
}

function withPending(state: ControlsState, parameter: string, value: number, base: number): ControlsState {
  const others = Object.fromEntries(Object.entries(state.pendingValues).filter(([id]) => id !== parameter));
  const pendingValues = value === base ? others : { ...others, [parameter]: value };

  return { ...state, selected: parameter, pendingValues };
}

export function controlsReducer(state: ControlsState, action: ControlsAction): ControlsState {
  switch (action.type) {
    case "select":
      return { ...state, selected: action.parameter };
    case "adjust": {
      // Without a step grid there is nothing to step by (Home/End and typed values still set it).
      if (!hasStepGrid(action.limit.step)) {
        return state;
      }

      const from = state.pendingValues[action.parameter] ?? action.base;
      const value = clampToLimit(from + action.steps * action.limit.step, action.limit);

      return withPending(state, action.parameter, value, action.base);
    }
    case "setValue":
      return withPending(state, action.parameter, clampToLimit(action.value, action.limit), action.base);
    case "selectMode": {
      const applicable = new Set(action.applicable);
      const pendingValues = Object.fromEntries(Object.entries(state.pendingValues).filter(([parameter]) => applicable.has(parameter)));
      const selected = state.selected !== null && applicable.has(state.selected) ? state.selected : null;

      return { selected, pendingValues, pendingMode: action.mode === action.appliedMode ? null : action.mode };
    }
    case "reset":
      return INITIAL_CONTROLS_STATE;
  }
}

/** The effective pending mode: `null` when none is pending or it already is the applied mode. */
export function pendingModeOf(state: ControlsState, appliedMode: string): string | null {
  return state.pendingMode === null || state.pendingMode === appliedMode ? null : state.pendingMode;
}

/**
 * The diff CONFIRMAR emits, or `null` when nothing is pending. Values equal to the applied ones and a pending
 * mode equal to the applied mode are not changes (the source may have applied them in the meantime).
 */
export function buildConfirmation(state: ControlsState, applied: ConsoleSettingValues, appliedMode: string): ConsoleConfirmation | null {
  const mode = pendingModeOf(state, appliedMode);
  const changes = Object.entries(state.pendingValues)
    .filter(([parameter, value]) => applied[parameter] !== value)
    .map(([parameter, value]) => ({ parameter, value }));

  if (changes.length === 0 && mode === null) {
    return null;
  }

  return { mode, changes };
}
