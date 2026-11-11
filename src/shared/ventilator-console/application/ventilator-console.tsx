/*
* Funcionalidad: VentilatorConsole
* Descripción: Generic ventilator console screen composed from an adapter (it does not know whether data comes from the simulator, a replay or a real ventilator): header with the current mode and a read-only badge, an alarms slot across the top, numeric monitoring in the left column, the curves zone (and the patient monitor below it) in the centre and the mode/controls slots on the right, like a bedside ventilator. Slots accept a node or a render function that receives the adapter and the read-only flag; an omitted alarms slot renders the AlarmsBar and an omitted controls slot renders ConsoleControls (mode selector + pending→confirm parameters) from the adapter, while `null` hides them. An optional maneuvers slot renders only when the adapter declares the maneuvers capability. `variant` switches the controls between a running ventilator ("Confirmar") and the case editor configuration ("Aplicar"). Uses the dark console surface tokens; below 1024 px the zones stack and a Spanish notice recommends a horizontal tablet or a computer. Depends on React, the console zones, the controls and alarms bar, useConsoleWaveforms, the console store and the console layout styles. v1.2: normal ranges merge per key as config defaults < range props < `adapter.ranges`; the curves keep their subscription across adapter rebuilds for the same frame source (see useConsoleWaveforms). v1.3: the built-in controls report pending edits through `adapter.onPendingChange`. v1.4 (generic source state): `capabilities.patientMonitor: false` hides the patient monitor zone; a frame source with `status: "no-data"` greys the curves under an overlay and makes the console read-only (the slots receive `readOnly: true`) until it is live again; the read-only reason (`permissions.readOnlyReason`, else the no-data message) is shown next to the "Solo lectura" badge and describes the built-in disabled controls. v1.5: the built-in controls receive `permissions.pendingResetKey` (drop unconfirmed edits when it changes). v1.6 (W2, Bloque 1): `adapter` may be a `ConsoleAdapterStore` (stable identity, immutable snapshots at ≤ 4 Hz); every zone (alarms, numeric monitor, curves, patient monitor, controls, function slots) is a memoised component that reads only its slice with useSyncExternalStore, so a new snapshot re-renders only the zones whose slice changed and the console shell re-renders only when its layout (mode, read-only state, zone visibility) changes. A plain adapter object still works (it is wrapped in a static store per object). v1.7 (Bloque 5, C3): opt-in `layout="july"` (default `classic`, unchanged for the replay, the case editor, its preview and the recording player, D28): the July three columns (july-layout.module.css; DISENO_BLOQUE5 §6.1-§6.3): left `region "Valores"` with the logos, the `leftTop` slot (monitor mode, patient), Confirmar / Cancelar with the pending counter and the value cards (the patient vitals join them); centre with the input row FiO2 | Vt/Pinsp/PS | PEEP, the alarms, the July curves (`curvesToolbarStart` slot for the signal chip) and the `curvesFooter` slot; right `complementary "Controles"` with the mode head, VOL CTRL / PRES CTRL (+ `assistSlot`) and "Más modos", timing, rate, "Más parámetros", the maneuvers slot, the `rightFooter` slot and the keyboard hint. One pending store per console shares the edits between the zones; Enter / Escape are handled on the console root for the elements marked `data-console-control`; `confirmSummary` (Real) makes Confirmar open the summary of every change. `header` renders above the columns; `modeSlot` renders at the top of the right column; `controlsSlot={null}` drops the July controls (a read-only console). Pass stable slot nodes (or nodes that subscribe on their own) so the console shell is not re-rendered by its owner. v1.8 (Bloque 5, C5): July `cards` (a MonitorCardsController with a stable identity: the host's per-user preference; omitted, one in memory) and `cardsLockedReason` (EXAM: "Ajustar" disabled, the preference applied read-only). v1.9 (Bloque 5, C6): the July root provides the console drawers (one open at a time: Asesoría IA, Alertas detalladas, Caso clínico) to everything rendered inside, slots included. v2.0 (Bloque 5, C9): with the built-in alarms the July layout uses JulyAlarmsZone (the alarms bar opens the "Alertas detalladas" drawer with the validation alerts, the alarm history and the limits; icon-only at 1280) and the right column ends with JulyMechanicsAlerts ("Estado de la mecánica", "Alertas (n)", "Ver alertas detalladas") before the host `rightFooter`. v2.1 (Ajustes A, A1): the July layout applies the edits on its own by default (`applyMode="auto"`, DISENO_AJUSTES_A §3.1): the pending store is the debounce buffer of a per-console scheduler (july-auto-apply.ts) that confirms through the same `adapter.onConfirm` at 0 ms for buttons, keys, the mode toggle and "Más modos" and 300 ms after the last slider or wheel change (`autoApplyDelays` overrides them per source); Enter applies now what is still debouncing, Escape drops it, and a console that became read-only meanwhile drops it unsent. Auto mode has no Confirmar, Cancelar, pending counter, keyboard hint, "Modo pendiente" note nor pending validation alert; `applyMode="confirm"` keeps them (with `confirmSummary`). The classic layout is unchanged. v2.2 (Ajustes A, A4): the VentyLab logo image is declared at its new displayed size (80 × 40). v2.3 (Bloque A): July `renderAlarmHelp` (the host "¿Cómo estabilizar?" help of an alarm; the built-in alarms become buttons). v2.4 (2026-11-10, reverts v2.1 / decisions A-1 to A-4): the July layout no longer applies on its own (no `applyMode`, `autoApplyDelays` nor scheduler): every edit stays pending (highlighted) until Enviar, the same component and button order in Digital and Real: left column [Enviar][Detener], "Deshacer último cambio", the pending counter, then [Ajustar][Restablecer tarjetas] and the cards. The console owns the undo (one store per console: what undoes the last change sent through `adapter.onConfirm`). `onStop` wires Detener (omitted: disabled, "Disponible próximamente"). The keyboard hint and the pending validation alert are always on.
* Versión: 2.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Image from "next/image";
import { memo, useId, useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { CONSOLE_NO_DATA_MESSAGE } from "./config/console.config";
import type { ConsoleMetricId, PatientVitalId } from "./config/console.config";
import type { ModeParameterTable } from "./config/console-controls.config";
import { AlarmsBar } from "./alarms-bar";
import { ConsoleControls } from "./console-controls";
import type { ConsoleVariant } from "./console-controls";
import type { RangeOverrides } from "./console-format";
import { createPendingControlsStore } from "./console-pending-store";
import { createExternalStore, isConsoleAdapterStore, sameData, staticConsoleStore, useStoreSelector } from "./console-store";
import type { ConsoleAdapterStore } from "./console-store";
import type { AlarmBeeperFactory, ConsoleClock } from "./use-console-alarms";
import { ConsoleDrawersProvider } from "./console-drawers";
import { CurvesZone } from "./curves-zone";
import { JulyAlarmsZone, JulyMechanicsAlerts } from "./july-alerts";
import type { AlarmHelpRenderer } from "./july-alerts";
import { handleJulyKeyDown, JulyConfirmActions } from "./july-confirm";
import { JULY_CONTROLS_COPY, JulyInputRow, JulyModeToggle, JulyMoreParameters, JulyRate, JulyTiming } from "./july-controls";
import { MonitorCards } from "./monitor-cards";
import type { MonitorCardsController } from "./monitor-cards";
import { NumericMonitor } from "./numeric-monitor";
import { PatientMonitor } from "./patient-monitor";
import { useConsoleWaveforms } from "./use-console-waveforms";
import type { ConsoleConfirmation, VentilatorConsoleAdapter } from "./ventilator-console.entity";
import julyStyles from "../UI/july-layout.module.css";
import styles from "../UI/ventilator-console.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const CONSOLE_COPY = {
  label: "Consola del ventilador",
  mode: "Modo",
  readOnly: "Solo lectura",
  smallScreen: "Para usar la consola con comodidad, gira la tablet en horizontal o abre esta página en un computador.",
  controls: "Controles",
  values: "Valores",
  logoVentyLab: "VentyLab",
  logoUnivalle: "Univalle",
} as const;

/** v1.7: `july` is the July three-column Monitoreo layout; `classic` (default) the original one. */
export type ConsoleLayoutKind = "classic" | "july";

// Ajustes A (A4): the 2:1 mark at its displayed size (40 px tall at >= 1100 px), so next/image picks 1x / 2x for it.
const LOGO_VENTYLAB = { src: "/images/logo.png", width: 80, height: 40 } as const;
const LOGO_UNIVALLE = { src: "/images/logo-univalle.svg", width: 180, height: 21 } as const;

export type ConsoleSlotContext = {
  adapter: VentilatorConsoleAdapter
  /** No control permission, or the frame source has no data. */
  readOnly: boolean
  /** Why the console is read-only, when known. */
  readOnlyReason?: string | undefined
};

export type ConsoleSlot = ReactNode | ((context: ConsoleSlotContext) => ReactNode);

export type VentilatorConsoleProps = {
  /**
   * The data source: a plain adapter object (re-rendered by its owner) or, for live sources, a `ConsoleAdapterStore`
   * with a stable identity whose snapshots each zone reads on its own (no re-render of the whole console per update).
   */
  adapter: VentilatorConsoleAdapter | ConsoleAdapterStore
  /**
   * Overrides of the metric normal ranges (teaching defaults in the config); `null` disables the highlight for that
   * metric. `adapter.ranges` takes precedence per key.
   */
  metricRanges?: RangeOverrides<ConsoleMetricId>
  patientRanges?: RangeOverrides<PatientVitalId>
  /** Optional heading content, e.g. the case name and PBW. */
  header?: ReactNode
  /** Omitted: the built-in AlarmsBar; `null`: no alarms bar. */
  alarmsSlot?: ConsoleSlot
  modeSlot?: ConsoleSlot
  /** Omitted: the built-in ConsoleControls (mode selector included); `null`: no controls. */
  controlsSlot?: ConsoleSlot
  /**
   * Hold maneuvers (inspiratory/expiratory pause). Rendered only when `adapter.capabilities.maneuvers` is true. The
   * simulation engine has no pause maneuvers, so the simulator never declares it and the console shows no hold buttons;
   * the console implements none itself.
   */
  maneuversSlot?: ConsoleSlot
  variant?: ConsoleVariant
  /** Mode → parameter applicability override for the built-in controls (e.g. SIMV with pressure mandatory breaths). */
  applicability?: ModeParameterTable
  /** Injectable clock and beeper for the built-in alarms bar (tests, replay). */
  clock?: ConsoleClock
  beeperFactory?: AlarmBeeperFactory
  /** v1.7: `july` opts into the July three-column layout (default `classic`). */
  layout?: ConsoleLayoutKind
  /** v1.7 (July): Enviar opens a summary of every change before emitting. */
  confirmSummary?: boolean
  /** v1.7 (July): left column under the logos (monitor mode selector, patient status). */
  leftTop?: ReactNode
  /** v1.7 (July): right of the mode toggle (the "Asesoría IA" button). */
  assistSlot?: ReactNode
  /** v1.7 (July): first item of the curves toolbar (the signal status chip). */
  curvesToolbarStart?: ReactNode
  /** v1.7 (July): under the curves (the real "Comandos recientes"). */
  curvesFooter?: ReactNode
  /** v1.7 (July): bottom of the right column (mechanics, detailed alerts). */
  rightFooter?: ReactNode
  /** v1.8 (July): order and hidden value cards (stable identity); omitted, an in-memory preference. */
  cards?: MonitorCardsController | undefined
  /** v1.8 (July): why "Ajustar" is unavailable (EXAM, D29); the preference still applies. */
  cardsLockedReason?: string | undefined
  /** v2.3 (July, built-in alarms): every alarm opens the "¿Cómo estabilizar?" drawer with this host help. */
  renderAlarmHelp?: AlarmHelpRenderer | undefined
  /**
   * v2.4 (July): "Detener" (its semantics are still being decided). Omitted, the button stays in its July place
   * disabled with "Disponible próximamente".
   */
  onStop?: (() => void) | undefined
  className?: string
};

/** Per key, the adapter (source) ranges win over the props, which win over the config defaults. */
function mergeRanges<K extends string>(props: RangeOverrides<K> | undefined, source: RangeOverrides<K> | undefined): RangeOverrides<K> | undefined {
  return source ? { ...props, ...source } : props;
}

/** What the console shell itself depends on; anything else is read by the zone that shows it. */
type ConsoleLayout = {
  modeLabel: string
  readOnly: boolean
  readOnlyReason: string | undefined
  showPatientMonitor: boolean
  maneuvers: boolean
};

function selectLayout(adapter: VentilatorConsoleAdapter): ConsoleLayout {
  const noData = adapter.frames.status === "no-data";
  const readOnly = !adapter.permissions.canControl || noData;
  const noDataMessage = adapter.frames.statusMessage ?? CONSOLE_NO_DATA_MESSAGE;

  return {
    modeLabel: adapter.mode.options.find((option) => option.id === adapter.mode.current)?.label ?? adapter.mode.current,
    readOnly,
    readOnlyReason: readOnly ? adapter.permissions.readOnlyReason ?? (noData ? noDataMessage : undefined) : undefined,
    showPatientMonitor: adapter.capabilities?.patientMonitor !== false,
    maneuvers: adapter.capabilities?.maneuvers === true,
  };
}

const selectWhole = (adapter: VentilatorConsoleAdapter): VentilatorConsoleAdapter => adapter;
const selectAlarms = (adapter: VentilatorConsoleAdapter) => adapter.alarms;
const selectAlarmHistory = (adapter: VentilatorConsoleAdapter) => adapter.alarmHistory;
const selectAlarmLimits = (adapter: VentilatorConsoleAdapter) => adapter.alarmLimits;
const selectOnAlarmLimitsChange = (adapter: VentilatorConsoleAdapter) => adapter.onAlarmLimitsChange;
const selectMetrics = (adapter: VentilatorConsoleAdapter) => adapter.metrics;
const selectMetricRanges = (adapter: VentilatorConsoleAdapter) => adapter.ranges?.metrics;
const selectPatient = (adapter: VentilatorConsoleAdapter) => adapter.patient;
const selectPatientRanges = (adapter: VentilatorConsoleAdapter) => adapter.ranges?.patient;
const selectFrames = (adapter: VentilatorConsoleAdapter) => adapter.frames;
const selectSettings = (adapter: VentilatorConsoleAdapter) => adapter.settings;
const selectMode = (adapter: VentilatorConsoleAdapter) => adapter.mode;
const selectLimits = (adapter: VentilatorConsoleAdapter) => adapter.limits;
const selectOnConfirm = (adapter: VentilatorConsoleAdapter) => adapter.onConfirm;
const selectOnCancel = (adapter: VentilatorConsoleAdapter) => adapter.onCancel;
const selectOnProposeChange = (adapter: VentilatorConsoleAdapter) => adapter.onProposeChange;
const selectOnPendingChange = (adapter: VentilatorConsoleAdapter) => adapter.onPendingChange;
const selectPendingResetKey = (adapter: VentilatorConsoleAdapter) => adapter.permissions.pendingResetKey;

type StoreProps = { store: ConsoleAdapterStore };

type SlotHostProps = StoreProps & {
  render: (context: ConsoleSlotContext) => ReactNode
  readOnly: boolean
  readOnlyReason: string | undefined
};

/** A render-function slot receives the whole adapter, so only this host re-renders with every snapshot. */
const SlotHost = memo(function SlotHost({ store, render, readOnly, readOnlyReason }: SlotHostProps) {
  const adapter = useStoreSelector(store, selectWhole);

  return <>{render({ adapter, readOnly, readOnlyReason })}</>;
});

type ConsoleAlarmsProps = StoreProps & {
  readOnly: boolean
  clock: ConsoleClock | undefined
  beeperFactory: AlarmBeeperFactory | undefined
};

const ConsoleAlarms = memo(function ConsoleAlarms({ store, readOnly, clock, beeperFactory }: ConsoleAlarmsProps) {
  const alarms = useStoreSelector(store, selectAlarms);
  const history = useStoreSelector(store, selectAlarmHistory);
  const limits = useStoreSelector(store, selectAlarmLimits);
  const onLimitsChange = useStoreSelector(store, selectOnAlarmLimitsChange);

  return (
    <AlarmsBar
      alarms={alarms}
      history={history}
      limits={limits}
      onLimitsChange={onLimitsChange}
      readOnly={readOnly}
      clock={clock}
      beeperFactory={beeperFactory}
    />
  );
});

type ConsoleMetricsZoneProps = StoreProps & { ranges: RangeOverrides<ConsoleMetricId> | undefined };

const ConsoleMetricsZone = memo(function ConsoleMetricsZone({ store, ranges }: ConsoleMetricsZoneProps) {
  const metrics = useStoreSelector(store, selectMetrics);
  const sourceRanges = useStoreSelector(store, selectMetricRanges);
  const merged = useMemo(() => mergeRanges(ranges, sourceRanges), [ranges, sourceRanges]);

  return <NumericMonitor metrics={metrics} ranges={merged} className={cx(styles.metrics)} />;
});

type ConsolePatientZoneProps = StoreProps & { ranges: RangeOverrides<PatientVitalId> | undefined };

const ConsolePatientZone = memo(function ConsolePatientZone({ store, ranges }: ConsolePatientZoneProps) {
  const patient = useStoreSelector(store, selectPatient);
  const sourceRanges = useStoreSelector(store, selectPatientRanges);
  const merged = useMemo(() => mergeRanges(ranges, sourceRanges), [ranges, sourceRanges]);

  return <PatientMonitor patient={patient} ranges={merged} />;
});

type ConsoleCurvesZoneProps = StoreProps & { variant?: "classic" | "july", toolbarStart?: ReactNode };

const ConsoleCurvesZone = memo(function ConsoleCurvesZone({ store, variant = "classic", toolbarStart }: ConsoleCurvesZoneProps) {
  const frames = useStoreSelector(store, selectFrames);
  const buffer = useConsoleWaveforms(frames);

  return (
    <CurvesZone
      buffer={buffer}
      status={frames.status}
      statusMessage={frames.statusMessage ?? CONSOLE_NO_DATA_MESSAGE}
      variant={variant}
      toolbarStart={toolbarStart}
    />
  );
});

type ConsoleControlsZoneProps = StoreProps & {
  readOnly: boolean
  readOnlyReason: string | undefined
  variant: ConsoleVariant
  applicability: ModeParameterTable | undefined
};

const ConsoleControlsZone = memo(function ConsoleControlsZone({ store, readOnly, readOnlyReason, variant, applicability }: ConsoleControlsZoneProps) {
  const settings = useStoreSelector(store, selectSettings);
  const mode = useStoreSelector(store, selectMode);
  const limits = useStoreSelector(store, selectLimits);
  const onConfirm = useStoreSelector(store, selectOnConfirm);
  const onCancel = useStoreSelector(store, selectOnCancel);
  const onProposeChange = useStoreSelector(store, selectOnProposeChange);
  const onPendingChange = useStoreSelector(store, selectOnPendingChange);
  const pendingResetKey = useStoreSelector(store, selectPendingResetKey);

  return (
    <ConsoleControls
      settings={settings}
      mode={mode}
      limits={limits}
      readOnly={readOnly}
      variant={variant}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onProposeChange={onProposeChange}
      onPendingChange={onPendingChange}
      readOnlyReason={readOnlyReason}
      pendingResetKey={pendingResetKey}
      {...(applicability ? { applicability } : {})}
    />
  );
});

type SlotRenderProps = StoreProps & {
  slot: ConsoleSlot | undefined
  readOnly: boolean
  readOnlyReason: string | undefined
};

/** A node slot renders as is; a function slot renders inside its own subscribed host. */
function renderSlot({ store, slot, readOnly, readOnlyReason }: SlotRenderProps): ReactNode {
  if (typeof slot === "function") {
    return <SlotHost store={store} render={slot} readOnly={readOnly} readOnlyReason={readOnlyReason} />;
  }

  return slot;
}

type ConsoleViewProps = VentilatorConsoleProps & {
  store: ConsoleAdapterStore
  /** What the shell depends on (selectLayout). */
  shell: ConsoleLayout
};

/** v1.7: the July three-column layout over the same zones and one pending store per console. */
function JulyConsoleView({
  store,
  shell: layout,
  metricRanges,
  patientRanges,
  header,
  alarmsSlot,
  modeSlot,
  controlsSlot,
  maneuversSlot,
  applicability,
  clock,
  beeperFactory,
  confirmSummary = false,
  leftTop,
  assistSlot,
  curvesToolbarStart,
  curvesFooter,
  rightFooter,
  cards,
  cardsLockedReason,
  renderAlarmHelp,
  onStop,
  className,
}: ConsoleViewProps) {
  const [pending] = useState(createPendingControlsStore);
  const [summary] = useState(() => createExternalStore(false));
  const [undo] = useState(() => createExternalStore<ConsoleConfirmation | null>(null));
  const reasonId = useId();
  const alertsId = useId();
  const { readOnly, readOnlyReason } = layout;
  const describedBy = readOnly && readOnlyReason ? reasonId : undefined;
  const slotProps = { store, readOnly, readOnlyReason };
  const zone = { store, pending, readOnly, describedBy, applicability };
  const controls = controlsSlot !== null;
  const builtInAlarms = alarmsSlot === undefined;
  const alerts = { store, pending, metricRanges, drawerId: alertsId };
  const alarms = builtInAlarms
    ? <JulyAlarmsZone {...alerts} readOnly={readOnly} clock={clock} beeperFactory={beeperFactory} renderAlarmHelp={renderAlarmHelp} />
    : renderSlot({ ...slotProps, slot: alarmsSlot });
  const mode = renderSlot({ ...slotProps, slot: modeSlot });
  const maneuvers = layout.maneuvers ? renderSlot({ ...slotProps, slot: maneuversSlot }) : null;
  const confirmOptions = { store, pending, readOnly, confirmSummary, summary, undo };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (controls) {
      handleJulyKeyDown(event, confirmOptions);
    }
  };

  return (
    <ConsoleDrawersProvider>
      <section
        className={cx(julyStyles.root, className)}
        aria-label={CONSOLE_COPY.label}
        data-layout="july"
        data-readonly={readOnly}
        onKeyDown={onKeyDown}
      >
        <p className={cx(julyStyles.notice)} role="note">{CONSOLE_COPY.smallScreen}</p>
        {header ? <div className={cx(julyStyles.header)}>{header}</div> : null}
        <div className={cx(julyStyles.grid)}>
          <section className={cx(julyStyles.column, julyStyles.left)} aria-label={CONSOLE_COPY.values}>
            <div className={cx(julyStyles.logos)}>
              <Image {...LOGO_VENTYLAB} alt={CONSOLE_COPY.logoVentyLab} className={cx(julyStyles.logoVentyLab)} />
              <Image {...LOGO_UNIVALLE} alt={CONSOLE_COPY.logoUnivalle} unoptimized className={cx(julyStyles.logoUnivalle)} />
            </div>
            {leftTop}
            {controls ? <JulyConfirmActions {...confirmOptions} readOnlyReason={readOnlyReason} reasonId={reasonId} onStop={onStop} /> : null}
            <MonitorCards
              store={store}
              metricRanges={metricRanges}
              patientRanges={patientRanges}
              showPatient={layout.showPatientMonitor}
              controller={cards}
              lockedReason={cardsLockedReason}
            />
          </section>
          <div className={cx(julyStyles.column, julyStyles.centre)}>
            {controls ? <JulyInputRow {...zone} /> : null}
            {alarms}
            <ConsoleCurvesZone store={store} variant="july" toolbarStart={curvesToolbarStart} />
            {curvesFooter}
          </div>
          <aside className={cx(julyStyles.column, julyStyles.right)} aria-label={CONSOLE_COPY.controls}>
            <p className={cx(julyStyles.rightHead)}>
              <span>{CONSOLE_COPY.mode}</span>
              <strong>{layout.modeLabel}</strong>
              {readOnly ? <span className={cx(julyStyles.readOnly)}>{CONSOLE_COPY.readOnly}</span> : null}
            </p>
            {mode}
            {controls ? (
              <>
                <JulyModeToggle {...zone} assist={assistSlot} />
                <JulyTiming {...zone} />
                <JulyRate {...zone} />
                <JulyMoreParameters {...zone} />
              </>
            ) : assistSlot}
            {maneuvers}
            {builtInAlarms ? <JulyMechanicsAlerts {...alerts} /> : null}
            {rightFooter}
            {controls && !readOnly ? <p className={cx(julyStyles.hint)}>{JULY_CONTROLS_COPY.keyboardHint}</p> : null}
          </aside>
        </div>
      </section>
    </ConsoleDrawersProvider>
  );
}

/** The classic layout (unchanged). */
function ClassicConsoleView({
  store,
  shell: layout,
  metricRanges,
  patientRanges,
  header,
  alarmsSlot,
  modeSlot,
  controlsSlot,
  maneuversSlot,
  variant = "live",
  applicability,
  clock,
  beeperFactory,
  className,
}: ConsoleViewProps) {
  const { readOnly, readOnlyReason } = layout;
  const slotProps = { store, readOnly, readOnlyReason };
  const alarms = alarmsSlot === undefined
    ? <ConsoleAlarms store={store} readOnly={readOnly} clock={clock} beeperFactory={beeperFactory} />
    : renderSlot({ ...slotProps, slot: alarmsSlot });
  const mode = renderSlot({ ...slotProps, slot: modeSlot });
  const controls = controlsSlot === undefined
    ? (
      <ConsoleControlsZone
        store={store}
        readOnly={readOnly}
        readOnlyReason={readOnlyReason}
        variant={variant}
        applicability={applicability}
      />
    )
    : renderSlot({ ...slotProps, slot: controlsSlot });
  const maneuvers = layout.maneuvers ? renderSlot({ ...slotProps, slot: maneuversSlot }) : null;

  return (
    <section className={cx(styles.console, className)} aria-label={CONSOLE_COPY.label} data-readonly={readOnly}>
      <p className={cx(styles.notice)} role="note">{CONSOLE_COPY.smallScreen}</p>
      <header className={cx(styles.header)}>
        <div className={cx(styles.headerContent)}>{header}</div>
        <p className={cx(styles.mode)}>
          <span className={cx(styles.modeLabel)}>{CONSOLE_COPY.mode}</span>
          <span className={cx(styles.modeValue)}>{layout.modeLabel}</span>
        </p>
        {readOnly ? (
          <p className={cx(styles.readOnlyState)}>
            <span className={cx(styles.readOnly)}>{CONSOLE_COPY.readOnly}</span>
            {readOnlyReason ? <span className={cx(styles.readOnlyReason)}>{readOnlyReason}</span> : null}
          </p>
        ) : null}
      </header>
      {alarms ? <div className={cx(styles.alarms)}>{alarms}</div> : null}
      <ConsoleMetricsZone store={store} ranges={metricRanges} />
      <div className={cx(styles.centre)}>
        <ConsoleCurvesZone store={store} />
        {layout.showPatientMonitor ? <ConsolePatientZone store={store} ranges={patientRanges} /> : null}
      </div>
      {mode || controls || maneuvers ? (
        <aside className={cx(styles.controls)} aria-label={CONSOLE_COPY.controls}>
          {mode}
          {controls}
          {maneuvers}
        </aside>
      ) : null}
    </section>
  );
}

function VentilatorConsoleView(props: VentilatorConsoleProps) {
  const { adapter } = props;
  // A store keeps its identity; a plain object gets a static store per object (its owner re-renders it).
  const store = useMemo(() => (isConsoleAdapterStore(adapter) ? adapter : staticConsoleStore(adapter)), [adapter]);
  const shell = useStoreSelector(store, selectLayout, sameData);

  return props.layout === "july"
    ? <JulyConsoleView {...props} store={store} shell={shell} />
    : <ClassicConsoleView {...props} store={store} shell={shell} />;
}

/** Memoised: with a store adapter and stable props, a new snapshot never re-renders the console shell by itself. */
export const VentilatorConsole = memo(VentilatorConsoleView);
