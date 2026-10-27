/*
* Funcionalidad: VentilatorConsole
* Descripción: Generic ventilator console screen composed from an adapter (it does not know whether data comes from the simulator, a replay or a real ventilator): header with the current mode and a read-only badge, an alarms slot across the top, numeric monitoring in the left column, the curves zone (and the patient monitor below it) in the centre and the mode/controls slots on the right, like a bedside ventilator. Slots accept a node or a render function that receives the adapter and the read-only flag; an omitted alarms slot renders the AlarmsBar and an omitted controls slot renders ConsoleControls (mode selector + pending→confirm parameters) from the adapter, while `null` hides them. An optional maneuvers slot renders only when the adapter declares the maneuvers capability. `variant` switches the controls between a running ventilator ("Confirmar") and the case editor configuration ("Aplicar"). Uses the dark console surface tokens; below 1024 px the zones stack and a Spanish notice recommends a horizontal tablet or a computer. Depends on React, the console zones, the controls and alarms bar, useConsoleWaveforms, the console store and the console layout styles. v1.2: normal ranges merge per key as config defaults < range props < `adapter.ranges`; the curves keep their subscription across adapter rebuilds for the same frame source (see useConsoleWaveforms). v1.3: the built-in controls report pending edits through `adapter.onPendingChange`. v1.4 (generic source state): `capabilities.patientMonitor: false` hides the patient monitor zone; a frame source with `status: "no-data"` greys the curves under an overlay and makes the console read-only (the slots receive `readOnly: true`) until it is live again; the read-only reason (`permissions.readOnlyReason`, else the no-data message) is shown next to the "Solo lectura" badge and describes the built-in disabled controls. v1.5: the built-in controls receive `permissions.pendingResetKey` (drop unconfirmed edits when it changes). v1.6 (W2, Bloque 1): `adapter` may be a `ConsoleAdapterStore` (stable identity, immutable snapshots at ≤ 4 Hz); every zone (alarms, numeric monitor, curves, patient monitor, controls, function slots) is a memoised component that reads only its slice with useSyncExternalStore, so a new snapshot re-renders only the zones whose slice changed and the console shell re-renders only when its layout (mode, read-only state, zone visibility) changes. A plain adapter object still works (it is wrapped in a static store per object).
* Versión: 1.6
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { memo, useMemo } from "react";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { CONSOLE_NO_DATA_MESSAGE } from "./config/console.config";
import type { ConsoleMetricId, PatientVitalId } from "./config/console.config";
import type { ModeParameterTable } from "./config/console-controls.config";
import { AlarmsBar } from "./alarms-bar";
import { ConsoleControls } from "./console-controls";
import type { ConsoleVariant } from "./console-controls";
import type { RangeOverrides } from "./console-format";
import { isConsoleAdapterStore, sameData, staticConsoleStore, useStoreSelector } from "./console-store";
import type { ConsoleAdapterStore } from "./console-store";
import type { AlarmBeeperFactory, ConsoleClock } from "./use-console-alarms";
import { CurvesZone } from "./curves-zone";
import { NumericMonitor } from "./numeric-monitor";
import { PatientMonitor } from "./patient-monitor";
import { useConsoleWaveforms } from "./use-console-waveforms";
import type { VentilatorConsoleAdapter } from "./ventilator-console.entity";
import styles from "../UI/ventilator-console.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const CONSOLE_COPY = {
  label: "Consola del ventilador",
  mode: "Modo",
  readOnly: "Solo lectura",
  smallScreen: "Para usar la consola con comodidad, gira la tablet en horizontal o abre esta página en un computador.",
  controls: "Controles",
} as const;

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

const ConsoleCurvesZone = memo(function ConsoleCurvesZone({ store }: StoreProps) {
  const frames = useStoreSelector(store, selectFrames);
  const buffer = useConsoleWaveforms(frames);

  return <CurvesZone buffer={buffer} status={frames.status} statusMessage={frames.statusMessage ?? CONSOLE_NO_DATA_MESSAGE} />;
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

function VentilatorConsoleView({
  adapter,
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
}: VentilatorConsoleProps) {
  // A store keeps its identity; a plain object gets a static store per object (its owner re-renders it).
  const store = useMemo(() => (isConsoleAdapterStore(adapter) ? adapter : staticConsoleStore(adapter)), [adapter]);
  const layout = useStoreSelector(store, selectLayout, sameData);
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

/** Memoised: with a store adapter and stable props, a new snapshot never re-renders the console shell by itself. */
export const VentilatorConsole = memo(VentilatorConsoleView);
