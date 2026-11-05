/*
* Funcionalidad: July confirm actions and keyboard
* Descripción: "Confirmar / Cancelar" of the July layout in the position of July's "Enviar / Detener" (D18), the pending counter and the read-only reason, over the per-console pending store. Confirmar emits the diff once through `adapter.onConfirm` (digital) or, with `confirmSummary` (Real, D19), first opens a summary of every change ("Vt 450 → 500 mL · FR 14 → 16 · Modo VCV → PCV") whose "Enviar al ventilador" (initial focus, so Enter sends) emits it; Escape or "Volver" closes the summary and keeps the edits. Cancelar drops the edits (never stops nor disconnects a device). Both are disabled without pending edits or when read-only; Confirmar also while a confirmed change is being sent or awaited. Also the console keyboard handler: inside an element marked `data-console-control`, Escape cancels the pending edits and Enter on a value control (spinbutton or slider, never a button nor the assist field) confirms in digital and opens the summary in Real; the pending lifecycle (onPendingChange transitions, pendingResetKey) runs here, once per console. v0.1 (Bloque 5, C2): first version. v0.2 (Ajustes A, A1): the July default is now the automatic application (`applyMode="auto"`, DISENO_AJUSTES_A §3.1): `applyPendingNow` emits the diff like Confirmar but keeps the selected control, `handleJulyAutoKeyDown` makes Enter apply now what is still debouncing (and `adapter.onApplyNow` for a source that debounces on its own side) and Escape drop it (and `adapter.onCancel`), and `JulyAutoApplyState` keeps only the read-only reason and the pending lifecycle (no Confirmar, Cancelar nor counter). The confirm actions stay for `applyMode="confirm"`. Depends on React, MUI icons, the design-system ConfirmDialog, the console stores, the auto apply scheduler type, the controls config and the July styles.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import SendIcon from "@mui/icons-material/Send";
import UndoIcon from "@mui/icons-material/Undo";
import { memo, useEffect, useMemo } from "react";
import type { KeyboardEvent } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { cx } from "@shared/lib/class-names";
import { CONSOLE_PARAMETERS } from "./config/console-controls.config";
import type { ConsoleParameterDefinition } from "./config/console-controls.config";
import { buildConfirmation } from "./console-controls.reducer";
import { confirmationCount, pendingConfirmation, selectPendingState, usePendingLifecycle } from "./console-pending-store";
import type { PendingControlsStore } from "./console-pending-store";
import { useStoreSelector } from "./console-store";
import type { ConsoleAdapterStore, WritableStore } from "./console-store";
import type { AutoApplyScheduler } from "./july-auto-apply";
import { formatParameterValue } from "./parameter-control";
import type { ConsoleConfirmation, ConsoleLimits, ConsoleMode, ConsoleSettings, ConsoleSettingValues, VentilatorConsoleAdapter } from "./ventilator-console.entity";
import styles from "../UI/july-controls.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const JULY_CONFIRM_COPY = {
  confirm: "Confirmar",
  confirmHint: "Enviar los cambios pendientes al ventilador",
  cancel: "Cancelar",
  cancelHint: "Descartar los cambios pendientes",
  pendingCount: (count: number) => (count === 1 ? "1 cambio pendiente" : `${count} cambios pendientes`),
  noPending: "Sin cambios pendientes",
  summaryTitle: "Revisar los cambios antes de enviarlos",
  summarySend: "Enviar al ventilador",
  summaryBack: "Volver",
  modeChange: (from: string, to: string) => `Modo ${from} → ${to}`,
  valueChange: (label: string, from: string, to: string, unit: string) => `${label} ${from} → ${to} ${unit}`.trim(),
} as const;

/** A confirmed change is on its way or awaited: Confirmar waits for it. */
export function hasBlockingInFlight(settings: ConsoleSettings): boolean {
  return Object.values(settings.inFlight ?? {}).some((flight) => flight !== undefined && flight.status !== "rejected");
}

/** One line per change of the confirmation, mode first ("Modo VCV → PCV", "Vt 450 → 500 mL"). */
export function summarizeConfirmation(
  confirmation: ConsoleConfirmation,
  context: { applied: ConsoleSettingValues, mode: ConsoleMode, limits: ConsoleLimits, definitions?: Readonly<Partial<Record<string, ConsoleParameterDefinition>>> },
): string[] {
  const { applied, mode, limits } = context;
  const definitions: Readonly<Partial<Record<string, ConsoleParameterDefinition>>> = context.definitions ?? CONSOLE_PARAMETERS;
  const labelOf = (id: string) => mode.options.find((option) => option.id === id)?.label ?? id;
  const lines = confirmation.mode === null ? [] : [JULY_CONFIRM_COPY.modeChange(labelOf(mode.current), labelOf(confirmation.mode))];

  confirmation.changes.forEach(({ parameter, value }) => {
    const limit = limits[parameter];
    const label = definitions[parameter]?.label ?? parameter;
    const before = applied[parameter];
    const format = (number: number) => (limit ? formatParameterValue(number, limit) : String(number));

    lines.push(JULY_CONFIRM_COPY.valueChange(label, before === undefined ? "—" : format(before), format(value), limit?.unit ?? ""));
  });

  return lines;
}

/** Emits the pending diff once and clears it; false when nothing is pending. */
export function confirmPendingNow(store: ConsoleAdapterStore, pending: PendingControlsStore): boolean {
  const adapter = store.getSnapshot();
  const confirmation = pendingConfirmation(pending, adapter.settings, adapter.mode);

  if (confirmation === null) {
    return false;
  }

  adapter.onConfirm(confirmation);
  pending.dispatch({ type: "reset" });

  return true;
}

/**
 * Auto apply: emits the pending diff once like Confirmar but keeps the selected control (the wheel keeps working on it
 * and the focus ring stays); false when nothing is pending.
 */
export function applyPendingNow(store: ConsoleAdapterStore, pending: PendingControlsStore): boolean {
  const { selected } = pending.getSnapshot();
  const applied = confirmPendingNow(store, pending);

  if (applied && selected !== null) {
    pending.dispatch({ type: "select", parameter: selected });
  }

  return applied;
}

/** Drops the pending edits (emits nothing but `onCancel`); false when nothing is pending. */
export function cancelPendingNow(store: ConsoleAdapterStore, pending: PendingControlsStore): boolean {
  const adapter = store.getSnapshot();

  if (pendingConfirmation(pending, adapter.settings, adapter.mode) === null) {
    return false;
  }

  pending.dispatch({ type: "reset" });
  adapter.onCancel?.();

  return true;
}

export type JulyConfirmOptions = {
  store: ConsoleAdapterStore
  pending: PendingControlsStore
  readOnly: boolean
  /** Real: Confirmar opens the summary instead of emitting at once (D19). */
  confirmSummary: boolean
  /** Open state of the summary, owned by the console. */
  summary: WritableStore<boolean>
};

/** Confirmar: at once in digital, through the summary in Real; nothing when read-only, empty or waiting for the source. */
export function requestConfirm({ store, pending, readOnly, confirmSummary, summary }: JulyConfirmOptions): boolean {
  const adapter = store.getSnapshot();

  if (readOnly || hasBlockingInFlight(adapter.settings) || pendingConfirmation(pending, adapter.settings, adapter.mode) === null) {
    return false;
  }

  if (confirmSummary) {
    summary.set(true);

    return true;
  }

  return confirmPendingNow(store, pending);
}

function isValueControl(element: HTMLElement): boolean {
  return element.getAttribute("role") === "spinbutton" || (element instanceof HTMLInputElement && element.type === "range");
}

/**
 * Console keydown: only inside `[data-console-control]` (never a drawer, the assist field or a portal). Escape cancels
 * the pending edits; Enter on a value control confirms (or opens the Real summary). Buttons keep their native Enter.
 */
export function handleJulyKeyDown(event: KeyboardEvent<HTMLElement>, options: JulyConfirmOptions): void {
  const target = event.target as HTMLElement;

  if (typeof target.closest !== "function" || target.closest("[data-console-control]") === null || options.readOnly) {
    return;
  }

  if (event.key === "Escape") {
    if (cancelPendingNow(options.store, options.pending)) {
      event.preventDefault();
    }

    return;
  }

  if (event.key === "Enter" && isValueControl(target) && requestConfirm(options)) {
    event.preventDefault();
  }
}

export type JulyAutoKeyOptions = {
  store: ConsoleAdapterStore
  pending: PendingControlsStore
  readOnly: boolean
  scheduler: AutoApplyScheduler
};

/**
 * Console keydown in auto mode (A-4), with the same filter as the confirm mode: Enter on a value control applies now
 * what is still debouncing and asks the source to send what it debounces on its own side (`onApplyNow`); Escape drops
 * what is still debouncing (and asks the source to drop its own wait through `onCancel`). Nothing else to cancel.
 */
export function handleJulyAutoKeyDown(event: KeyboardEvent<HTMLElement>, { store, pending, readOnly, scheduler }: JulyAutoKeyOptions): void {
  const target = event.target as HTMLElement;

  if (typeof target.closest !== "function" || target.closest("[data-console-control]") === null || readOnly) {
    return;
  }

  const { onCancel, onApplyNow } = store.getSnapshot();

  if (event.key === "Escape") {
    scheduler.cancel();

    // cancelPendingNow already calls onCancel when it dropped something.
    if (cancelPendingNow(store, pending)) {
      event.preventDefault();
    } else if (onCancel) {
      onCancel();
      event.preventDefault();
    }

    return;
  }

  if (event.key === "Enter" && isValueControl(target)) {
    const flushed = scheduler.flush();

    onApplyNow?.();

    if (flushed || onApplyNow) {
      event.preventDefault();
    }
  }
}

const selectSettings = (adapter: VentilatorConsoleAdapter) => adapter.settings;
const selectMode = (adapter: VentilatorConsoleAdapter) => adapter.mode;
const selectLimits = (adapter: VentilatorConsoleAdapter) => adapter.limits;
const selectOnPendingChange = (adapter: VentilatorConsoleAdapter) => adapter.onPendingChange;
const selectPendingResetKey = (adapter: VentilatorConsoleAdapter) => adapter.permissions.pendingResetKey;
const selectSummaryOpen = (open: boolean) => open;

type JulyConfirmActionsProps = JulyConfirmOptions & {
  readOnlyReason: string | undefined
  /** Id given to the read-only reason (the other July controls reference it). */
  reasonId: string
};

type JulyAutoApplyStateProps = {
  store: ConsoleAdapterStore
  pending: PendingControlsStore
  readOnly: boolean
  readOnlyReason: string | undefined
  /** Id given to the read-only reason (the other July controls reference it). */
  reasonId: string
};

/**
 * Auto mode: no buttons nor counter, only the read-only reason the controls reference, and the pending lifecycle
 * (onPendingChange while something is debouncing, pendingResetKey), once per console.
 */
export const JulyAutoApplyState = memo(function JulyAutoApplyState({ store, pending, readOnly, readOnlyReason, reasonId }: JulyAutoApplyStateProps) {
  const settings = useStoreSelector(store, selectSettings);
  const appliedMode = useStoreSelector(store, selectMode).current;
  const onPendingChange = useStoreSelector(store, selectOnPendingChange);
  const pendingResetKey = useStoreSelector(store, selectPendingResetKey);
  const state = useStoreSelector(pending, selectPendingState);
  const hasPending = useMemo(() => buildConfirmation(state, settings.applied, appliedMode) !== null, [state, settings.applied, appliedMode]);

  usePendingLifecycle(pending, { hasPending, onPendingChange, pendingResetKey });

  return readOnly && readOnlyReason ? <p id={reasonId} className={cx(styles.reason)}>{readOnlyReason}</p> : null;
});

/** Confirmar / Cancelar, the pending counter, the read-only reason and the Real summary. */
export const JulyConfirmActions = memo(function JulyConfirmActions(props: JulyConfirmActionsProps) {
  const { store, pending, readOnly, readOnlyReason, reasonId, summary } = props;
  const settings = useStoreSelector(store, selectSettings);
  const mode = useStoreSelector(store, selectMode);
  const limits = useStoreSelector(store, selectLimits);
  const onPendingChange = useStoreSelector(store, selectOnPendingChange);
  const pendingResetKey = useStoreSelector(store, selectPendingResetKey);
  const state = useStoreSelector(pending, selectPendingState);
  const summaryOpen = useStoreSelector(summary, selectSummaryOpen);
  const appliedMode = mode.current;
  const confirmation = useMemo(() => buildConfirmation(state, settings.applied, appliedMode), [state, settings.applied, appliedMode]);
  const count = confirmationCount(confirmation);
  const describedBy = readOnly && readOnlyReason ? reasonId : undefined;
  const waiting = hasBlockingInFlight(settings);
  const lines = summaryOpen && confirmation !== null ? summarizeConfirmation(confirmation, { applied: settings.applied, mode, limits }) : [];

  usePendingLifecycle(pending, { hasPending: count > 0, onPendingChange, pendingResetKey });

  // The edits went away while the summary was open (applied by the source, reset): close it for good.
  useEffect(() => {
    if (summaryOpen && confirmation === null) {
      summary.set(false);
    }
  }, [summary, summaryOpen, confirmation]);

  const closeSummary = () => summary.set(false);

  return (
    <div className={cx(styles.confirm)}>
      <div className={cx(styles.actions)}>
        <button
          type="button"
          className={cx(styles.action, styles.primary)}
          title={JULY_CONFIRM_COPY.confirmHint}
          aria-describedby={describedBy}
          data-console-control=""
          disabled={readOnly || confirmation === null || waiting}
          onClick={() => requestConfirm(props)}
        >
          <SendIcon fontSize="small" aria-hidden />
          {JULY_CONFIRM_COPY.confirm}
        </button>
        <button
          type="button"
          className={cx(styles.action)}
          title={JULY_CONFIRM_COPY.cancelHint}
          aria-describedby={describedBy}
          data-console-control=""
          disabled={readOnly || confirmation === null}
          onClick={() => {
            if (!readOnly) {
              cancelPendingNow(store, pending);
            }
          }}
        >
          <UndoIcon fontSize="small" aria-hidden />
          {JULY_CONFIRM_COPY.cancel}
        </button>
      </div>
      <p className={cx(styles.pendingCount)} role="status" data-pending={count > 0}>
        {count > 0 ? JULY_CONFIRM_COPY.pendingCount(count) : JULY_CONFIRM_COPY.noPending}
      </p>
      {describedBy ? <p id={reasonId} className={cx(styles.reason)}>{readOnlyReason}</p> : null}
      <ConfirmDialog
        open={summaryOpen && confirmation !== null}
        title={JULY_CONFIRM_COPY.summaryTitle}
        description={lines.join(" · ")}
        confirmLabel={JULY_CONFIRM_COPY.summarySend}
        cancelLabel={JULY_CONFIRM_COPY.summaryBack}
        autoFocusConfirm
        onConfirm={() => {
          closeSummary();
          confirmPendingNow(store, pending);
        }}
        onCancel={closeSummary}
      />
    </div>
  );
});
