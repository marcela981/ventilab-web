/*
* Funcionalidad: Console pending edits store
* Descripción: Per-console external store of the unconfirmed edits (selected parameter, pending values and pending mode), so controls spread over several zones of the console (July layout: input row, right column, confirm buttons on the left) share one state while each one re-renders only for its own slice. It runs the same pure controls reducer (console-controls.reducer.ts) behind `subscribe`/`getSnapshot` (the console store pattern, useStoreSelector), with cached per-parameter selectors (a primitive per control, so a click re-renders only the touched control, the counter and the buttons, never the metrics or the curves). Also the shared edit operations the classic ConsoleControls and the July controls call at event time (adjust a parameter from its reported base, select a mode with its applicable parameters, confirm and cancel) and the lifecycle hook that reports pending transitions (onPendingChange, also false on unmount) and drops the edits when `pendingResetKey` changes. v0.1 (Bloque 5, C1): lifted from the local useReducer of ConsoleControls without changing its behaviour. Depends on React, the console store and the controls reducer.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useRef, useState } from "react";
import { getParametersForMode } from "./config/console-controls.config";
import type { ModeParameterTable } from "./config/console-controls.config";
import { createExternalStore } from "./console-store";
import type { ExternalStore } from "./console-store";
import { buildConfirmation, controlsReducer, INITIAL_CONTROLS_STATE } from "./console-controls.reducer";
import type { Adjustment, ControlsAction, ControlsState } from "./console-controls.reducer";
import type {
  ConsoleConfirmation,
  ConsoleLimits,
  ConsoleMode,
  ConsoleParameterChange,
  ConsoleSettings,
  ParameterLimit,
} from "./ventilator-console.entity";

export type PendingControlsStore = ExternalStore<ControlsState> & {
  /** Runs the controls reducer on the current snapshot and publishes the result (returned). */
  dispatch: (action: ControlsAction) => ControlsState
};

export function createPendingControlsStore(initial: ControlsState = INITIAL_CONTROLS_STATE): PendingControlsStore {
  const store = createExternalStore(initial);

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    dispatch(action) {
      const next = controlsReducer(store.getSnapshot(), action);

      store.set(next);

      return next;
    },
  };
}

/** The given store, or one owned by the calling component for its whole life. */
export function usePendingControlsStore(external?: PendingControlsStore): PendingControlsStore {
  const [own] = useState(createPendingControlsStore);

  return external ?? own;
}

export const selectPendingState = (state: ControlsState): ControlsState => state;
export const selectRawPendingMode = (state: ControlsState): string | null => state.pendingMode;

const pendingValueSelectors = new Map<string, (state: ControlsState) => number | undefined>();
const selectedSelectors = new Map<string, (state: ControlsState) => boolean>();

/** Stable selector of one parameter's pending value (`undefined`: not pending). */
export function pendingValueSelector(parameter: string): (state: ControlsState) => number | undefined {
  let selector = pendingValueSelectors.get(parameter);

  if (selector === undefined) {
    selector = (state) => state.pendingValues[parameter];
    pendingValueSelectors.set(parameter, selector);
  }

  return selector;
}

/** Stable selector of whether `parameter` is the selected control. */
export function isSelectedSelector(parameter: string): (state: ControlsState) => boolean {
  let selector = selectedSelectors.get(parameter);

  if (selector === undefined) {
    selector = (state) => state.selected === parameter;
    selectedSelectors.set(parameter, selector);
  }

  return selector;
}

/** The reported base of a parameter (applied, else current); none means it cannot be adjusted (no invented value). */
export function parameterBase(settings: ConsoleSettings, parameter: string): number | undefined {
  return settings.applied[parameter] ?? settings.current[parameter];
}

export type AdjustRequest = {
  parameter: string
  limit: ParameterLimit
  adjustment: Adjustment
  settings: ConsoleSettings
  onProposeChange?: ((change: ConsoleParameterChange) => void) | undefined
};

/** Steps or sets a parameter from its reported base and previews the pending value; false when it has no base. */
export function adjustPending(pending: PendingControlsStore, { parameter, limit, adjustment, settings, onProposeChange }: AdjustRequest): boolean {
  const base = parameterBase(settings, parameter);

  if (base === undefined) {
    return false;
  }

  const action: ControlsAction = adjustment.kind === "steps"
    ? { type: "adjust", parameter, steps: adjustment.steps, base, limit }
    : { type: "setValue", parameter, value: adjustment.value, base, limit };
  const next = pending.dispatch(action);

  onProposeChange?.({ parameter, value: next.pendingValues[parameter] ?? base });

  return true;
}

/** Makes `modeId` pending (or drops the pending mode when it is the applied one) with the parameters that apply to it. */
export function selectPendingMode(
  pending: PendingControlsStore,
  modeId: string,
  mode: ConsoleMode,
  limits: ConsoleLimits,
  applicability: ModeParameterTable | undefined,
): void {
  pending.dispatch({
    type: "selectMode",
    mode: modeId,
    appliedMode: mode.current,
    applicable: getParametersForMode(modeId, limits, applicability),
  });
}

/** The diff CONFIRMAR would emit now (`null`: nothing pending). */
export function pendingConfirmation(pending: PendingControlsStore, settings: ConsoleSettings, mode: ConsoleMode): ConsoleConfirmation | null {
  return buildConfirmation(pending.getSnapshot(), settings.applied, mode.current);
}

/** How many changes a confirmation holds (the mode counts as one). */
export function confirmationCount(confirmation: ConsoleConfirmation | null): number {
  return confirmation === null ? 0 : confirmation.changes.length + (confirmation.mode === null ? 0 : 1);
}

export type PendingLifecycleOptions = {
  hasPending: boolean
  onPendingChange?: ((pending: boolean) => void) | undefined
  pendingResetKey?: string | number | undefined
};

/**
 * Reports only the transitions of `hasPending` (and false once on unmount with pending edits), so a consumer can
 * mirror the pending state without re-render loops; a new `pendingResetKey` drops the edits (the first render only
 * records it). Mount it once per pending store.
 */
export function usePendingLifecycle(pending: PendingControlsStore, { hasPending, onPendingChange, pendingResetKey }: PendingLifecycleOptions): void {
  const onPendingChangeRef = useRef(onPendingChange);
  const reportedPendingRef = useRef(false);
  const resetKeyRef = useRef(pendingResetKey);

  useEffect(() => {
    onPendingChangeRef.current = onPendingChange;
  });

  useEffect(() => {
    if (reportedPendingRef.current !== hasPending) {
      reportedPendingRef.current = hasPending;
      onPendingChangeRef.current?.(hasPending);
    }
  }, [hasPending]);

  useEffect(() => () => {
    if (reportedPendingRef.current) {
      reportedPendingRef.current = false;
      onPendingChangeRef.current?.(false);
    }
  }, []);

  useEffect(() => {
    if (resetKeyRef.current !== pendingResetKey) {
      resetKeyRef.current = pendingResetKey;
      pending.dispatch({ type: "reset" });
    }
  }, [pending, pendingResetKey]);
}
