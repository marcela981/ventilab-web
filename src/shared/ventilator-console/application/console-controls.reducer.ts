/*
* Funcionalidad: Console controls reducer
* Descripción: Pure state of the real-device control pattern of the ventilator console: the selected parameter, the pending (unconfirmed) parameter values and the pending mode. Adjustments step or set a value clamped and snapped to the injected limit; a value back at the applied one stops being pending; a mode change makes the mode pending and drops pending values of parameters that no longer apply; reset clears everything (after confirm or cancel). Also the keyboard mapping (arrows, PageUp/PageDown ×10, Home/End) and the confirmation diff. Emits nothing itself: the component calls onConfirm with buildConfirmation. Depends only on the console contract types.
* Versión: 1.0
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

/** Decimals of a step (0.01 → 2); used to round and to format values. */
export function stepDecimals(step: number): number {
  const [, fraction] = String(step).split(".");

  return fraction?.length ?? 0;
}

/** Clamps to [min, max] and snaps to the step grid that starts at `min`, rounded to the step precision. */
export function clampToLimit(value: number, limit: ParameterLimit): number {
  const snapped = limit.min + Math.round((value - limit.min) / limit.step) * limit.step;
  const clamped = Math.min(limit.max, Math.max(limit.min, snapped));

  return Number(clamped.toFixed(stepDecimals(limit.step)));
}

export function keyToAdjustment(key: string, limit: ParameterLimit): Adjustment | null {
  switch (key) {
    case "ArrowUp":
    case "ArrowRight":
      return { kind: "steps", steps: 1 };
    case "ArrowDown":
    case "ArrowLeft":
      return { kind: "steps", steps: -1 };
    case "PageUp":
      return { kind: "steps", steps: PAGE_STEPS };
    case "PageDown":
      return { kind: "steps", steps: -PAGE_STEPS };
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

/** The diff CONFIRMAR emits, or `null` when nothing is pending. */
export function buildConfirmation(state: ControlsState, applied: ConsoleSettingValues): ConsoleConfirmation | null {
  const changes = Object.entries(state.pendingValues)
    .filter(([parameter, value]) => applied[parameter] !== value)
    .map(([parameter, value]) => ({ parameter, value }));

  if (changes.length === 0 && state.pendingMode === null) {
    return null;
  }

  return { mode: state.pendingMode, changes };
}
