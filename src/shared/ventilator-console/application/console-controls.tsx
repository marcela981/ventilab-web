/*
* Funcionalidad: ConsoleControls
* Descripción: Mode selector and parameter controls of the generic ventilator console, in the real-device pattern. The modes come from the adapter options; each mode shows only its applicable parameters (console table, filtered by the injected limits). Select a parameter, then adjust it with the +/- buttons, the mouse wheel over the selected value (a zero vertical delta is ignored) or the keyboard (arrows = step, PageUp/PageDown = 10 steps, Home/End = min/max); the value and a mode change stay PENDING (pending token + "Pendiente" text) until CONFIRMAR (or "Aplicar" in the configure variant) emits the diff once through onConfirm; CANCELAR or Escape revert and emit nothing. Pending edits only call the optional onProposeChange. Limits are shown and enforced from the `limits` prop only. A pending value or mode the source has already applied stops being pending, so the tags and the emitted diff always agree. Read-only disables everything and shows the values. v1.2: a parameter without a valid step grid (zero, negative or non-finite step) disables +/-, the wheel and the step keys. v1.3: optional `onPendingChange(pending)` reports when unconfirmed edits appear or go away (also false on unmount with pending edits), so a host such as the case editor can count them as unsaved. Depends on React, MUI icons, the controls reducer, the controls config and the controls styles.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useEffect, useReducer, useRef } from "react";
import type { KeyboardEvent } from "react";
import { cx } from "@shared/lib/class-names";
import { CONSOLE_PARAMETERS, getParametersForMode, MODE_PARAMETERS } from "./config/console-controls.config";
import type { ConsoleParameterDefinition, ModeParameterTable } from "./config/console-controls.config";
import {
  buildConfirmation,
  controlsReducer,
  INITIAL_CONTROLS_STATE,
  keyToAdjustment,
  pendingModeOf,
  hasStepGrid,
  stepDecimals,
} from "./console-controls.reducer";
import type { Adjustment, ControlsAction } from "./console-controls.reducer";
import type {
  ConsoleConfirmation,
  ConsoleLimits,
  ConsoleMode,
  ConsoleParameterChange,
  ConsoleSettings,
  ParameterLimit,
} from "./ventilator-console.entity";
import styles from "../UI/console-controls.module.css";

/** `live`: a running ventilator applies the change. `configure`: the case editor sets initial values; no engine runs. */
export type ConsoleVariant = "live" | "configure";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const CONTROLS_COPY = {
  modes: "Modo ventilatorio",
  parameters: "Parámetros",
  pending: "Pendiente",
  applied: (value: string) => `Actual: ${value}`,
  decrease: (label: string) => `Disminuir ${label}`,
  increase: (label: string) => `Aumentar ${label}`,
  range: (limit: ParameterLimit) => `${limit.min}–${limit.max} ${limit.unit}`.trim(),
  noParameters: "Este modo no tiene parámetros ajustables con los límites recibidos.",
  confirm: { live: "Confirmar", configure: "Aplicar" },
  cancel: "Cancelar",
  pendingCount: (count: number) => (count === 1 ? "1 cambio pendiente" : `${count} cambios pendientes`),
  noPending: "Sin cambios pendientes",
  configureHint: "Configuración del caso: los valores se aplican al guardar, sin un ventilador en marcha.",
  keyboardHint: "Flechas: un paso · RePág/AvPág: 10 pasos · Inicio/Fin: mínimo/máximo · Esc: cancelar",
} as const;

export type ConsoleControlsProps = {
  settings: ConsoleSettings
  mode: ConsoleMode
  limits: ConsoleLimits
  readOnly: boolean
  variant?: ConsoleVariant
  onConfirm: (confirmation: ConsoleConfirmation) => void
  onCancel?: (() => void) | undefined
  onProposeChange?: ((change: ConsoleParameterChange) => void) | undefined
  /** Called when unconfirmed edits appear (true) or go away (false: confirmed, cancelled, applied or unmounted). */
  onPendingChange?: ((pending: boolean) => void) | undefined
  /** Labels per parameter id; defaults to the console definitions. */
  parameters?: Readonly<Record<string, ConsoleParameterDefinition>>
  applicability?: ModeParameterTable
  className?: string
};

function formatValue(value: number, limit: ParameterLimit): string {
  return value.toFixed(stepDecimals(limit.step));
}

type ParameterControlProps = {
  id: string
  definition: ConsoleParameterDefinition
  limit: ParameterLimit
  value: number
  applied: number | undefined
  pending: boolean
  selected: boolean
  disabled: boolean
  onAdjust: (adjustment: Adjustment) => void
  onSelect: () => void
};

function ParameterControl({ id, definition, limit, value, applied, pending, selected, disabled, onAdjust, onSelect }: ParameterControlProps) {
  const valueRef = useRef<HTMLDivElement>(null);
  const formatted = formatValue(value, limit);
  // Without a valid step grid +/-, the wheel and the step keys have nothing to step by.
  const stepping = hasStepGrid(limit.step);

  // React registers wheel listeners as passive, so a native one is needed to keep the page from scrolling.
  useEffect(() => {
    const node = valueRef.current;

    // Only a selected control captures the wheel, so scrolling past an unselected one still scrolls the page.
    if (node === null || disabled || !selected || !stepping) {
      return undefined;
    }

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) {
        return;
      }

      event.preventDefault();
      onAdjust({ kind: "steps", steps: event.deltaY < 0 ? 1 : -1 });
    };
    node.addEventListener("wheel", onWheel, { passive: false });

    return () => node.removeEventListener("wheel", onWheel);
  }, [disabled, selected, stepping, onAdjust]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const adjustment = keyToAdjustment(event.key, limit);

    if (adjustment !== null && !disabled) {
      event.preventDefault();
      onAdjust(adjustment);
    }
  };

  return (
    <li className={cx(styles.parameter)} data-pending={pending} data-selected={selected} data-parameter={id}>
      <div
        ref={valueRef}
        className={cx(styles.value)}
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={definition.description}
        aria-valuenow={value}
        aria-valuemin={limit.min}
        aria-valuemax={limit.max}
        aria-valuetext={`${formatted} ${limit.unit}`.trim()}
        aria-readonly={disabled}
        aria-disabled={disabled}
        onKeyDown={onKeyDown}
        onClick={disabled ? undefined : onSelect}
        onFocus={disabled ? undefined : onSelect}
      >
        <span className={cx(styles.label)}>{definition.label}</span>
        <span className={cx(styles.number)}>{formatted}</span>
        <span className={cx(styles.unit)}>{limit.unit}</span>
      </div>
      <div className={cx(styles.stepper)}>
        <button
          type="button"
          className={cx(styles.step)}
          aria-label={CONTROLS_COPY.decrease(definition.label)}
          disabled={disabled || !stepping || value <= limit.min}
          onClick={() => onAdjust({ kind: "steps", steps: -1 })}
        >
          <RemoveIcon aria-hidden />
        </button>
        <button
          type="button"
          className={cx(styles.step)}
          aria-label={CONTROLS_COPY.increase(definition.label)}
          disabled={disabled || !stepping || value >= limit.max}
          onClick={() => onAdjust({ kind: "steps", steps: 1 })}
        >
          <AddIcon aria-hidden />
        </button>
      </div>
      <p className={cx(styles.meta)}>
        {pending ? <span className={cx(styles.pendingTag)}>{CONTROLS_COPY.pending}</span> : null}
        {pending && applied !== undefined ? <span>{CONTROLS_COPY.applied(formatValue(applied, limit))}</span> : null}
        <span className={cx(styles.range)}>{CONTROLS_COPY.range(limit)}</span>
      </p>
    </li>
  );
}

export function ConsoleControls({
  settings,
  mode,
  limits,
  readOnly,
  variant = "live",
  onConfirm,
  onCancel,
  onProposeChange,
  onPendingChange,
  parameters = CONSOLE_PARAMETERS,
  applicability = MODE_PARAMETERS,
  className,
}: ConsoleControlsProps) {
  const [state, dispatch] = useReducer(controlsReducer, INITIAL_CONTROLS_STATE);
  const pendingMode = pendingModeOf(state, mode.current);
  const effectiveMode = pendingMode ?? mode.current;
  const visible = getParametersForMode(effectiveMode, limits, applicability);
  const confirmation = buildConfirmation(state, settings.applied, mode.current);
  const pendingCount = confirmation === null ? 0 : confirmation.changes.length + (confirmation.mode === null ? 0 : 1);
  const hasPending = pendingCount > 0;
  const onPendingChangeRef = useRef(onPendingChange);
  const reportedPendingRef = useRef(false);

  useEffect(() => {
    onPendingChangeRef.current = onPendingChange;
  });

  // Report only transitions, so a consumer can mirror the pending state without re-render loops.
  useEffect(() => {
    if (reportedPendingRef.current !== hasPending) {
      reportedPendingRef.current = hasPending;
      onPendingChangeRef.current?.(hasPending);
    }
  }, [hasPending]);

  // Unmounting drops the pending edits: tell the consumer once.
  useEffect(() => () => {
    if (reportedPendingRef.current) {
      reportedPendingRef.current = false;
      onPendingChangeRef.current?.(false);
    }
  }, []);

  const baseOf = (parameter: string, limit: ParameterLimit): number =>
    settings.applied[parameter] ?? settings.current[parameter] ?? limit.min;

  const run = (action: ControlsAction) => {
    if (readOnly) {
      return;
    }

    const next = controlsReducer(state, action);
    dispatch(action);

    if ((action.type === "adjust" || action.type === "setValue") && onProposeChange) {
      onProposeChange({ parameter: action.parameter, value: next.pendingValues[action.parameter] ?? action.base });
    }
  };

  const adjust = (parameter: string, limit: ParameterLimit, adjustment: Adjustment) => {
    const base = baseOf(parameter, limit);
    run(
      adjustment.kind === "steps"
        ? { type: "adjust", parameter, steps: adjustment.steps, base, limit }
        : { type: "setValue", parameter, value: adjustment.value, base, limit },
    );
  };

  const confirm = () => {
    if (readOnly || confirmation === null) {
      return;
    }

    onConfirm(confirmation);
    dispatch({ type: "reset" });
  };

  const cancel = () => {
    if (readOnly || confirmation === null) {
      return;
    }

    dispatch({ type: "reset" });
    onCancel?.();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && confirmation !== null) {
      event.preventDefault();
      cancel();
    }
  };

  // Escape bubbling from any control of the group cancels the pending change.
  return (
    <div className={cx(styles.controls, className)} data-variant={variant} data-readonly={readOnly} onKeyDown={onKeyDown}>
      <div className={cx(styles.modes)} role="group" aria-label={CONTROLS_COPY.modes}>
        {mode.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={cx(styles.mode)}
            aria-pressed={effectiveMode === option.id}
            data-pending={pendingMode === option.id}
            disabled={readOnly}
            onClick={() =>
              run({
                type: "selectMode",
                mode: option.id,
                appliedMode: mode.current,
                applicable: getParametersForMode(option.id, limits, applicability),
              })
            }
          >
            {option.label}
            {pendingMode === option.id ? <span className={cx(styles.pendingTag)}>{CONTROLS_COPY.pending}</span> : null}
          </button>
        ))}
      </div>
      {variant === "configure" ? <p className={cx(styles.hint)}>{CONTROLS_COPY.configureHint}</p> : null}
      <section aria-label={CONTROLS_COPY.parameters}>
        {visible.length === 0 ? (
          <p className={cx(styles.hint)}>{CONTROLS_COPY.noParameters}</p>
        ) : (
          <ul className={cx(styles.parameters)}>
            {visible.map((parameter) => {
              const limit = limits[parameter];

              if (limit === undefined) {
                return null;
              }

              const base = baseOf(parameter, limit);
              const pendingValue = state.pendingValues[parameter];
              // A value the source already applied is not pending, so the tag and the confirmation diff agree.
              const pending = pendingValue !== undefined && pendingValue !== settings.applied[parameter];

              return (
                <ParameterControl
                  key={parameter}
                  id={parameter}
                  definition={parameters[parameter] ?? { label: parameter, description: parameter }}
                  limit={limit}
                  value={pendingValue ?? base}
                  applied={settings.applied[parameter]}
                  pending={pending}
                  selected={state.selected === parameter}
                  disabled={readOnly}
                  onAdjust={(adjustment) => adjust(parameter, limit, adjustment)}
                  onSelect={() => dispatch({ type: "select", parameter })}
                />
              );
            })}
          </ul>
        )}
      </section>
      {readOnly ? null : <p className={cx(styles.hint)}>{CONTROLS_COPY.keyboardHint}</p>}
      <div className={cx(styles.confirmBar)}>
        <p className={cx(styles.status)} role="status">
          {pendingCount > 0 ? CONTROLS_COPY.pendingCount(pendingCount) : CONTROLS_COPY.noPending}
        </p>
        <button type="button" className={cx(styles.action, styles.primary)} disabled={readOnly || confirmation === null} onClick={confirm}>
          {CONTROLS_COPY.confirm[variant]}
        </button>
        <button type="button" className={cx(styles.action)} disabled={readOnly || confirmation === null} onClick={cancel}>
          {CONTROLS_COPY.cancel}
        </button>
      </div>
    </div>
  );
}
