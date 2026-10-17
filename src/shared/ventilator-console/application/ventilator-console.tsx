/*
* Funcionalidad: VentilatorConsole
* Descripción: Generic ventilator console screen composed from an adapter (it does not know whether data comes from the simulator, a replay or a real ventilator): header with the current mode and a read-only badge, an alarms slot across the top, numeric monitoring in the left column, the curves zone (and the patient monitor below it) in the centre and the mode/controls slots on the right, like a bedside ventilator. Slots accept a node or a render function that receives the adapter and the read-only flag; an omitted alarms slot renders the AlarmsBar and an omitted controls slot renders ConsoleControls (mode selector + pending→confirm parameters) from the adapter, while `null` hides them. An optional maneuvers slot renders only when the adapter declares the maneuvers capability. `variant` switches the controls between a running ventilator ("Confirmar") and the case editor configuration ("Aplicar"). Uses the dark console surface tokens; below 1024 px the zones stack and a Spanish notice recommends a horizontal tablet or a computer. Depends on React, the console zones, the controls and alarms bar, useConsoleWaveforms and the console layout styles. v1.2: normal ranges merge per key as config defaults < range props < `adapter.ranges`; the curves keep their subscription across adapter rebuilds for the same frame source (see useConsoleWaveforms). v1.3: the built-in controls report pending edits through `adapter.onPendingChange`. v1.4 (generic source state): `capabilities.patientMonitor: false` hides the patient monitor zone; a frame source with `status: "no-data"` greys the curves under an overlay and makes the console read-only (the slots receive `readOnly: true`) until it is live again; the read-only reason (`permissions.readOnlyReason`, else the no-data message) is shown next to the "Solo lectura" badge and describes the built-in disabled controls. v1.5: the built-in controls receive `permissions.pendingResetKey` (drop unconfirmed edits when it changes).
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { CONSOLE_NO_DATA_MESSAGE } from "./config/console.config";
import type { ConsoleMetricId, PatientVitalId } from "./config/console.config";
import type { ModeParameterTable } from "./config/console-controls.config";
import { AlarmsBar } from "./alarms-bar";
import { ConsoleControls } from "./console-controls";
import type { ConsoleVariant } from "./console-controls";
import type { RangeOverrides } from "./console-format";
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
  adapter: VentilatorConsoleAdapter
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

function renderSlot(slot: ConsoleSlot | undefined, context: ConsoleSlotContext): ReactNode {
  return typeof slot === "function" ? slot(context) : slot;
}

function renderSlotOr(slot: ConsoleSlot | undefined, context: ConsoleSlotContext, fallback: () => ReactNode): ReactNode {
  return slot === undefined ? fallback() : renderSlot(slot, context);
}

export function VentilatorConsole({
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
  const buffer = useConsoleWaveforms(adapter.frames);
  const noData = adapter.frames.status === "no-data";
  const readOnly = !adapter.permissions.canControl || noData;
  const noDataMessage = adapter.frames.statusMessage ?? CONSOLE_NO_DATA_MESSAGE;
  const readOnlyReason = readOnly ? adapter.permissions.readOnlyReason ?? (noData ? noDataMessage : undefined) : undefined;
  const context: ConsoleSlotContext = { adapter, readOnly, readOnlyReason };
  const showPatientMonitor = adapter.capabilities?.patientMonitor !== false;
  const modeLabel = adapter.mode.options.find((option) => option.id === adapter.mode.current)?.label ?? adapter.mode.current;
  const alarms = renderSlotOr(alarmsSlot, context, () => (
    <AlarmsBar
      alarms={adapter.alarms}
      history={adapter.alarmHistory}
      limits={adapter.alarmLimits}
      onLimitsChange={adapter.onAlarmLimitsChange}
      readOnly={readOnly}
      clock={clock}
      beeperFactory={beeperFactory}
    />
  ));
  const mode = renderSlot(modeSlot, context);
  const controls = renderSlotOr(controlsSlot, context, () => (
    <ConsoleControls
      settings={adapter.settings}
      mode={adapter.mode}
      limits={adapter.limits}
      readOnly={readOnly}
      variant={variant}
      onConfirm={adapter.onConfirm}
      onCancel={adapter.onCancel}
      onProposeChange={adapter.onProposeChange}
      onPendingChange={adapter.onPendingChange}
      readOnlyReason={readOnlyReason}
      pendingResetKey={adapter.permissions.pendingResetKey}
      {...(applicability ? { applicability } : {})}
    />
  ));
  const maneuvers = adapter.capabilities?.maneuvers === true ? renderSlot(maneuversSlot, context) : null;

  return (
    <section className={cx(styles.console, className)} aria-label={CONSOLE_COPY.label} data-readonly={readOnly}>
      <p className={cx(styles.notice)} role="note">{CONSOLE_COPY.smallScreen}</p>
      <header className={cx(styles.header)}>
        <div className={cx(styles.headerContent)}>{header}</div>
        <p className={cx(styles.mode)}>
          <span className={cx(styles.modeLabel)}>{CONSOLE_COPY.mode}</span>
          <span className={cx(styles.modeValue)}>{modeLabel}</span>
        </p>
        {readOnly ? (
          <p className={cx(styles.readOnlyState)}>
            <span className={cx(styles.readOnly)}>{CONSOLE_COPY.readOnly}</span>
            {readOnlyReason ? <span className={cx(styles.readOnlyReason)}>{readOnlyReason}</span> : null}
          </p>
        ) : null}
      </header>
      {alarms ? <div className={cx(styles.alarms)}>{alarms}</div> : null}
      <NumericMonitor metrics={adapter.metrics} ranges={mergeRanges(metricRanges, adapter.ranges?.metrics)} className={cx(styles.metrics)} />
      <div className={cx(styles.centre)}>
        <CurvesZone buffer={buffer} status={adapter.frames.status} statusMessage={noDataMessage} />
        {showPatientMonitor ? (
          <PatientMonitor patient={adapter.patient} ranges={mergeRanges(patientRanges, adapter.ranges?.patient)} />
        ) : null}
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
