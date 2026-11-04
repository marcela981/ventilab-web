/*
* Funcionalidad: ConsoleControls
* Descripción: Mode selector and parameter controls of the generic ventilator console, in the real-device pattern. The modes come from the adapter options; each mode shows only its applicable parameters (console table, filtered by the injected limits). Select a parameter, then adjust it with the +/- buttons, the mouse wheel over the selected value (a zero vertical delta is ignored) or the keyboard (arrows = step, PageUp/PageDown = 10 steps, Home/End = min/max); the value and a mode change stay PENDING (pending token + "Pendiente" text) until CONFIRMAR (or "Aplicar" in the configure variant) emits the diff once through onConfirm; CANCELAR or Escape revert and emit nothing. Pending edits only call the optional onProposeChange. Limits are shown and enforced from the `limits` prop only. A pending value or mode the source has already applied stops being pending, so the tags and the emitted diff always agree. Read-only disables everything and shows the values. v1.2: a parameter without a valid step grid (zero, negative or non-finite step) disables +/-, the wheel and the step keys. v1.3: optional `onPendingChange(pending)` reports when unconfirmed edits appear or go away (also false on unmount with pending edits), so a host such as the case editor can count them as unsaved. v1.4 (generic, optional): `settings.inFlight` tags a parameter whose confirmed change the source has not applied yet ("Enviando", "Esperando confirmación del equipo", "Rechazado") while the control keeps showing the applied value, and blocks re-editing it while sending/awaiting; a parameter the source does not report shows "—" (no invented value); v1.5: such a parameter cannot be adjusted at all (+/-, wheel and every key disabled) until the source reports it, so CONFIRMAR never sends a value derived from the limit minimum; `readOnlyReason` is shown under the controls and describes every disabled control (aria-describedby). Depends on React, MUI icons, the controls reducer, the controls config and the controls styles. v1.6 (generic, optional): `pendingResetKey` — when it changes the unconfirmed edits are dropped without emitting anything. v1.7 (Bloque 5, C1): the edits live in a per-console pending store (console-pending-store.ts, same reducer) instead of a local useReducer; an optional `pendingStore` shares it with other zones of the console, otherwise the component owns one. Behaviour unchanged. v1.8 (Bloque 5, C2): the parameter control moved to parameter-control.tsx (unchanged; inFlightText is re-exported from there).
* Versión: 1.8
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useId } from "react";
import type { KeyboardEvent } from "react";
import { cx } from "@shared/lib/class-names";
import { CONSOLE_PARAMETERS, getParametersForMode, MODE_PARAMETERS } from "./config/console-controls.config";
import type { ConsoleParameterDefinition, ModeParameterTable } from "./config/console-controls.config";
import { buildConfirmation, pendingModeOf } from "./console-controls.reducer";
import type { Adjustment } from "./console-controls.reducer";
import {
  adjustPending,
  confirmationCount,
  selectPendingMode,
  selectPendingState,
  usePendingControlsStore,
  usePendingLifecycle,
} from "./console-pending-store";
import type { PendingControlsStore } from "./console-pending-store";
import { useStoreSelector } from "./console-store";
import { ParameterControl } from "./parameter-control";
import type {
  ConsoleConfirmation,
  ConsoleLimits,
  ConsoleMode,
  ConsoleParameterChange,
  ConsoleSettings,
  ParameterLimit,
} from "./ventilator-console.entity";
import styles from "../UI/console-controls.module.css";

export { inFlightText } from "./parameter-control";

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
  unknownValue: "—",
  unknownValueText: "Sin valor informado",
  inFlight: {
    sending: "Enviando",
    awaiting: "Esperando confirmación del equipo",
    rejected: "Rechazado",
  },
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
  /** Why the controls are read-only; shown and referenced by every disabled control. */
  readOnlyReason?: string | undefined
  /** v1.6: a change of this value drops the unconfirmed edits (nothing is emitted); omitted, edits are kept. */
  pendingResetKey?: string | number | undefined
  /** Labels per parameter id; defaults to the console definitions. */
  parameters?: Readonly<Record<string, ConsoleParameterDefinition>>
  applicability?: ModeParameterTable
  /** v1.7: the per-console pending store shared with other zones; omitted, the component owns one. */
  pendingStore?: PendingControlsStore | undefined
  className?: string
};

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
  readOnlyReason,
  pendingResetKey,
  parameters = CONSOLE_PARAMETERS,
  applicability = MODE_PARAMETERS,
  pendingStore,
  className,
}: ConsoleControlsProps) {
  const pendingControls = usePendingControlsStore(pendingStore);
  const state = useStoreSelector(pendingControls, selectPendingState);
  const pendingMode = pendingModeOf(state, mode.current);
  const effectiveMode = pendingMode ?? mode.current;
  const visible = getParametersForMode(effectiveMode, limits, applicability);
  const confirmation = buildConfirmation(state, settings.applied, mode.current);
  const pendingCount = confirmationCount(confirmation);
  const reasonId = useId();
  const describedBy = readOnly && readOnlyReason ? reasonId : undefined;

  // Pending transitions (also false on unmount) and the v1.6 reset key.
  usePendingLifecycle(pendingControls, { hasPending: pendingCount > 0, onPendingChange, pendingResetKey });

  // No reported value means no base: such a parameter cannot be adjusted (no invented starting value).
  const adjust = (parameter: string, limit: ParameterLimit, adjustment: Adjustment) => {
    if (!readOnly) {
      adjustPending(pendingControls, { parameter, limit, adjustment, settings, onProposeChange });
    }
  };

  const confirm = () => {
    if (readOnly || confirmation === null) {
      return;
    }

    onConfirm(confirmation);
    pendingControls.dispatch({ type: "reset" });
  };

  const cancel = () => {
    if (readOnly || confirmation === null) {
      return;
    }

    pendingControls.dispatch({ type: "reset" });
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
            aria-describedby={describedBy}
            onClick={() => {
              if (!readOnly) {
                selectPendingMode(pendingControls, option.id, mode, limits, applicability);
              }
            }}
          >
            {option.label}
            {pendingMode === option.id ? <span className={cx(styles.pendingTag)}>{CONTROLS_COPY.pending}</span> : null}
          </button>
        ))}
      </div>
      {describedBy ? <p id={describedBy} className={cx(styles.hint)}>{readOnlyReason}</p> : null}
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

              const reported = settings.applied[parameter] ?? settings.current[parameter];
              const pendingValue = state.pendingValues[parameter];
              // A value the source already applied is not pending, so the tag and the confirmation diff agree.
              const pending = pendingValue !== undefined && pendingValue !== settings.applied[parameter];

              return (
                <ParameterControl
                  key={parameter}
                  id={parameter}
                  definition={parameters[parameter] ?? { label: parameter, description: parameter }}
                  limit={limit}
                  value={pendingValue ?? reported ?? null}
                  applied={settings.applied[parameter]}
                  pending={pending}
                  inFlight={settings.inFlight?.[parameter]}
                  selected={state.selected === parameter}
                  disabled={readOnly}
                  describedBy={describedBy}
                  onAdjust={(adjustment) => adjust(parameter, limit, adjustment)}
                  onSelect={() => pendingControls.dispatch({ type: "select", parameter })}
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
        <button
          type="button"
          className={cx(styles.action, styles.primary)}
          disabled={readOnly || confirmation === null}
          aria-describedby={describedBy}
          onClick={confirm}
        >
          {CONTROLS_COPY.confirm[variant]}
        </button>
        <button
          type="button"
          className={cx(styles.action)}
          disabled={readOnly || confirmation === null}
          aria-describedby={describedBy}
          onClick={cancel}
        >
          {CONTROLS_COPY.cancel}
        </button>
      </div>
    </div>
  );
}
