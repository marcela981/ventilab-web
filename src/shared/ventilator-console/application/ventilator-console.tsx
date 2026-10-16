/*
* Funcionalidad: VentilatorConsole
* Descripción: Generic ventilator console screen composed from an adapter (it does not know whether data comes from the simulator, a replay or a real ventilator): header with the current mode and a read-only badge, an alarms slot across the top, numeric monitoring in the left column, the curves zone (and the patient monitor below it) in the centre and the mode/controls slots on the right, like a bedside ventilator. Slots accept a node or a render function that receives the adapter and the read-only flag (used by the T4 controls and alarms bar). Uses the dark console surface tokens; below 1024 px the zones stack and a Spanish notice recommends a horizontal tablet or a computer. Depends on React, the console zones, useConsoleWaveforms and the console layout styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import type { ConsoleMetricId, PatientVitalId } from "./config/console.config";
import type { RangeOverrides } from "./console-format";
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
  readOnly: boolean
};

export type ConsoleSlot = ReactNode | ((context: ConsoleSlotContext) => ReactNode);

export type VentilatorConsoleProps = {
  adapter: VentilatorConsoleAdapter
  /** Overrides of the metric normal ranges; `null` disables the highlight for that metric. */
  metricRanges?: RangeOverrides<ConsoleMetricId>
  patientRanges?: RangeOverrides<PatientVitalId>
  /** Optional heading content, e.g. the case name and PBW. */
  header?: ReactNode
  alarmsSlot?: ConsoleSlot
  modeSlot?: ConsoleSlot
  controlsSlot?: ConsoleSlot
  className?: string
};

function renderSlot(slot: ConsoleSlot | undefined, context: ConsoleSlotContext): ReactNode {
  return typeof slot === "function" ? slot(context) : slot;
}

export function VentilatorConsole({
  adapter,
  metricRanges,
  patientRanges,
  header,
  alarmsSlot,
  modeSlot,
  controlsSlot,
  className,
}: VentilatorConsoleProps) {
  const buffer = useConsoleWaveforms(adapter.frames);
  const readOnly = !adapter.permissions.canControl;
  const context: ConsoleSlotContext = { adapter, readOnly };
  const modeLabel = adapter.mode.options.find((option) => option.id === adapter.mode.current)?.label ?? adapter.mode.current;
  const alarms = renderSlot(alarmsSlot, context);
  const mode = renderSlot(modeSlot, context);
  const controls = renderSlot(controlsSlot, context);

  return (
    <section className={cx(styles.console, className)} aria-label={CONSOLE_COPY.label} data-readonly={readOnly}>
      <p className={cx(styles.notice)} role="note">{CONSOLE_COPY.smallScreen}</p>
      <header className={cx(styles.header)}>
        <div className={cx(styles.headerContent)}>{header}</div>
        <p className={cx(styles.mode)}>
          <span className={cx(styles.modeLabel)}>{CONSOLE_COPY.mode}</span>
          <span className={cx(styles.modeValue)}>{modeLabel}</span>
        </p>
        {readOnly ? <span className={cx(styles.readOnly)}>{CONSOLE_COPY.readOnly}</span> : null}
      </header>
      {alarms ? <div className={cx(styles.alarms)}>{alarms}</div> : null}
      <NumericMonitor metrics={adapter.metrics} ranges={metricRanges} className={cx(styles.metrics)} />
      <div className={cx(styles.centre)}>
        <CurvesZone buffer={buffer} />
        <PatientMonitor patient={adapter.patient} ranges={patientRanges} />
      </div>
      {mode || controls ? (
        <aside className={cx(styles.controls)} aria-label={CONSOLE_COPY.controls}>
          {mode}
          {controls}
        </aside>
      ) : null}
    </section>
  );
}
