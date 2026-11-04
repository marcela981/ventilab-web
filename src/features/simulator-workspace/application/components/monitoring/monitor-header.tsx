/*
* Funcionalidad: Monitor header (mode selector and status chip)
* Descripción: Top row of the Monitoreo tab (W6, Bloque 1): the Digital/Real mode selector (a two-button group with
*   aria-pressed) and the status chip of FLUJOS_JULIO a.6 ("Sin señal", "Simulando", "Conectado (Físico)"), whose
*   value is derived from low-frequency state by the panel. Depends on React, the monitor status entity and the
*   monitoring styles.
*   v0.2 (Bloque 5, C7): the two pieces are also exported on their own for the July layout: MonitorModeSelector
*   (`placement="column"`: the compact "Modo del monitor" block of the console left column, in July's switch
*   position) and MonitorStatusChip (first item of the curves toolbar). MonitorHeader keeps both in one row for the
*   states without a console (guides, waiting, notices).
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { memo } from "react";
import { cx } from "@shared/lib/class-names";
import { MONITOR_STATUS_LABELS } from "../../entities/monitor-status.entity";
import type { MonitorMode, MonitorStatus } from "../../entities/monitor-status.entity";
import styles from "../../../UI/monitoring/monitoring-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const MONITOR_HEADER_COPY = {
  modeLabel: "Modo del monitor",
  modes: { digital: "Digital", real: "Real" } satisfies Record<MonitorMode, string>,
  statusLabel: "Estado de la señal",
} as const;

const MODES: readonly MonitorMode[] = ["digital", "real"];

export type MonitorModeSelectorProps = {
  mode: MonitorMode
  onModeChange: (mode: MonitorMode) => void
  /** `column`: the compact July block of the console left column, with its caption. */
  placement?: "row" | "column"
};

export const MonitorModeSelector = memo(function MonitorModeSelector({ mode, onModeChange, placement = "row" }: MonitorModeSelectorProps) {
  const group = (
    <div className={cx(styles.modeSelector)} data-placement={placement} role="group" aria-label={MONITOR_HEADER_COPY.modeLabel}>
      {MODES.map((value) => (
        <button
          key={value}
          type="button"
          className={cx(styles.modeButton)}
          aria-pressed={value === mode}
          onClick={() => onModeChange(value)}
        >
          {MONITOR_HEADER_COPY.modes[value]}
        </button>
      ))}
    </div>
  );

  if (placement === "row") {
    return group;
  }

  return (
    <div className={cx(styles.modeBlock)}>
      <p className={cx(styles.modeCaption)} aria-hidden="true">{MONITOR_HEADER_COPY.modeLabel}</p>
      {group}
    </div>
  );
});

export const MonitorStatusChip = memo(function MonitorStatusChip({ status }: { status: MonitorStatus }) {
  return (
    <p className={cx(styles.statusChip)} data-status={status} role="status" aria-label={MONITOR_HEADER_COPY.statusLabel}>
      <span className={cx(styles.statusDot)} aria-hidden="true" />
      {MONITOR_STATUS_LABELS[status]}
    </p>
  );
});

export type MonitorHeaderProps = {
  mode: MonitorMode
  onModeChange: (mode: MonitorMode) => void
  status: MonitorStatus
};

export const MonitorHeader = memo(function MonitorHeader({ mode, onModeChange, status }: MonitorHeaderProps) {
  return (
    <div className={cx(styles.header)}>
      <MonitorModeSelector mode={mode} onModeChange={onModeChange} />
      <MonitorStatusChip status={status} />
    </div>
  );
});
