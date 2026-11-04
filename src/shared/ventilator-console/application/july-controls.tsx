/*
* Funcionalidad: July console controls
* Descripción: The ventilator controls of the July layout, spread over the console zones and sharing the per-console pending store (console-pending-store.ts): the input row above the curves (FiO2 | Volumen (VCV) / PIP (PCV) / Presión de soporte | PEEP, each with its range validation, i.e. the same clamp/snap of the controls reducer), the VOL CTRL / PRES CTRL mode toggle with an optional assist slot to its right and a discreet "Más modos" menu (menuitemradio) for the other adapter modes (D20 option A; the mode stays pending until Confirmar), the timing block (Insp/Esp slider that sets Ti from the cycle, read-only I:E and Te, inspiratory time and pause, and the expiratory pause disabled with "No disponible en este simulador", D21), the rate block (spinbutton + slider) and "Más parámetros" with every other applicable parameter (open while one of them is pending). No new engine parameter (no I:E, no expiratory pause, no "Q Max", D22). Each piece is a memo zone that reads only its slices of the adapter store and of the pending store, so an edit re-renders the touched control, never the metrics or the curves; the handlers read the snapshots at event time. Every interactive element carries `data-console-control` for the console Enter/Esc handler (july-confirm.tsx). v0.1 (Bloque 5, C2): first version. v0.2 (Bloque 5, C6): "Más modos" lists the short mode names on one line ("Más modos (PSV, CPAP, SIMV)", "Más modos PSV"), as mockup 05. Depends on React, MUI (Menu), the console stores, the controls config, the placement config, the timing math and the July styles.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { memo, useCallback, useId, useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { CONSOLE_PARAMETERS, getParametersForMode } from "./config/console-controls.config";
import type { ModeParameterTable } from "./config/console-controls.config";
import {
  isPrimaryMode,
  JULY_INSPIRATORY_PAUSE,
  JULY_INSPIRATORY_TIME,
  JULY_PRIMARY_MODES,
  JULY_RATE,
  julyLabel,
  julyPlacement,
} from "./config/console-placement.config";
import type { JulyPlacement } from "./config/console-placement.config";
import type { Adjustment, ControlsState } from "./console-controls.reducer";
import { adjustPending, isSelectedSelector, pendingValueSelector, selectPendingMode, selectRawPendingMode } from "./console-pending-store";
import type { PendingControlsStore } from "./console-pending-store";
import { sameData, useStoreSelector } from "./console-store";
import type { ConsoleAdapterStore } from "./console-store";
import {
  expiratoryTime,
  formatDecimal,
  formatIeRatio,
  ieRatio,
  inspiratoryPercent,
  inspiratoryPercentRange,
  inspiratoryTimeFromPercent,
} from "./july-timing";
import { ParameterControl } from "./parameter-control";
import type { ConsoleMode, VentilatorConsoleAdapter } from "./ventilator-console.entity";
import styles from "../UI/july-controls.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const JULY_CONTROLS_COPY = {
  modes: "Modo ventilatorio",
  moreModes: "Más modos",
  modePending: (label: string) => `Modo pendiente: ${label}`,
  inputRow: "Parámetros principales",
  ieSlider: "Relación inspiración/espiración",
  insp: "Insp",
  esp: "Esp",
  ieStatus: "Relación I:E",
  ieValueText: (ratio: string) => `I:E ${ratio}`,
  expiratoryTime: "Tiempo espiratorio",
  te: (seconds: string) => `Te ${seconds} s`,
  expiratoryPause: "Pausa espiratoria",
  expiratoryPauseUnavailable: "No disponible en este simulador",
  rateSlider: "Frecuencia respiratoria",
  moreParameters: "Más parámetros",
  keyboardHint: "Esc: cancelar · Enter: confirmar",
} as const;

/** What every July zone receives from the console shell (stable per console). */
export type JulyZoneProps = {
  store: ConsoleAdapterStore
  pending: PendingControlsStore
  readOnly: boolean
  /** Id of the read-only reason, referenced by every disabled control. */
  describedBy: string | undefined
  applicability: ModeParameterTable | undefined
};

const selectMode = (adapter: VentilatorConsoleAdapter): ConsoleMode => adapter.mode;
const selectLimits = (adapter: VentilatorConsoleAdapter) => adapter.limits;

/** The applied mode, the pending one (null when none or already applied) and the effective one. */
export function useEffectiveMode(store: ConsoleAdapterStore, pending: PendingControlsStore): { mode: ConsoleMode, pendingMode: string | null, effective: string } {
  const mode = useStoreSelector(store, selectMode);
  const raw = useStoreSelector(pending, selectRawPendingMode);
  const pendingMode = raw === null || raw === mode.current ? null : raw;

  return { mode, pendingMode, effective: pendingMode ?? mode.current };
}

/** Placement of the parameters that apply to the effective mode (recomputed only when the mode or the limits change). */
export function useJulyPlacement({ store, pending, applicability }: Pick<JulyZoneProps, "store" | "pending" | "applicability">): JulyPlacement & { effective: string } {
  const { effective } = useEffectiveMode(store, pending);
  const limits = useStoreSelector(store, selectLimits);

  return useMemo(() => ({ ...julyPlacement(getParametersForMode(effective, limits, applicability)), effective }), [effective, limits, applicability]);
}

/** The value a parameter shows: pending, else applied, else current; null when the source reports none. */
export function useEffectiveValue(store: ConsoleAdapterStore, pending: PendingControlsStore, parameter: string): number | null {
  const selectReported = useCallback(
    (adapter: VentilatorConsoleAdapter) => adapter.settings.applied[parameter] ?? adapter.settings.current[parameter],
    [parameter],
  );
  const reported = useStoreSelector(store, selectReported);
  const pendingValue = useStoreSelector(pending, pendingValueSelector(parameter));

  return pendingValue ?? reported ?? null;
}

/** Applies an adjustment from the snapshots of the moment (no stale closure over a render). */
function adjustNow(store: ConsoleAdapterStore, pending: PendingControlsStore, parameter: string, adjustment: Adjustment): void {
  const adapter = store.getSnapshot();
  const limit = adapter.limits[parameter];

  if (limit !== undefined) {
    adjustPending(pending, { parameter, limit, adjustment, settings: adapter.settings, onProposeChange: adapter.onProposeChange });
  }
}

type JulyParameterProps = Omit<JulyZoneProps, "applicability"> & {
  parameter: string
  label?: string | undefined
  children?: ReactNode
};

/** One parameter of the July layout; re-renders only for its own limit, reported values, in-flight state and edits. */
export const JulyParameter = memo(function JulyParameter({ store, pending, parameter, readOnly, describedBy, label, children }: JulyParameterProps) {
  const selectLimit = useCallback((adapter: VentilatorConsoleAdapter) => adapter.limits[parameter], [parameter]);
  const selectApplied = useCallback((adapter: VentilatorConsoleAdapter) => adapter.settings.applied[parameter], [parameter]);
  const selectCurrent = useCallback((adapter: VentilatorConsoleAdapter) => adapter.settings.current[parameter], [parameter]);
  const selectInFlight = useCallback((adapter: VentilatorConsoleAdapter) => adapter.settings.inFlight?.[parameter], [parameter]);
  const limit = useStoreSelector(store, selectLimit);
  const applied = useStoreSelector(store, selectApplied);
  const current = useStoreSelector(store, selectCurrent);
  const inFlight = useStoreSelector(store, selectInFlight, sameData);
  const pendingValue = useStoreSelector(pending, pendingValueSelector(parameter));
  const selected = useStoreSelector(pending, isSelectedSelector(parameter));
  const onAdjust = useCallback((adjustment: Adjustment) => {
    if (!readOnly) {
      adjustNow(store, pending, parameter, adjustment);
    }
  }, [store, pending, parameter, readOnly]);
  const onSelect = useCallback(() => {
    pending.dispatch({ type: "select", parameter });
  }, [pending, parameter]);

  if (limit === undefined) {
    return null;
  }

  return (
    <ParameterControl
      id={parameter}
      definition={CONSOLE_PARAMETERS[parameter as keyof typeof CONSOLE_PARAMETERS] ?? { label: parameter, description: parameter }}
      limit={limit}
      value={pendingValue ?? applied ?? current ?? null}
      applied={applied}
      pending={pendingValue !== undefined && pendingValue !== applied}
      inFlight={inFlight}
      selected={selected}
      disabled={readOnly}
      describedBy={describedBy}
      onAdjust={onAdjust}
      onSelect={onSelect}
      element="div"
      layout="july"
      label={label}
    >
      {children}
    </ParameterControl>
  );
});

/** FiO2 | Vt / Pinsp / PS | PEEP above the curves (the middle slot stays empty in CPAP). */
export const JulyInputRow = memo(function JulyInputRow(props: JulyZoneProps) {
  const placement = useJulyPlacement(props);

  return (
    <div className={cx(styles.inputRow)} role="group" aria-label={JULY_CONTROLS_COPY.inputRow}>
      {placement.row.map((parameter, index) => (parameter === null ? (
        <div key={`empty-${index}`} className={cx(styles.emptySlot)} aria-hidden="true">—</div>
      ) : (
        <JulyParameter
          key={parameter}
          store={props.store}
          pending={props.pending}
          parameter={parameter}
          readOnly={props.readOnly}
          describedBy={props.describedBy}
          label={julyLabel(parameter, placement.effective)}
        />
      )))}
    </div>
  );
});

type JulyModeToggleProps = JulyZoneProps & {
  /** Rendered to the right of the toggle (the "Asesoría IA" button). */
  assist?: ReactNode
};

/** "PSV — Presión de soporte" → "PSV": the short name the "Más modos" button lists (the menu keeps the full label). */
function shortModeLabel(option: { id: string, label: string }): string {
  return option.label.split(" — ")[0]?.trim() || option.id;
}

/** VOL CTRL / PRES CTRL (+ assist slot) and the "Más modos" menu; the selected mode stays pending until Confirmar. */
export const JulyModeToggle = memo(function JulyModeToggle({ store, pending, readOnly, describedBy, applicability, assist }: JulyModeToggleProps) {
  const { mode, pendingMode, effective } = useEffectiveMode(store, pending);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const buttonId = useId();
  const primary = JULY_PRIMARY_MODES.filter((candidate) => mode.options.some((option) => option.id === candidate.id));
  const extras = mode.options.filter((option) => !isPrimaryMode(option.id));
  const effectiveExtra = extras.find((option) => option.id === effective);
  const pendingLabel = mode.options.find((option) => option.id === pendingMode)?.label ?? pendingMode;

  const select = (modeId: string) => {
    if (readOnly) {
      return;
    }

    const adapter = store.getSnapshot();

    selectPendingMode(pending, modeId, adapter.mode, adapter.limits, applicability);
  };

  return (
    <div className={cx(styles.modeBlock)}>
      <div className={cx(styles.modeRow)}>
        <div className={cx(styles.modes)} role="group" aria-label={JULY_CONTROLS_COPY.modes}>
          {primary.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cx(styles.modeButton)}
              aria-label={option.name}
              aria-pressed={effective === option.id}
              aria-describedby={describedBy}
              data-pending={pendingMode === option.id}
              data-console-control=""
              disabled={readOnly}
              onClick={() => select(option.id)}
            >
              {option.short}
              <small>{option.sub}</small>
            </button>
          ))}
        </div>
        {assist}
      </div>
      {extras.length > 0 ? (
        <>
          <button
            id={buttonId}
            type="button"
            className={cx(styles.moreModes)}
            aria-haspopup="menu"
            aria-expanded={menuAnchor !== null}
            aria-controls={menuAnchor !== null ? menuId : undefined}
            aria-describedby={describedBy}
            data-active={effectiveExtra !== undefined}
            data-pending={effectiveExtra !== undefined && pendingMode === effectiveExtra.id}
            data-console-control=""
            disabled={readOnly}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
          >
            {JULY_CONTROLS_COPY.moreModes}
            <span className={cx(styles.moreModesList)}>
              {effectiveExtra ? shortModeLabel(effectiveExtra) : `(${extras.map(shortModeLabel).join(", ")})`}
            </span>
            <ArrowDropDownIcon fontSize="small" aria-hidden />
          </button>
          <Menu
            id={menuId}
            anchorEl={menuAnchor}
            open={menuAnchor !== null}
            onClose={() => setMenuAnchor(null)}
            slotProps={{ list: { "aria-labelledby": buttonId } }}
          >
            {extras.map((option) => (
              <MenuItem
                key={option.id}
                role="menuitemradio"
                aria-checked={effective === option.id}
                selected={effective === option.id}
                onClick={() => {
                  select(option.id);
                  setMenuAnchor(null);
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>
        </>
      ) : null}
      {pendingMode !== null ? <p className={cx(styles.pendingNote)}>{JULY_CONTROLS_COPY.modePending(pendingLabel ?? "")}</p> : null}
    </div>
  );
});

type SliderProps = {
  label: string
  min: number
  max: number
  step: number
  value: number
  valueText: string
  disabled: boolean
  describedBy: string | undefined
  onChange: (value: number) => void
};

function JulySlider({ label, min, max, step, value, valueText, disabled, describedBy, onChange }: SliderProps) {
  return (
    <input
      type="range"
      className={cx(styles.slider)}
      aria-label={label}
      aria-valuetext={valueText}
      aria-describedby={describedBy}
      data-console-control=""
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value))}
    />
  );
}

/** Insp/Esp slider, I:E, Ti with Te, inspiratory pause and the (unavailable) expiratory pause. */
export const JulyTiming = memo(function JulyTiming(props: JulyZoneProps) {
  const { store, pending, readOnly, describedBy } = props;
  const placement = useJulyPlacement(props);
  const ti = useEffectiveValue(store, pending, JULY_INSPIRATORY_TIME);
  const rate = useEffectiveValue(store, pending, JULY_RATE);
  const selectTiLimit = useCallback((adapter: VentilatorConsoleAdapter) => adapter.limits[JULY_INSPIRATORY_TIME], []);
  const tiLimit = useStoreSelector(store, selectTiLimit);
  const reasonId = useId();
  const ratio = ieRatio(ti, rate);
  const te = expiratoryTime(ti, rate);
  const percent = inspiratoryPercent(ti, rate);
  const range = tiLimit && placement.rate ? inspiratoryPercentRange(tiLimit, rate) : null;

  const onSlide = (value: number) => {
    const next = inspiratoryTimeFromPercent(value, rate);

    if (!readOnly && next !== null) {
      adjustNow(store, pending, JULY_INSPIRATORY_TIME, { kind: "value", value: next });
    }
  };

  return (
    <div className={cx(styles.timing)}>
      {placement.inspiratoryTime ? (
        <>
          {range !== null && percent !== null ? (
            <div className={cx(styles.sliderBlock)}>
              <p className={cx(styles.sliderEnds)} aria-hidden="true">
                <span>{JULY_CONTROLS_COPY.insp}</span>
                <span>{JULY_CONTROLS_COPY.esp}</span>
              </p>
              <JulySlider
                label={JULY_CONTROLS_COPY.ieSlider}
                min={range.min}
                max={range.max}
                step={1}
                value={percent}
                valueText={JULY_CONTROLS_COPY.ieValueText(formatIeRatio(ratio))}
                disabled={readOnly}
                describedBy={describedBy}
                onChange={onSlide}
              />
            </div>
          ) : null}
          <p className={cx(styles.readOut)} role="status" aria-label={JULY_CONTROLS_COPY.ieStatus}>
            <span>{JULY_CONTROLS_COPY.ieStatus}</span>
            <b>{formatIeRatio(ratio)}</b>
          </p>
          <JulyParameter
            store={store}
            pending={pending}
            parameter={JULY_INSPIRATORY_TIME}
            readOnly={readOnly}
            describedBy={describedBy}
            label={julyLabel(JULY_INSPIRATORY_TIME, placement.effective)}
          >
            <span role="status" aria-label={JULY_CONTROLS_COPY.expiratoryTime}>
              {JULY_CONTROLS_COPY.te(te === null ? "—" : formatDecimal(te, 2))}
            </span>
          </JulyParameter>
        </>
      ) : null}
      {placement.inspiratoryPause ? (
        <JulyParameter
          store={store}
          pending={pending}
          parameter={JULY_INSPIRATORY_PAUSE}
          readOnly={readOnly}
          describedBy={describedBy}
          label={julyLabel(JULY_INSPIRATORY_PAUSE, placement.effective)}
        />
      ) : null}
      <div className={cx(styles.unavailable)}>
        <div
          role="spinbutton"
          className={cx(styles.unavailableValue)}
          aria-label={JULY_CONTROLS_COPY.expiratoryPause}
          aria-disabled="true"
          aria-readonly="true"
          aria-valuetext={JULY_CONTROLS_COPY.expiratoryPauseUnavailable}
          aria-describedby={reasonId}
        >
          {JULY_CONTROLS_COPY.expiratoryPause}
        </div>
        <p id={reasonId} className={cx(styles.unavailableReason)}>{JULY_CONTROLS_COPY.expiratoryPauseUnavailable}</p>
      </div>
    </div>
  );
});

/** Respiratory rate: spinbutton and slider over the same limit (the console limits, not July's 0-24). */
export const JulyRate = memo(function JulyRate(props: JulyZoneProps) {
  const { store, pending, readOnly, describedBy } = props;
  const placement = useJulyPlacement(props);
  const rate = useEffectiveValue(store, pending, JULY_RATE);
  const selectRateLimit = useCallback((adapter: VentilatorConsoleAdapter) => adapter.limits[JULY_RATE], []);
  const limit = useStoreSelector(store, selectRateLimit);

  if (!placement.rate) {
    return null;
  }

  return (
    <div className={cx(styles.rate)}>
      <JulyParameter
        store={store}
        pending={pending}
        parameter={JULY_RATE}
        readOnly={readOnly}
        describedBy={describedBy}
        label={julyLabel(JULY_RATE, placement.effective)}
      />
      {limit !== undefined && rate !== null ? (
        <JulySlider
          label={JULY_CONTROLS_COPY.rateSlider}
          min={limit.min}
          max={limit.max}
          step={limit.step > 0 ? limit.step : 1}
          value={rate}
          valueText={`${rate} ${limit.unit}`.trim()}
          disabled={readOnly}
          describedBy={describedBy}
          onChange={(value) => {
            if (!readOnly) {
              adjustNow(store, pending, JULY_RATE, { kind: "value", value });
            }
          }}
        />
      ) : null}
    </div>
  );
});

/** Every other applicable parameter, collapsed; open while one of them is pending. */
export const JulyMoreParameters = memo(function JulyMoreParameters(props: JulyZoneProps) {
  const { store, pending, readOnly, describedBy } = props;
  const placement = useJulyPlacement(props);
  const [userOpen, setUserOpen] = useState(false);
  const panelId = useId();
  const { more } = placement;
  const selectAnyPending = useCallback((state: ControlsState) => more.some((id) => state.pendingValues[id] !== undefined), [more]);
  const anyPending = useStoreSelector(pending, selectAnyPending);
  const open = userOpen || anyPending;

  if (more.length === 0) {
    return null;
  }

  return (
    <div className={cx(styles.more)}>
      <button
        type="button"
        className={cx(styles.collapser)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setUserOpen((value) => !(value || anyPending))}
      >
        <span>{JULY_CONTROLS_COPY.moreParameters}</span>
        {open ? <ExpandLessIcon fontSize="small" aria-hidden /> : <ExpandMoreIcon fontSize="small" aria-hidden />}
      </button>
      {open ? (
        <div id={panelId} className={cx(styles.moreList)}>
          {more.map((parameter) => (
            <JulyParameter key={parameter} store={store} pending={pending} parameter={parameter} readOnly={readOnly} describedBy={describedBy} />
          ))}
        </div>
      ) : null}
    </div>
  );
});
