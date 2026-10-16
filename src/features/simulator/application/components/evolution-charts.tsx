/*
* Funcionalidad: Evolution charts
* Descripción: Evolution of the key metrics of a session (SpO2, PaCO2, plateau pressure, Vt/kg PBW) rebuilt by the
*   local replay in this browser: one shared accessible BarChart per metric, with the sampled simulated times as
*   categories and a visually hidden table for screen readers (provided by the chart). A metric with no value in any
*   sampled snapshot is left out. The charts are informative; the official result is the server summary. Depends on
*   @shared/charts, the result entities, the time format of the time controls and the result CSS Module.
*   v1.1: one shared LineChart per metric (a line over the evenly sampled simulated times; a missing value is a gap)
*   instead of bars, which read as a trend.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import { LineChart } from "@shared/charts";
import { cx } from "@shared/lib/class-names";
import type { Evolution } from "../entities/sim-result.entity";
import { formatSimTime } from "./time-controls";
import styles from "../../UI/session-result.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const EVOLUTION_COPY = {
  timeAxis: "Tiempo simulado",
  empty: "La repetición no tiene suficientes datos para graficar la evolución.",
  description: "Valores de la repetición local en este navegador.",
} as const;

export function EvolutionCharts({ evolution }: { evolution: Evolution }) {
  const labels = useMemo(() => evolution.timesMs.map(formatSimTime), [evolution.timesMs]);
  // Stable datasets: the chart rebuilds whenever its data props change identity.
  const charts = useMemo(
    () => evolution.series
      .filter((item) => item.values.some((value) => value !== null))
      .map((item) => ({ ...item, datasets: [{ label: item.label, values: item.values, tone: "primary" as const }] })),
    [evolution.series],
  );

  if (labels.length === 0 || charts.length === 0) {
    return <p className={cx(styles.muted)}>{EVOLUTION_COPY.empty}</p>;
  }

  return (
    <div className={cx(styles.charts)}>
      {charts.map((item) => (
        <LineChart
          key={item.id}
          className={cx(styles.chart)}
          title={`${item.label} (${item.unit})`}
          description={EVOLUTION_COPY.description}
          labels={labels}
          datasets={item.datasets}
          categoryAxisLabel={EVOLUTION_COPY.timeAxis}
          valueAxisLabel={item.unit}
        />
      ))}
    </div>
  );
}
