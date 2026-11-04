/*
* Funcionalidad: Monitor value cards
* Descripción: The July value list of the left column (`list "Valores del monitor"`): one card per console metric and patient vital in the July order of MONITOR_CARD_IDS (21 cards: Ppico, Pmedia, PEEP, Flujo máx, Flujo mín, Vte, then the other metrics and the vitals). It replaces the classic numeric and patient monitors in the July layout: a vital shows only when the source provides it (and the source has a patient monitor), a metric always (— without a value), with the "derivada" mark, the source names of a reading with provenance, the out-of-range flag and the vital trend sparkline. The list is an isolated zone that reads the metrics and the patient through selectors of the adapter store, and every card is a memo of primitive props, so a new snapshot re-renders only the cards whose value changed and never the curves or the controls. v0.2 (Bloque 5, C5): the order and the hidden cards come from a `MonitorCardsController` (an external store: the persisted per-user preference of the host, else an in-memory one per console), read through a selector, so adjusting never re-renders the console. "Ajustar" (aria-pressed) mounts the drag-and-drop list (monitor-cards-adjust.tsx, @hello-pangea/dnd, loaded on demand) only while adjusting, with "Mover / Subir / Bajar / Ocultar|Mostrar <tarjeta>" and "Restablecer tarjetas"; outside "Ajustar" the list is a plain `<ul>` without the hidden cards. A `lockedReason` (EXAM, D29) disables "Ajustar" with the reason and applies the saved preference read-only. Moves are relative to the cards on screen (a vital the source does not give is skipped). Depends on React, MUI icons, the console config, the value tile, the sparkline and the console store.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import SettingsIcon from "@mui/icons-material/Settings";
import { lazy, memo, Suspense, useId, useMemo, useState } from "react";
import { cx } from "@shared/lib/class-names";
import { CONSOLE_METRICS, MONITOR_CARD_IDS, PATIENT_VITAL_IDS, PATIENT_VITALS } from "./config/console.config";
import type { ConsoleMetricId, MonitorCardId, NormalRange, PatientVitalId, ValueDefinition } from "./config/console.config";
import { resolveNormalRange } from "./console-format";
import type { RangeOverrides } from "./console-format";
import { createExternalStore, useStoreSelector } from "./console-store";
import type { ExternalStore } from "./console-store";
import type { ConsoleAdapterStore } from "./console-store";
import { Sparkline } from "./patient-monitor";
import { ValueTile } from "./value-tile";
import { isDerivedMetric, metricNumber } from "./ventilator-console.entity";
import type { ConsoleMetrics, ConsolePatient, VentilatorConsoleAdapter } from "./ventilator-console.entity";
import styles from "../UI/july-layout.module.css";

// The dnd list is only needed while adjusting: its code loads on the first "Ajustar".
const MonitorCardsAdjust = lazy(() => import("./monitor-cards-adjust"));

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const MONITOR_CARDS_COPY = {
  list: "Valores del monitor",
  adjust: "Ajustar",
  reset: "Restablecer tarjetas",
  move: (label: string) => `Mover ${label}`,
  up: (label: string) => `Subir ${label}`,
  down: (label: string) => `Bajar ${label}`,
  hide: (label: string) => `Ocultar ${label}`,
  show: (label: string) => `Mostrar ${label}`,
  hidden: "Oculta",
} as const;

/** Order and hidden cards of the value list. */
export type MonitorCardsLayout = {
  order: readonly MonitorCardId[]
  hidden: readonly MonitorCardId[]
};

/** The value list preference: a store the list subscribes to, written only on user actions. */
export type MonitorCardsController = ExternalStore<MonitorCardsLayout> & {
  setLayout: (layout: MonitorCardsLayout) => void
  /** Back to the defaults (the persisted preference is removed). */
  reset: () => void
};

export const DEFAULT_CARDS_LAYOUT: MonitorCardsLayout = { order: MONITOR_CARD_IDS, hidden: [] };

/** A preference kept in memory only (no session, tests, the default of a console without a host preference). */
export function createMemoryCardsController(initial: MonitorCardsLayout = DEFAULT_CARDS_LAYOUT): MonitorCardsController {
  const store = createExternalStore(initial);

  return {
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    setLayout: store.set,
    reset: () => store.set(DEFAULT_CARDS_LAYOUT),
  };
}

const VITALS: ReadonlySet<string> = new Set(PATIENT_VITAL_IDS);

export function isVitalCard(id: MonitorCardId): id is PatientVitalId {
  return VITALS.has(id);
}

/** Swaps `id` with its neighbour among the cards on screen (`delta` -1 up, +1 down); unchanged at the ends. */
export function moveCardInView(layout: MonitorCardsLayout, onScreen: readonly MonitorCardId[], id: MonitorCardId, delta: -1 | 1): MonitorCardsLayout {
  const index = onScreen.indexOf(id);
  const neighbour = onScreen[index + delta];

  if (index === -1 || neighbour === undefined) {
    return layout;
  }

  const order = [...layout.order];
  const from = order.indexOf(id);
  const to = order.indexOf(neighbour);

  order[from] = neighbour;
  order[to] = id;

  return { ...layout, order };
}

/** Moves the card at `from` to `to` (indexes among the cards on screen), keeping the others in place. */
export function reorderCardsInView(layout: MonitorCardsLayout, onScreen: readonly MonitorCardId[], from: number, to: number): MonitorCardsLayout {
  const moved = onScreen[from];

  if (moved === undefined || from === to || to < 0 || to >= onScreen.length) {
    return layout;
  }

  const view = onScreen.filter((id) => id !== moved);

  view.splice(to, 0, moved);
  // The cards not on screen keep their slots; the on-screen slots take the new view order.
  const slots = new Set(onScreen);
  let next = 0;

  return { ...layout, order: layout.order.map((id) => (slots.has(id) ? view[next++]! : id)) };
}

export function toggleHiddenCard(layout: MonitorCardsLayout, id: MonitorCardId): MonitorCardsLayout {
  return layout.hidden.includes(id)
    ? { ...layout, hidden: layout.hidden.filter((hidden) => hidden !== id) }
    : { ...layout, hidden: [...layout.hidden, id] };
}

const selectMetrics = (adapter: VentilatorConsoleAdapter) => adapter.metrics;
const selectMetricRanges = (adapter: VentilatorConsoleAdapter) => adapter.ranges?.metrics;
const selectPatient = (adapter: VentilatorConsoleAdapter) => adapter.patient;
const selectPatientRanges = (adapter: VentilatorConsoleAdapter) => adapter.ranges?.patient;
const selectCardsLayout = (layout: MonitorCardsLayout) => layout;

function mergeRanges<K extends string>(props: RangeOverrides<K> | undefined, source: RangeOverrides<K> | undefined): RangeOverrides<K> | undefined {
  return source ? { ...props, ...source } : props;
}

/** What one card shows (primitive props, so the memo holds between snapshots). */
export type MonitorCardData = {
  id: MonitorCardId
  value: number | null | undefined
  derived: boolean
  label: string | undefined
  description: string | undefined
  range: NormalRange | null
  trend: readonly number[] | undefined
};

export function cardDefinition({ id, label, description }: Pick<MonitorCardData, "id" | "label" | "description">): ValueDefinition {
  const base: ValueDefinition = isVitalCard(id) ? PATIENT_VITALS[id] : CONSOLE_METRICS[id];

  return label === undefined && description === undefined
    ? base
    : { ...base, label: label ?? base.label, description: description ?? base.description };
}

/** The card content (a description list group), shared by the plain and the adjustable lists. */
export const MonitorCardTile = memo(function MonitorCardTile({ id, value, derived, label, description, range, trend }: MonitorCardData) {
  const vital = isVitalCard(id);
  const definition = cardDefinition({ id, label, description });

  return (
    <dl className={cx(styles.cardList)}>
      <ValueTile definition={definition} value={value} range={range} derived={derived} layout="july" kind={vital ? "vital" : "metric"}>
        {vital && trend !== undefined && trend.length > 1 ? <Sparkline values={trend} label={definition.label} /> : null}
      </ValueTile>
    </dl>
  );
});

type CardSources = {
  metrics: ConsoleMetrics
  patient: ConsolePatient
  showPatient: boolean
  metricRanges: RangeOverrides<ConsoleMetricId> | undefined
  patientRanges: RangeOverrides<PatientVitalId> | undefined
};

/** The card of `id`, or null when it has nothing to show (a vital the source does not give). */
function cardData(id: MonitorCardId, { metrics, patient, showPatient, metricRanges, patientRanges }: CardSources): MonitorCardData | null {
  if (isVitalCard(id)) {
    const value = patient.values[id];

    return showPatient && value !== undefined
      ? { id, value, derived: false, label: undefined, description: undefined, range: resolveNormalRange(id, PATIENT_VITALS, patientRanges), trend: patient.trends?.[id] }
      : null;
  }

  const reading = metrics[id];
  const named = reading !== null && typeof reading === "object" ? reading : undefined;

  return {
    id,
    value: metricNumber(reading),
    derived: isDerivedMetric(reading),
    label: named?.label,
    description: named?.description,
    range: resolveNormalRange(id, CONSOLE_METRICS, metricRanges),
    trend: undefined,
  };
}

export type MonitorCardsProps = {
  store: ConsoleAdapterStore
  metricRanges?: RangeOverrides<ConsoleMetricId> | undefined
  patientRanges?: RangeOverrides<PatientVitalId> | undefined
  /** `false`: the source has no patient monitor, no vital card shows. */
  showPatient: boolean
  /** Order and hidden cards (stable identity); omitted, an in-memory preference per list. */
  controller?: MonitorCardsController | undefined
  /** Why "Ajustar" is unavailable (EXAM); the saved preference still applies. */
  lockedReason?: string | undefined
};

/** The value cards of the July left column, with "Ajustar". */
export const MonitorCards = memo(function MonitorCards({ store, metricRanges, patientRanges, showPatient, controller, lockedReason }: MonitorCardsProps) {
  const [memory] = useState(createMemoryCardsController);
  const cards = controller ?? memory;
  const layout = useStoreSelector(cards, selectCardsLayout);
  const metrics = useStoreSelector(store, selectMetrics);
  const patient = useStoreSelector(store, selectPatient);
  const sourceMetricRanges = useStoreSelector(store, selectMetricRanges);
  const sourcePatientRanges = useStoreSelector(store, selectPatientRanges);
  const [adjustingState, setAdjusting] = useState(false);
  const reasonId = useId();
  const adjusting = adjustingState && lockedReason === undefined;
  const mergedMetricRanges = useMemo(() => mergeRanges(metricRanges, sourceMetricRanges), [metricRanges, sourceMetricRanges]);
  const mergedPatientRanges = useMemo(() => mergeRanges(patientRanges, sourcePatientRanges), [patientRanges, sourcePatientRanges]);
  const sources: CardSources = { metrics, patient, showPatient, metricRanges: mergedMetricRanges, patientRanges: mergedPatientRanges };
  const available = layout.order
    .map((id) => cardData(id, sources))
    .filter((card): card is MonitorCardData => card !== null);
  const hidden = new Set(layout.hidden);

  return (
    <div className={cx(styles.cardsZone)}>
      <div className={cx(styles.cardsBar)}>
        <button
          type="button"
          className={cx(styles.cardsButton)}
          aria-pressed={adjusting}
          aria-describedby={lockedReason === undefined ? undefined : reasonId}
          disabled={lockedReason !== undefined}
          onClick={() => setAdjusting((value) => !value)}
        >
          <SettingsIcon fontSize="small" aria-hidden />
          {MONITOR_CARDS_COPY.adjust}
        </button>
        {adjusting ? (
          <button type="button" className={cx(styles.cardsButton)} onClick={() => cards.reset()}>
            {MONITOR_CARDS_COPY.reset}
          </button>
        ) : null}
        {lockedReason === undefined ? null : <p id={reasonId} className={cx(styles.hint)}>{lockedReason}</p>}
      </div>
      {adjusting ? (
        <Suspense fallback={<PlainCards cards={available} hidden={hidden} />}>
          <MonitorCardsAdjust cards={available} layout={layout} controller={cards} />
        </Suspense>
      ) : (
        <PlainCards cards={available} hidden={hidden} />
      )}
    </div>
  );
});

function PlainCards({ cards, hidden }: { cards: readonly MonitorCardData[], hidden: ReadonlySet<MonitorCardId> }) {
  return (
    <ul className={cx(styles.cards)} aria-label={MONITOR_CARDS_COPY.list}>
      {cards.filter((card) => !hidden.has(card.id)).map((card) => (
        <li key={card.id} className={cx(styles.card)} data-card={card.id}>
          <MonitorCardTile {...card} />
        </li>
      ))}
    </ul>
  );
}
