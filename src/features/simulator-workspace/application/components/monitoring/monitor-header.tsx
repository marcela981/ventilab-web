/*
* Funcionalidad: Monitor header (mode selector and status chip)
* Descripción: Top row of the Monitoreo tab (W6, Bloque 1): the Digital/Real mode selector (a two-button group with
*   aria-pressed) and the status chip of FLUJOS_JULIO a.6 ("Sin señal", "Simulando", "Conectado (Físico)"), whose
*   value is derived from low-frequency state by the panel. Depends on React, the monitor status entity and the
*   monitoring styles.
* Versión: 0.1
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

export type MonitorHeaderProps = {
  mode: MonitorMode
  onModeChange: (mode: MonitorMode) => void
  status: MonitorStatus
};

export const MonitorHeader = memo(function MonitorHeader({ mode, onModeChange, status }: MonitorHeaderProps) {
  return (
    <div className={cx(styles.header)}>
      <div className={cx(styles.modeSelector)} role="group" aria-label={MONITOR_HEADER_COPY.modeLabel}>
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
      <p className={cx(styles.statusChip)} data-status={status} role="status" aria-label={MONITOR_HEADER_COPY.statusLabel}>
        <span className={cx(styles.statusDot)} aria-hidden="true" />
        {MONITOR_STATUS_LABELS[status]}
      </p>
    </div>
  );
});
