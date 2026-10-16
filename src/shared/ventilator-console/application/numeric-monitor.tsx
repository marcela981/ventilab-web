/*
* Funcionalidad: Console numeric monitor
* Descripción: Numeric monitoring zone of the ventilator console: one tile per console metric (Ppico, Pplat, PEEP total, auto-PEEP, ΔP, Vte, Vt/kg PBW, VE, FR total, I:E, FiO2, potencia mecánica) in config order, each with its unit and an out-of-range highlight from the config default range or the consumer override. Metrics the source does not provide show "—". Depends on React, the value tile and the console config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { CONSOLE_METRIC_IDS, CONSOLE_METRICS } from "./config/console.config";
import type { ConsoleMetricId } from "./config/console.config";
import { resolveNormalRange } from "./console-format";
import type { RangeOverrides } from "./console-format";
import type { ConsoleMetrics } from "./ventilator-console.entity";
import { ValueTile } from "./value-tile";
import styles from "../UI/console-monitor.module.css";

export const NUMERIC_MONITOR_TITLE = "Monitorización";

export type NumericMonitorProps = {
  metrics: ConsoleMetrics
  ranges?: RangeOverrides<ConsoleMetricId> | undefined
  className?: string
};

export function NumericMonitor({ metrics, ranges, className }: NumericMonitorProps) {
  return (
    <section className={cx(styles.zone, className)} aria-label={NUMERIC_MONITOR_TITLE}>
      <h2 className={cx(styles.title)}>{NUMERIC_MONITOR_TITLE}</h2>
      <dl className={cx(styles.grid)}>
        {CONSOLE_METRIC_IDS.map((id) => (
          <ValueTile
            key={id}
            definition={CONSOLE_METRICS[id]}
            value={metrics[id]}
            range={resolveNormalRange(id, CONSOLE_METRICS, ranges)}
          />
        ))}
      </dl>
    </section>
  );
}
