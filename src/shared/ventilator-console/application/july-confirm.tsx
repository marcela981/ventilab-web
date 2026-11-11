/*
* Funcionalidad: July confirm actions and keyboard
* Descripción: "Enviar / Detener" of the July layout (FLUJOS_JULIO a.4 left column: [Enviar][Detener], then [Ajustar][Restablecer tarjetas] and the cards), "Deshacer último cambio" right under them, the pending counter and the read-only reason, over the per-console pending store. Enviar emits the diff once through `adapter.onConfirm` (the source applies the full setting set: the sim engine in Digital, one command in Real) or, with `confirmSummary`, first opens a summary of every change ("Vt 450 → 500 mL · FR 14 → 16 · Modo VCV → PCV") whose "Enviar al ventilador" (initial focus, so Enter sends) emits it; Escape or "Volver" closes the summary and keeps the edits. Enviar is disabled without pending edits, when read-only or while a confirmed change is being sent or awaited. Detener is rendered in its July place but only works with the console `onStop` (none yet: disabled, "Disponible próximamente"). "Deshacer último cambio" emits, through the same `adapter.onConfirm`, the values (and mode) the source applied before the last change sent from this console; undoing again re-applies that change. Also the console keyboard handler: inside an element marked `data-console-control`, Escape drops the pending edits and Enter on a value control (spinbutton or slider, never a button nor the assist field) sends (or opens the summary); the pending lifecycle (onPendingChange transitions, pendingResetKey) runs here, once per console. v0.1 (Bloque 5, C2): first version. v0.2 (Ajustes A, A1): automatic application (`applyMode="auto"`). v0.3 (2026-11-10, reverts A-1 to A-4): the automatic application is gone (applyPendingNow, handleJulyAutoKeyDown and JulyAutoApplyState removed): every edit waits for Enviar in Digital and Real alike; the buttons follow July ("Enviar", "Detener"; the old "Cancelar" button is gone, Escape still drops the edits) and the console-level "Deshacer último cambio" (`undoLastNow`, `inverseConfirmation`) replaces the Real-only undo. Depends on React, MUI icons, the design-system ConfirmDialog, the console stores, the controls config and the July styles. v0.4 (2026-11-10): while the console is editable and nothing is pending, the adapter `proposal` (the real ventilator's initial configuration, read at effect time so a source that just stopped proposing is never re-seeded) is pre-filled as the pending edits; with `confirmSummary` the summary then lists every proposed value. v0.5 (2026-11-11, review R1): M1 the undo never restores an applied mode that is not a mode option (unknown, "—", e.g. after the first real send), so Undo stays disabled when nothing valid is left; M5 the unavailable Detener explains itself with the MUI Tooltip (@mui/material/Tooltip) on a focusable wrapper (`.stopUnavailable`) and `aria-describedby` (the button stays disabled in its July place). v0.6 (2026-11-11, review R1 round 2): the Detener wrapper uses `.stopUnavailable` (no collision with the expiratory pause `.unavailable`).
* Versión: 0.6
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import UndoIcon from "@mui/icons-material/Undo";
import Tooltip from "@mui/material/Tooltip";
import { memo, useEffect, useMemo } from "react";
import type { KeyboardEvent } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { cx } from "@shared/lib/class-names";
import { CONSOLE_PARAMETERS } from "./config/console-controls.config";
import type { ConsoleParameterDefinition } from "./config/console-controls.config";
import { buildConfirmation } from "./console-controls.reducer";
import { confirmationCount, pendingConfirmation, proposeIfEmpty, selectPendingState, usePendingLifecycle } from "./console-pending-store";
import type { PendingControlsStore } from "./console-pending-store";
import { useStoreSelector } from "./console-store";
import type { ConsoleAdapterStore, WritableStore } from "./console-store";
import { formatParameterValue } from "./parameter-control";
import type { ConsoleConfirmation, ConsoleLimits, ConsoleMode, ConsoleSettings, ConsoleSettingValues, VentilatorConsoleAdapter } from "./ventilator-console.entity";
import styles from "../UI/july-controls.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const JULY_CONFIRM_COPY = {
  send: "Enviar",
  sendHint: "Aplicar todos los cambios pendientes",
  stop: "Detener",
  stopUnavailable: "Disponible próximamente",
  undo: "Deshacer último cambio",
  undoHint: "Vuelve a aplicar los valores anteriores al último cambio enviado",
  pendingCount: (count: number) => (count === 1 ? "1 cambio pendiente" : `${count} cambios pendientes`),
  noPending: "Sin cambios pendientes",
  summaryTitle: "Revisar los cambios antes de enviarlos",
  summarySend: "Enviar al ventilador",
  summaryBack: "Volver",
  modeChange: (from: string, to: string) => `Modo ${from} → ${to}`,
  valueChange: (label: string, from: string, to: string, unit: string) => `${label} ${from} → ${to} ${unit}`.trim(),
} as const;

/** The change that undoes the last one sent from this console (null: nothing to undo). */
export type UndoStore = WritableStore<ConsoleConfirmation | null>;

/** A confirmed change is on its way or awaited: Enviar waits for it. */
export function hasBlockingInFlight(settings: ConsoleSettings): boolean {
  return Object.values(settings.inFlight ?? {}).some((flight) => flight !== undefined && flight.status !== "rejected");
}

/**
 * What undoes `confirmation` from the applied values and mode it changed: the previous value of every changed
 * parameter the source reported (an unknown one cannot be restored) and the previous mode when it is one of the mode
 * options (v0.5: an unknown applied mode, shown as "—", cannot be restored); null when nothing is left.
 */
export function inverseConfirmation(confirmation: ConsoleConfirmation, applied: ConsoleSettingValues, appliedMode: ConsoleMode): ConsoleConfirmation | null {
  const changes = confirmation.changes.flatMap(({ parameter }) => {
    const value = applied[parameter];

    return value === undefined ? [] : [{ parameter, value }];
  });
  const previous = appliedMode.current;
  const restorable = appliedMode.options.some((option) => option.id === previous);
  const mode = confirmation.mode !== null && confirmation.mode !== previous && restorable ? previous : null;

  return changes.length === 0 && mode === null ? null : { mode, changes };
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

/** Emits `confirmation` once and remembers what undoes it. */
function emit(adapter: VentilatorConsoleAdapter, confirmation: ConsoleConfirmation, undo: UndoStore): void {
  const inverse = inverseConfirmation(confirmation, adapter.settings.applied, adapter.mode);

  adapter.onConfirm(confirmation);
  undo.set(inverse);
}

/** Emits the pending diff once and clears it; false when nothing is pending. */
export function confirmPendingNow(store: ConsoleAdapterStore, pending: PendingControlsStore, undo: UndoStore): boolean {
  const adapter = store.getSnapshot();
  const confirmation = pendingConfirmation(pending, adapter.settings, adapter.mode);

  if (confirmation === null) {
    return false;
  }

  emit(adapter, confirmation, undo);
  pending.dispatch({ type: "reset" });

  return true;
}

/** "Deshacer último cambio": emits what undoes the last change sent; false when read-only, waiting or nothing to undo. */
export function undoLastNow(store: ConsoleAdapterStore, undo: UndoStore, readOnly: boolean): boolean {
  const adapter = store.getSnapshot();
  const target = undo.getSnapshot();

  if (readOnly || target === null || hasBlockingInFlight(adapter.settings)) {
    return false;
  }

  emit(adapter, target, undo);

  return true;
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
  /** Enviar opens the summary instead of emitting at once. */
  confirmSummary: boolean
  /** Open state of the summary, owned by the console. */
  summary: WritableStore<boolean>
  /** What undoes the last change sent, owned by the console. */
  undo: UndoStore
};

/** Enviar: at once, or through the summary; nothing when read-only, empty or waiting for the source. */
export function requestConfirm({ store, pending, readOnly, confirmSummary, summary, undo }: JulyConfirmOptions): boolean {
  const adapter = store.getSnapshot();

  if (readOnly || hasBlockingInFlight(adapter.settings) || pendingConfirmation(pending, adapter.settings, adapter.mode) === null) {
    return false;
  }

  if (confirmSummary) {
    summary.set(true);

    return true;
  }

  return confirmPendingNow(store, pending, undo);
}

function isValueControl(element: HTMLElement): boolean {
  return element.getAttribute("role") === "spinbutton" || (element instanceof HTMLInputElement && element.type === "range");
}

/**
 * Console keydown: only inside `[data-console-control]` (never a drawer, the assist field or a portal). Escape drops
 * the pending edits; Enter on a value control sends them (or opens the summary). Buttons keep their native Enter.
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

const selectSettings = (adapter: VentilatorConsoleAdapter) => adapter.settings;
const selectMode = (adapter: VentilatorConsoleAdapter) => adapter.mode;
const selectLimits = (adapter: VentilatorConsoleAdapter) => adapter.limits;
const selectOnPendingChange = (adapter: VentilatorConsoleAdapter) => adapter.onPendingChange;
const selectPendingResetKey = (adapter: VentilatorConsoleAdapter) => adapter.permissions.pendingResetKey;
const selectProposal = (adapter: VentilatorConsoleAdapter) => adapter.proposal;
const selectOpen = (open: boolean) => open;
const selectUndo = (undo: ConsoleConfirmation | null) => undo;

type JulyConfirmActionsProps = JulyConfirmOptions & {
  readOnlyReason: string | undefined
  /** Id given to the read-only reason (the other July controls reference it). */
  reasonId: string
  /** Detener (semantics still open): without it the button is disabled with "Disponible próximamente". */
  onStop?: (() => void) | undefined
};

/** Enviar / Detener, "Deshacer último cambio", the pending counter, the read-only reason and the optional summary. */
export const JulyConfirmActions = memo(function JulyConfirmActions(props: JulyConfirmActionsProps) {
  const { store, pending, readOnly, readOnlyReason, reasonId, summary, undo, onStop } = props;
  const settings = useStoreSelector(store, selectSettings);
  const mode = useStoreSelector(store, selectMode);
  const limits = useStoreSelector(store, selectLimits);
  const onPendingChange = useStoreSelector(store, selectOnPendingChange);
  const pendingResetKey = useStoreSelector(store, selectPendingResetKey);
  const state = useStoreSelector(pending, selectPendingState);
  const summaryOpen = useStoreSelector(summary, selectOpen);
  const undoTarget = useStoreSelector(undo, selectUndo);
  const appliedMode = mode.current;
  const confirmation = useMemo(() => buildConfirmation(state, settings.applied, appliedMode), [state, settings.applied, appliedMode]);
  const count = confirmationCount(confirmation);
  const describedBy = readOnly && readOnlyReason ? reasonId : undefined;
  const stopHintId = `${reasonId}-stop`;
  const waiting = hasBlockingInFlight(settings);
  const lines = summaryOpen && confirmation !== null ? summarizeConfirmation(confirmation, { applied: settings.applied, mode, limits }) : [];

  usePendingLifecycle(pending, { hasPending: count > 0, onPendingChange, pendingResetKey });

  const proposal = useStoreSelector(store, selectProposal);

  // v0.4: nothing applied and nothing pending: pre-fill the source's initial configuration (after a reset too). The
  // snapshot is read now, so a source that stopped proposing in this commit (Enviar) is never re-seeded.
  useEffect(() => {
    const current = store.getSnapshot().proposal;

    if (!readOnly && current !== undefined) {
      proposeIfEmpty(pending, current);
    }
  }, [store, pending, readOnly, proposal, state]);

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
          title={JULY_CONFIRM_COPY.sendHint}
          aria-describedby={describedBy}
          data-console-control=""
          disabled={readOnly || confirmation === null || waiting}
          onClick={() => requestConfirm(props)}
        >
          <SendIcon fontSize="small" aria-hidden />
          {JULY_CONFIRM_COPY.send}
        </button>
        {onStop ? (
          <button type="button" className={cx(styles.action)} aria-describedby={describedBy} disabled={readOnly} onClick={onStop}>
            <StopIcon fontSize="small" aria-hidden />
            {JULY_CONFIRM_COPY.stop}
          </button>
        ) : (
          // v0.5 (M5): a disabled button gets no hover / focus: the focusable wrapper carries the visible tooltip.
          <Tooltip title={JULY_CONFIRM_COPY.stopUnavailable}>
            <span className={cx(styles.stopUnavailable)} tabIndex={0} aria-describedby={stopHintId}>
              <button type="button" className={cx(styles.action)} aria-describedby={describedBy ? `${describedBy} ${stopHintId}` : stopHintId} disabled>
                <StopIcon fontSize="small" aria-hidden />
                {JULY_CONFIRM_COPY.stop}
              </button>
              <span id={stopHintId} className={cx(styles.visuallyHidden)}>{JULY_CONFIRM_COPY.stopUnavailable}</span>
            </span>
          </Tooltip>
        )}
      </div>
      <button
        type="button"
        className={cx(styles.action, styles.undo)}
        title={JULY_CONFIRM_COPY.undoHint}
        aria-describedby={describedBy}
        disabled={readOnly || undoTarget === null || waiting}
        onClick={() => undoLastNow(store, undo, readOnly)}
      >
        <UndoIcon fontSize="small" aria-hidden />
        {JULY_CONFIRM_COPY.undo}
      </button>
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
          confirmPendingNow(store, pending, undo);
        }}
        onCancel={closeSummary}
      />
    </div>
  );
});
