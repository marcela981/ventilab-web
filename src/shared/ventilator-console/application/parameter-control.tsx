/*
* Funcionalidad: Console parameter control
* Descripción: One adjustable ventilator parameter of the console: a spinbutton with the value and unit, the +/- stepper, the wheel over the selected value (native non-passive listener, a zero vertical delta is ignored) and the keyboard (arrows = step, PageUp/PageDown = 10 steps, Home/End = min/max), the "Pendiente" and in-flight tags, the applied value while pending and the limit range. A parameter without a reported value shows "—" and cannot be adjusted; without a valid step grid +/-, the wheel and the step keys are disabled; a change being sent or awaiting the source blocks re-editing. Emits adjustments only (the owner decides what they do). v1.0 (Bloque 5, C2): extracted unchanged from ConsoleControls so the July layout reuses it; optional `element` (`li` in the classic list, `div` elsewhere), `layout="july"` (compact field styles), a visible `label` override (the accessible name stays the definition description) and `children` after the range (e.g. the computed Te). Every interactive element carries `data-console-control`, which the July console keyboard handler filters on. Depends on React, MUI icons, the controls reducer helpers and the controls styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import type { ConsoleParameterDefinition } from "./config/console-controls.config";
import { hasStepGrid, keyToAdjustment, stepDecimals } from "./console-controls.reducer";
import type { Adjustment } from "./console-controls.reducer";
import type { ConsoleInFlight, ParameterLimit } from "./ventilator-console.entity";
import styles from "../UI/console-controls.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const PARAMETER_CONTROL_COPY = {
  pending: "Pendiente",
  applied: (value: string) => `Actual: ${value}`,
  decrease: (label: string) => `Disminuir ${label}`,
  increase: (label: string) => `Aumentar ${label}`,
  range: (limit: ParameterLimit) => `${limit.min}–${limit.max} ${limit.unit}`.trim(),
  unknownValue: "—",
  unknownValueText: "Sin valor informado",
  inFlight: {
    sending: "Enviando",
    awaiting: "Esperando confirmación del equipo",
    rejected: "Rechazado",
  },
} as const;

/** Tag text of a change in flight, with the source reason when there is one. */
export function inFlightText(flight: ConsoleInFlight): string {
  const label = PARAMETER_CONTROL_COPY.inFlight[flight.status];

  return flight.message ? `${label}: ${flight.message}` : label;
}

export function formatParameterValue(value: number, limit: ParameterLimit): string {
  return value.toFixed(stepDecimals(limit.step));
}

/** A change being sent or awaiting the source cannot be edited again until it resolves. */
export function blocksEditing(flight: ConsoleInFlight | undefined): boolean {
  return flight !== undefined && flight.status !== "rejected";
}

export type ParameterControlProps = {
  id: string
  definition: ConsoleParameterDefinition
  limit: ParameterLimit
  /** `null`: the source reports no value and nothing is pending. */
  value: number | null
  applied: number | undefined
  pending: boolean
  inFlight: ConsoleInFlight | undefined
  selected: boolean
  disabled: boolean
  describedBy: string | undefined
  onAdjust: (adjustment: Adjustment) => void
  onSelect: () => void
  /** Root element: `li` inside the classic parameter list (default), `div` anywhere else. */
  element?: "li" | "div"
  /** `july`: the compact field of the July layout. */
  layout?: "classic" | "july"
  /** Visible label; the accessible name is always the definition description. */
  label?: string | undefined
  children?: ReactNode
};

export function ParameterControl({
  id,
  definition,
  limit,
  value: shown,
  applied,
  pending,
  inFlight,
  selected,
  disabled: readOnly,
  describedBy,
  onAdjust,
  onSelect,
  element: Root = "li",
  layout = "classic",
  label = definition.label,
  children,
}: ParameterControlProps) {
  const valueRef = useRef<HTMLDivElement>(null);
  const disabled = readOnly || blocksEditing(inFlight);
  const known = shown !== null;
  const value = shown ?? limit.min;
  const formatted = known ? formatParameterValue(value, limit) : PARAMETER_CONTROL_COPY.unknownValue;
  // Without a valid step grid +/-, the wheel and the step keys have nothing to step by. Without a reported value
  // there is no base either: stepping from the limit minimum would propose a value the source never reported.
  const stepping = known && hasStepGrid(limit.step);

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
    const adjustment = known ? keyToAdjustment(event.key, limit) : null;

    if (adjustment !== null && !disabled) {
      event.preventDefault();
      onAdjust(adjustment);
    }
  };

  return (
    <Root
      className={cx(styles.parameter)}
      data-pending={pending}
      data-selected={selected}
      data-parameter={id}
      data-in-flight={inFlight?.status}
      data-layout={layout}
    >
      <div
        ref={valueRef}
        className={cx(styles.value)}
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={definition.description}
        aria-valuenow={known ? value : undefined}
        aria-valuemin={limit.min}
        aria-valuemax={limit.max}
        aria-valuetext={known ? `${formatted} ${limit.unit}`.trim() : PARAMETER_CONTROL_COPY.unknownValueText}
        aria-readonly={disabled}
        aria-disabled={disabled}
        aria-describedby={describedBy}
        data-console-control=""
        onKeyDown={onKeyDown}
        onClick={disabled ? undefined : onSelect}
        onFocus={disabled ? undefined : onSelect}
      >
        <span className={cx(styles.label)}>{label}</span>
        <span className={cx(styles.number)}>{formatted}</span>
        <span className={cx(styles.unit)}>{limit.unit}</span>
      </div>
      <div className={cx(styles.stepper)}>
        <button
          type="button"
          className={cx(styles.step)}
          aria-label={PARAMETER_CONTROL_COPY.decrease(definition.label)}
          aria-describedby={describedBy}
          data-console-control=""
          disabled={disabled || !stepping || value <= limit.min}
          onClick={() => onAdjust({ kind: "steps", steps: -1 })}
        >
          <RemoveIcon aria-hidden />
        </button>
        <button
          type="button"
          className={cx(styles.step)}
          aria-label={PARAMETER_CONTROL_COPY.increase(definition.label)}
          aria-describedby={describedBy}
          data-console-control=""
          disabled={disabled || !stepping || value >= limit.max}
          onClick={() => onAdjust({ kind: "steps", steps: 1 })}
        >
          <AddIcon aria-hidden />
        </button>
      </div>
      <p className={cx(styles.meta)}>
        {pending ? <span className={cx(styles.pendingTag)}>{PARAMETER_CONTROL_COPY.pending}</span> : null}
        {inFlight ? (
          <span className={cx(styles.inFlightTag)} data-status={inFlight.status}>{inFlightText(inFlight)}</span>
        ) : null}
        {pending && applied !== undefined ? <span>{PARAMETER_CONTROL_COPY.applied(formatParameterValue(applied, limit))}</span> : null}
        <span className={cx(styles.range)}>{PARAMETER_CONTROL_COPY.range(limit)}</span>
        {children}
      </p>
    </Root>
  );
}
