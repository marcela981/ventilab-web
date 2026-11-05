/*
* Funcionalidad: July alerts (alarms bar, mechanics and detailed alerts drawer)
* Descripción: The alerts of the July Monitoreo layout (DISENO_BLOQUE5 §6.3, §6.9, D23, D26). JulyAlarmsZone renders the alarms bar in its July variant ("Historial de alarmas" and "Límites" open the drawer; icon-only at 1280) and, while open, the "Alertas detalladas" drawer (380 px, non-modal, one of the console drawers): the validation alerts, the session alarm history and the alarm limits panel (only when the source offers limits). JulyMechanicsAlerts is the bottom of the right column: region "Estado de la mecánica" with Cst = Vte / (Pplat − PEEP) and Cdin = Vte / (Ppico − PEEP), both marked "derivada", then "Alertas (n)" and "Ver alertas detalladas" / "Ocultar alertas". The validation alerts come only from sourced data, never from clinical rules without a source (D23): console metrics outside their normal range (config defaults < console props < adapter ranges), confirmed changes the source rejected or has not applied yet, and the unconfirmed edits of the pending store. Each zone reads only its slices (compared by content), so new snapshots re-render them only when what they show changes. v0.1 (Bloque 5, C9): first version. v0.2 (Ajustes A, A1): the "cambios pendientes sin confirmar" alert only in confirm mode (`pendingAlert`); the automatic application has nothing to confirm. Depends on React, MUI icons, the console stores, config, format helpers, the alarms bar, the alarm limits panel, the console drawers and the July alerts styles.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { memo, useCallback, useId, useMemo } from "react";
import { cx } from "@shared/lib/class-names";
import { CONSOLE_METRICS } from "./config/console.config";
import type { ConsoleMetricId, NormalRange, ValueDefinition } from "./config/console.config";
import { CONSOLE_PARAMETERS } from "./config/console-controls.config";
import type { ConsoleParameterId } from "./config/console-controls.config";
import { AlarmLimitsPanel } from "./alarm-limits-panel";
import { ALARMS_COPY, AlarmHistoryList, AlarmsBar } from "./alarms-bar";
import { ConsoleDrawer, useConsoleDrawer } from "./console-drawers";
import { buildConfirmation } from "./console-controls.reducer";
import { evaluateRange, formatConsoleValue, RANGE_STATUS_COPY, resolveNormalRange } from "./console-format";
import type { RangeOverrides } from "./console-format";
import { confirmationCount, selectPendingState } from "./console-pending-store";
import type { PendingControlsStore } from "./console-pending-store";
import { sameData, useStoreSelector } from "./console-store";
import type { ConsoleAdapterStore } from "./console-store";
import type { AlarmBeeperFactory, ConsoleClock } from "./use-console-alarms";
import { metricNumber } from "./ventilator-console.entity";
import type { VentilatorConsoleAdapter } from "./ventilator-console.entity";
import styles from "../UI/july-alerts.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const JULY_ALERTS_COPY = {
  mechanics: "Estado de la mecánica",
  cst: "Cst",
  cstDescription: "Distensibilidad estática: Vte / (Pplat − PEEP)",
  cdin: "Cdin",
  cdinDescription: "Distensibilidad dinámica: Vte / (Ppico − PEEP)",
  derived: "derivada",
  alerts: (count: number) => `Alertas (${count})`,
  open: "Ver alertas detalladas",
  hide: "Ocultar alertas",
  drawerTitle: "Alertas detalladas",
  validation: "Alertas de validación",
  validationEmpty: "Sin alertas de validación.",
  outOfRange: (description: string, value: string, status: string, reference: string) => `${description}: ${value} (${status}; referencia ${reference})`,
  rejected: (label: string, message: string | undefined) => `${label}: el equipo rechazó el cambio${message ? ` — ${message}` : ""}`,
  inFlight: (label: string) => `${label}: cambio enviado, esperando que la fuente lo aplique`,
  pending: (count: number) => (count === 1 ? "1 cambio pendiente sin confirmar" : `${count} cambios pendientes sin confirmar`),
} as const;

/** Key of the details drawer among the console drawers. */
const ALERTS_DRAWER_KEY = "alerts";

type ValidationAlert = { id: string, tone: "warning" | "error" | "info", text: string };

const COMPLIANCE: ValueDefinition = { label: "", description: "", unit: "mL/cmH2O", decimals: 0, format: "number", normalRange: null };

function referenceText(range: NormalRange, definition: ValueDefinition): string {
  const unit = definition.unit ? ` ${definition.unit}` : "";

  if (range.min !== undefined && range.max !== undefined) {
    return `${range.min}–${range.max}${unit}`;
  }

  return range.min === undefined ? `≤ ${range.max}${unit}` : `≥ ${range.min}${unit}`;
}

/** Metrics outside their normal range and confirmed changes not applied yet (sourced data only, D23). */
function sourceAlerts(adapter: VentilatorConsoleAdapter, ranges: RangeOverrides<ConsoleMetricId> | undefined): ValidationAlert[] {
  const merged = adapter.ranges?.metrics ? { ...ranges, ...adapter.ranges.metrics } : ranges;
  const alerts: ValidationAlert[] = [];

  for (const id of Object.keys(CONSOLE_METRICS) as ConsoleMetricId[]) {
    const definition = CONSOLE_METRICS[id];
    const value = metricNumber(adapter.metrics[id]);
    const range = resolveNormalRange(id, CONSOLE_METRICS, merged);
    const status = evaluateRange(value, range);

    if (range && (status === "low" || status === "high")) {
      const shown = `${formatConsoleValue(value, definition)}${definition.unit ? ` ${definition.unit}` : ""}`;

      alerts.push({ id: `metric-${id}`, tone: "warning", text: JULY_ALERTS_COPY.outOfRange(definition.description, shown, RANGE_STATUS_COPY[status], referenceText(range, definition)) });
    }
  }

  for (const [parameter, inFlight] of Object.entries(adapter.settings.inFlight ?? {})) {
    if (!inFlight) {
      continue;
    }

    const label = CONSOLE_PARAMETERS[parameter as ConsoleParameterId]?.label ?? parameter;

    alerts.push(inFlight.status === "rejected"
      ? { id: `inflight-${parameter}`, tone: "error", text: JULY_ALERTS_COPY.rejected(label, inFlight.message) }
      : { id: `inflight-${parameter}`, tone: "info", text: JULY_ALERTS_COPY.inFlight(label) });
  }

  return alerts;
}

const selectSettings = (adapter: VentilatorConsoleAdapter) => adapter.settings;
const selectAppliedMode = (adapter: VentilatorConsoleAdapter) => adapter.mode.current;

/** Every validation alert: the source ones plus, in confirm mode, the unconfirmed edits. */
function useValidationAlerts(store: ConsoleAdapterStore, pending: PendingControlsStore, ranges: RangeOverrides<ConsoleMetricId> | undefined, pendingAlert: boolean): ValidationAlert[] {
  const select = useCallback((adapter: VentilatorConsoleAdapter) => sourceAlerts(adapter, ranges), [ranges]);
  const fromSource = useStoreSelector(store, select, sameData);
  const settings = useStoreSelector(store, selectSettings);
  const appliedMode = useStoreSelector(store, selectAppliedMode);
  const state = useStoreSelector(pending, selectPendingState);
  const count = pendingAlert ? confirmationCount(buildConfirmation(state, settings.applied, appliedMode)) : 0;

  return useMemo(
    () => (count > 0 ? [...fromSource, { id: "pending", tone: "info" as const, text: JULY_ALERTS_COPY.pending(count) }] : fromSource),
    [count, fromSource],
  );
}

type Compliance = { cst: number | null, cdin: number | null };

function compliance(volume: number | null | undefined, pressure: number | null | undefined, peep: number | null | undefined): number | null {
  if (typeof volume !== "number" || typeof pressure !== "number" || typeof peep !== "number" || pressure - peep <= 0) {
    return null;
  }

  return Math.round(volume / (pressure - peep));
}

const selectCompliance = ({ metrics }: VentilatorConsoleAdapter): Compliance => {
  const volume = metricNumber(metrics.exhaledTidalVolume);
  const peep = metricNumber(metrics.totalPeep);

  return {
    cst: compliance(volume, metricNumber(metrics.plateauPressure), peep),
    cdin: compliance(volume, metricNumber(metrics.peakPressure), peep),
  };
};

const selectAlarms = (adapter: VentilatorConsoleAdapter) => adapter.alarms;
const selectAlarmHistory = (adapter: VentilatorConsoleAdapter) => adapter.alarmHistory;
const selectAlarmLimits = (adapter: VentilatorConsoleAdapter) => adapter.alarmLimits;
const selectOnAlarmLimitsChange = (adapter: VentilatorConsoleAdapter) => adapter.onAlarmLimitsChange;

type JulyAlertsZoneProps = {
  store: ConsoleAdapterStore
  pending: PendingControlsStore
  metricRanges: RangeOverrides<ConsoleMetricId> | undefined
  /** Id of the details drawer (shared by its two opening buttons). */
  drawerId: string
  /** Confirm mode only: the unconfirmed edits count as a validation alert (auto mode applies them on its own). */
  pendingAlert: boolean
};

type JulyAlarmsZoneProps = JulyAlertsZoneProps & {
  readOnly: boolean
  clock: ConsoleClock | undefined
  beeperFactory: AlarmBeeperFactory | undefined
};

function ValidationList({ alerts }: { alerts: readonly ValidationAlert[] }) {
  if (alerts.length === 0) {
    return <p className={cx(styles.muted)}>{JULY_ALERTS_COPY.validationEmpty}</p>;
  }

  return (
    <ul className={cx(styles.alerts)}>
      {alerts.map((alert) => (
        <li key={alert.id} className={cx(styles.alert)} data-tone={alert.tone}>
          <ReportProblemOutlinedIcon className={cx(styles.alertIcon)} fontSize="small" aria-hidden />
          <span>{alert.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** The July alarms bar and, while open, the "Alertas detalladas" drawer (it owns the session alarm history). */
export const JulyAlarmsZone = memo(function JulyAlarmsZone({ store, pending, metricRanges, drawerId, pendingAlert, readOnly, clock, beeperFactory }: JulyAlarmsZoneProps) {
  const alarms = useStoreSelector(store, selectAlarms);
  const sourceHistory = useStoreSelector(store, selectAlarmHistory);
  const limits = useStoreSelector(store, selectAlarmLimits);
  const onLimitsChange = useStoreSelector(store, selectOnAlarmLimitsChange);
  const { open, toggle, close } = useConsoleDrawer(ALERTS_DRAWER_KEY);
  const historyId = useId();
  const validationId = useId();

  return (
    <AlarmsBar
      alarms={alarms}
      history={sourceHistory}
      limits={limits}
      onLimitsChange={onLimitsChange}
      readOnly={readOnly}
      clock={clock}
      beeperFactory={beeperFactory}
      variant="july"
      onOpenDetails={toggle}
      detailsOpen={open}
      detailsId={drawerId}
      renderDetails={(events) => (open ? (
        <ConsoleDrawer id={drawerId} title={JULY_ALERTS_COPY.drawerTitle} closeLabel={JULY_ALERTS_COPY.hide} onClose={() => close()}>
          <section className={cx(styles.section)} aria-labelledby={validationId}>
            <h3 id={validationId} className={cx(styles.heading)}>{JULY_ALERTS_COPY.validation}</h3>
            <DrawerValidation store={store} pending={pending} metricRanges={metricRanges} pendingAlert={pendingAlert} />
          </section>
          <section className={cx(styles.section)} aria-labelledby={historyId}>
            <h3 id={historyId} className={cx(styles.heading)}>{`${ALARMS_COPY.history} (${events.length})`}</h3>
            <AlarmHistoryList events={events} />
          </section>
          {limits && limits.length > 0 ? <AlarmLimitsPanel limits={limits} onChange={onLimitsChange} readOnly={readOnly} /> : null}
        </ConsoleDrawer>
      ) : null)}
    />
  );
});

function DrawerValidation({ store, pending, metricRanges, pendingAlert }: Omit<JulyAlertsZoneProps, "drawerId">) {
  const alerts = useValidationAlerts(store, pending, metricRanges, pendingAlert);

  return <ValidationList alerts={alerts} />;
}

/** Bottom of the right column: mechanics (derived compliance), the alerts count and the drawer button. */
export const JulyMechanicsAlerts = memo(function JulyMechanicsAlerts({ store, pending, metricRanges, drawerId, pendingAlert }: JulyAlertsZoneProps) {
  const { cst, cdin } = useStoreSelector(store, selectCompliance, sameData);
  const alerts = useValidationAlerts(store, pending, metricRanges, pendingAlert);
  const { open, toggle, triggerRef } = useConsoleDrawer(ALERTS_DRAWER_KEY);
  const titleId = useId();

  return (
    <>
      <section className={cx(styles.mechanics)} aria-labelledby={titleId}>
        <h3 id={titleId} className={cx(styles.heading)}>{JULY_ALERTS_COPY.mechanics}</h3>
        <dl className={cx(styles.facts)}>
          <dt title={JULY_ALERTS_COPY.cstDescription}>{JULY_ALERTS_COPY.cst}</dt>
          <dd>
            {`${formatConsoleValue(cst, COMPLIANCE)} ${COMPLIANCE.unit}`}
            <span className={cx(styles.derived)}>{JULY_ALERTS_COPY.derived}</span>
          </dd>
          <dt title={JULY_ALERTS_COPY.cdinDescription}>{JULY_ALERTS_COPY.cdin}</dt>
          <dd>
            {`${formatConsoleValue(cdin, COMPLIANCE)} ${COMPLIANCE.unit}`}
            <span className={cx(styles.derived)}>{JULY_ALERTS_COPY.derived}</span>
          </dd>
        </dl>
      </section>
      <p className={cx(styles.count)} data-alerts={alerts.length > 0}>{JULY_ALERTS_COPY.alerts(alerts.length)}</p>
      <button
        ref={triggerRef}
        type="button"
        className={cx(styles.open)}
        aria-expanded={open}
        {...(open ? { "aria-controls": drawerId } : {})}
        onClick={toggle}
      >
        <VisibilityIcon fontSize="small" aria-hidden />
        {open ? JULY_ALERTS_COPY.hide : JULY_ALERTS_COPY.open}
      </button>
    </>
  );
});
