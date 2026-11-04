/*
* Funcionalidad: Monitor value cards
* Descripción: The July value list of the left column (`list "Valores del monitor"`): one card per console metric and patient vital in the July order of MONITOR_CARD_IDS (21 cards: Ppico, Pmedia, PEEP, Flujo máx, Flujo mín, Vte, then the other metrics and the vitals). It replaces the classic numeric and patient monitors in the July layout: a vital shows only when the source provides it (and the source has a patient monitor), a metric always (— without a value), with the "derivada" mark, the source names of a reading with provenance, the out-of-range flag and the vital trend sparkline. The list is an isolated zone that reads the metrics and the patient through selectors of the adapter store, and every card is a memo of primitive props, so a new snapshot re-renders only the cards whose value changed and never the curves or the controls. v0.1 (Bloque 5, C3): first version (fixed order, all visible). Depends on React, the console config, the value tile, the sparkline and the console store.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { memo, useMemo } from "react";
import { cx } from "@shared/lib/class-names";
import { CONSOLE_METRICS, MONITOR_CARD_IDS, PATIENT_VITAL_IDS, PATIENT_VITALS } from "./config/console.config";
import type { ConsoleMetricId, MonitorCardId, NormalRange, PatientVitalId, ValueDefinition } from "./config/console.config";
import { resolveNormalRange } from "./console-format";
import type { RangeOverrides } from "./console-format";
import { useStoreSelector } from "./console-store";
import type { ConsoleAdapterStore } from "./console-store";
import { Sparkline } from "./patient-monitor";
import { ValueTile } from "./value-tile";
import { isDerivedMetric, metricNumber } from "./ventilator-console.entity";
import type { VentilatorConsoleAdapter } from "./ventilator-console.entity";
import styles from "../UI/july-layout.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const MONITOR_CARDS_COPY = {
  list: "Valores del monitor",
} as const;

const VITALS: ReadonlySet<string> = new Set(PATIENT_VITAL_IDS);

export function isVitalCard(id: MonitorCardId): id is PatientVitalId {
  return VITALS.has(id);
}

const selectMetrics = (adapter: VentilatorConsoleAdapter) => adapter.metrics;
const selectMetricRanges = (adapter: VentilatorConsoleAdapter) => adapter.ranges?.metrics;
const selectPatient = (adapter: VentilatorConsoleAdapter) => adapter.patient;
const selectPatientRanges = (adapter: VentilatorConsoleAdapter) => adapter.ranges?.patient;

function mergeRanges<K extends string>(props: RangeOverrides<K> | undefined, source: RangeOverrides<K> | undefined): RangeOverrides<K> | undefined {
  return source ? { ...props, ...source } : props;
}

type MonitorCardProps = {
  id: MonitorCardId
  value: number | null | undefined
  derived: boolean
  /** Source names of a reading with provenance (replace the console names). */
  label: string | undefined
  description: string | undefined
  range: NormalRange | null
  trend: readonly number[] | undefined
};

const MonitorCard = memo(function MonitorCard({ id, value, derived, label, description, range, trend }: MonitorCardProps) {
  const vital = isVitalCard(id);
  const base: ValueDefinition = vital ? PATIENT_VITALS[id] : CONSOLE_METRICS[id];
  const definition = label === undefined && description === undefined
    ? base
    : { ...base, label: label ?? base.label, description: description ?? base.description };

  return (
    <li className={cx(styles.card)} data-card={id}>
      <dl className={cx(styles.cardList)}>
        <ValueTile definition={definition} value={value} range={range} derived={derived} layout="july" kind={vital ? "vital" : "metric"}>
          {vital && trend !== undefined && trend.length > 1 ? <Sparkline values={trend} label={definition.label} /> : null}
        </ValueTile>
      </dl>
    </li>
  );
});

export type MonitorCardsProps = {
  store: ConsoleAdapterStore
  metricRanges?: RangeOverrides<ConsoleMetricId> | undefined
  patientRanges?: RangeOverrides<PatientVitalId> | undefined
  /** `false`: the source has no patient monitor, no vital card shows. */
  showPatient: boolean
  /** Card ids in display order (default MONITOR_CARD_IDS). */
  order?: readonly MonitorCardId[]
};

/** The value cards of the July left column. */
export const MonitorCards = memo(function MonitorCards({ store, metricRanges, patientRanges, showPatient, order = MONITOR_CARD_IDS }: MonitorCardsProps) {
  const metrics = useStoreSelector(store, selectMetrics);
  const patient = useStoreSelector(store, selectPatient);
  const sourceMetricRanges = useStoreSelector(store, selectMetricRanges);
  const sourcePatientRanges = useStoreSelector(store, selectPatientRanges);
  const metricRangesMerged = useMemo(() => mergeRanges(metricRanges, sourceMetricRanges), [metricRanges, sourceMetricRanges]);
  const patientRangesMerged = useMemo(() => mergeRanges(patientRanges, sourcePatientRanges), [patientRanges, sourcePatientRanges]);

  return (
    <ul className={cx(styles.cards)} aria-label={MONITOR_CARDS_COPY.list}>
      {order.map((id) => {
        if (isVitalCard(id)) {
          const value = patient.values[id];

          return showPatient && value !== undefined ? (
            <MonitorCard
              key={id}
              id={id}
              value={value}
              derived={false}
              label={undefined}
              description={undefined}
              range={resolveNormalRange(id, PATIENT_VITALS, patientRangesMerged)}
              trend={patient.trends?.[id]}
            />
          ) : null;
        }

        const reading = metrics[id];
        const named = reading !== null && typeof reading === "object" ? reading : undefined;

        return (
          <MonitorCard
            key={id}
            id={id}
            value={metricNumber(reading)}
            derived={isDerivedMetric(reading)}
            label={named?.label}
            description={named?.description}
            range={resolveNormalRange(id, CONSOLE_METRICS, metricRangesMerged)}
            trend={undefined}
          />
        );
      })}
    </ul>
  );
});
