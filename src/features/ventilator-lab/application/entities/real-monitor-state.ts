/*
* Funcionalidad: Real monitor state for the AI help
* Descripción: Builds the RealMonitorStateDTO the real-mode AI routes receive (Bloque A, DISENO_AJUSTES_A §5: POST
*   /api/simulation/real/alarm-help and /assist) from the real console adapter snapshot: the ventilation mode, the
*   shown settings (console units back to the contract units: FiO2 % → fraction), the last breath metrics and the
*   reported SpO2 and CO2 (PCO2 as EtCO2), the active alarm codes (UPPER_CASE only, at most 20), the client alarm
*   limits and a short recent trend (at most 20 points, newest last, `secondsAgo` from now). The trend recorder keeps
*   one point every TREND_INTERVAL_MS outside React. Values that are missing or not finite are left out; the server
*   validates the DTO again. The AI only reads this state: nothing here reaches the ventilator commands. Depends on the
*   console contract types and the generated contract.
*   v1.1 (fix sim-assist-current-state): the active alarms also go with their priority and, for the client alarm
*   limits, the measured value and the limit (alarmDetails); the state carries when the latest telemetry frame arrived
*   (lastFrameAt) and its age when the help is asked (dataAgeMs: the server and the panel flag it past 2 s), and the
*   case loaded on the monitor when there is one.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";
import type { ConsoleMetricValue, VentilatorConsoleAdapter } from "@shared/ventilator-console";

export type RealMonitorState = components["schemas"]["RealMonitorStateDTO"];
type TrendPoint = components["schemas"]["RealMonitorTrendPointDTO"];
type MonitorSettings = NonNullable<RealMonitorState["settings"]>;
type MonitorMetrics = NonNullable<RealMonitorState["metrics"]>;
type MonitorLimits = NonNullable<RealMonitorState["limits"]>;
type MonitorAlarmDetail = NonNullable<RealMonitorState["alarmDetails"]>[number];

/** When the latest telemetry frame arrived (wall clock of the console) and the time the help is asked. */
export type MonitorFreshness = { lastFrameAt: number | null, now: number };

const PRIORITIES: Readonly<Record<string, MonitorAlarmDetail["priority"]>> = { high: "HIGH", medium: "MEDIUM", low: "LOW" };

/** The client alarm limits behind an alarm code: the measured metric and the limit id (real-alarm-limits rules). */
const LIMIT_ALARMS: Readonly<Record<string, { limit: string, metric: "peakPressure" | "exhaledTidalVolume" | "totalRespiratoryRate" }>> = {
  HIGH_PRESSURE: { limit: "highPressure", metric: "peakPressure" },
  LOW_VOLUME: { limit: "lowTidalVolume", metric: "exhaledTidalVolume" },
  HIGH_VOLUME: { limit: "highTidalVolume", metric: "exhaledTidalVolume" },
  HIGH_RESPIRATORY_RATE: { limit: "highRespiratoryRate", metric: "totalRespiratoryRate" },
};

/** RealMonitorStateDTO: at most 20 alarm codes and 20 trend points. */
export const MAX_STATE_ALARMS = 20;
export const MAX_TREND_POINTS = 20;
/** One trend point every 15 s: 20 points cover the last 5 minutes. */
export const TREND_INTERVAL_MS = 15_000;
const MAX_MODE_LENGTH = 20;
const ALARM_CODE = /^[A-Z][A-Z0-9_]*$/;

function finite(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

// The real adapter wraps its derived metrics in readings; the console helper is not imported (lazy boundary).
function metricValue(value: ConsoleMetricValue | undefined): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return finite(typeof value === "number" ? value : value.value);
}

/** Only the defined fields, so the DTO never carries undefined keys. */
function compact<T extends Record<string, number | undefined>>(record: T): { [K in keyof T]?: number } {
  const result: { [K in keyof T]?: number } = {};

  (Object.keys(record) as (keyof T)[]).forEach((key) => {
    const value = record[key];

    if (value !== undefined) {
      result[key] = value;
    }
  });

  return result;
}

function settingsOf(adapter: VentilatorConsoleAdapter): MonitorSettings {
  const values = adapter.settings.applied;
  const fio2 = finite(values.fio2);

  return compact({
    tidalVolumeMl: finite(values.tidalVolume),
    respiratoryRateBpm: finite(values.respiratoryRate),
    peepCmH2O: finite(values.peep),
    fio2: fio2 === undefined ? undefined : Math.round(fio2) / 100,
    inspiratoryTimeS: finite(values.inspiratoryTime),
    inspiratoryPressureCmH2O: finite(values.inspiratoryPressure),
    pressureSupportCmH2O: finite(values.pressureSupport),
  });
}

function metricsOf(adapter: VentilatorConsoleAdapter): MonitorMetrics {
  const { metrics, patient } = adapter;

  return compact({
    peakPressureCmH2O: metricValue(metrics.peakPressure),
    plateauPressureCmH2O: metricValue(metrics.plateauPressure),
    totalPeepCmH2O: metricValue(metrics.totalPeep),
    autoPeepCmH2O: metricValue(metrics.autoPeep),
    exhaledTidalVolumeMl: metricValue(metrics.exhaledTidalVolume),
    measuredRespiratoryRateBpm: metricValue(metrics.totalRespiratoryRate),
    minuteVolumeLpm: metricValue(metrics.minuteVolume),
    spo2Percent: finite(patient.values.spo2),
    etco2MmHg: finite(patient.values.pco2),
  });
}

const LIMIT_FIELDS: Readonly<Record<string, keyof MonitorLimits>> = {
  highPressure: "highPressureCmH2O",
  lowTidalVolume: "lowTidalVolumeMl",
  highTidalVolume: "highTidalVolumeMl",
  highRespiratoryRate: "highRespiratoryRateBpm",
};

function limitsOf(adapter: VentilatorConsoleAdapter): MonitorLimits {
  const limits: MonitorLimits = {};

  (adapter.alarmLimits ?? []).forEach((limit) => {
    const field = Object.prototype.hasOwnProperty.call(LIMIT_FIELDS, limit.id) ? LIMIT_FIELDS[limit.id] : undefined;
    const value = finite(limit.value);

    if (field !== undefined && value !== undefined) {
      limits[field] = value;
    }
  });

  return limits;
}

function alarmsOf(adapter: VentilatorConsoleAdapter): string[] {
  const codes = adapter.alarms.map((alarm) => alarm.type).filter((code) => ALARM_CODE.test(code));

  return [...new Set(codes)].slice(0, MAX_STATE_ALARMS);
}

/** Each active alarm with its priority and, when a client limit raised it, the measured value and the limit. */
function alarmDetailsOf(adapter: VentilatorConsoleAdapter): MonitorAlarmDetail[] {
  const seen = new Set<string>();
  const details: MonitorAlarmDetail[] = [];

  adapter.alarms.forEach((alarm) => {
    if (!ALARM_CODE.test(alarm.type) || seen.has(alarm.type) || details.length >= MAX_STATE_ALARMS) {
      return;
    }

    seen.add(alarm.type);

    const limitRule = LIMIT_ALARMS[alarm.type];
    const limit = limitRule ? (adapter.alarmLimits ?? []).find((entry) => entry.id === limitRule.limit) : undefined;
    const value = limitRule ? metricValue(adapter.metrics[limitRule.metric]) : undefined;
    const threshold = finite(limit?.value);
    const priority = PRIORITIES[alarm.priority];

    details.push({
      code: alarm.type,
      ...(value === undefined ? {} : { value }),
      ...(threshold === undefined ? {} : { threshold }),
      ...(priority === undefined ? {} : { priority }),
    });
  });

  return details;
}

export type FrameClock = {
  /** Records that new telemetry reached the console at `nowMs` (no React state). */
  mark: (nowMs: number) => void
  /** When the latest telemetry arrived, or null before the first one. */
  lastAt: () => number | null
};

/** v1.1: when the latest telemetry frame reached the console, kept outside React like the trend. */
export function createFrameClock(): FrameClock {
  let lastAt: number | null = null;

  return {
    mark(nowMs) {
      lastAt = nowMs;
    },
    lastAt: () => lastAt,
  };
}

/** One recorded trend sample, at its wall-clock time. */
type TrendSample = Omit<TrendPoint, "secondsAgo"> & { atMs: number };

export type MonitorTrend = {
  /** Records the snapshot when TREND_INTERVAL_MS passed since the last point (no React state). */
  record: (adapter: VentilatorConsoleAdapter, nowMs: number) => void
  /** The recorded points, newest last, with their seconds before `nowMs`. */
  points: (nowMs: number) => TrendPoint[]
};

export function createMonitorTrend(intervalMs: number = TREND_INTERVAL_MS, maxPoints: number = MAX_TREND_POINTS): MonitorTrend {
  let samples: TrendSample[] = [];

  return {
    record(adapter, nowMs) {
      const last = samples.at(-1);

      if (last !== undefined && nowMs - last.atMs < intervalMs) {
        return;
      }

      const sample = {
        atMs: nowMs,
        ...compact({
          peakPressureCmH2O: metricValue(adapter.metrics.peakPressure),
          exhaledTidalVolumeMl: metricValue(adapter.metrics.exhaledTidalVolume),
          respiratoryRateBpm: metricValue(adapter.metrics.totalRespiratoryRate),
          spo2Percent: finite(adapter.patient.values.spo2),
        }),
      };

      // A snapshot without any value (no breath yet) is not a trend point.
      if (Object.keys(sample).length > 1) {
        samples = [...samples, sample].slice(-maxPoints);
      }
    },
    points(nowMs) {
      return samples.map(({ atMs, ...values }) => ({ secondsAgo: Math.max(0, Math.round((nowMs - atMs) / 1000)), ...values }));
    },
  };
}

/** The monitor state of the real console for the AI help (built when the help is asked). */
export function buildRealMonitorState(
  adapter: VentilatorConsoleAdapter,
  trend: readonly TrendPoint[] = [],
  caseId?: string | null,
  freshness?: MonitorFreshness,
): RealMonitorState {
  const mode = adapter.mode.current.trim();
  const settings = settingsOf(adapter);
  const metrics = metricsOf(adapter);
  const limits = limitsOf(adapter);
  const alarms = alarmsOf(adapter);
  const alarmDetails = alarmDetailsOf(adapter);
  const lastFrameAt = freshness?.lastFrameAt ?? null;

  return {
    ...(alarmDetails.length > 0 ? { alarmDetails } : {}),
    ...(lastFrameAt === null || freshness === undefined
      ? {}
      : { lastFrameAt: new Date(lastFrameAt).toISOString(), dataAgeMs: Math.max(0, Math.round(freshness.now - lastFrameAt)) }),
    ...(mode !== "" && mode !== "—" ? { mode: mode.slice(0, MAX_MODE_LENGTH) } : {}),
    ...(Object.keys(settings).length > 0 ? { settings } : {}),
    ...(Object.keys(metrics).length > 0 ? { metrics } : {}),
    alarms,
    ...(Object.keys(limits).length > 0 ? { limits } : {}),
    ...(trend.length > 0 ? { trend: trend.slice(-MAX_TREND_POINTS) } : {}),
    ...(caseId ? { caseId } : {}),
  };
}
