/*
* Funcionalidad: useRealConsoleAdapter
* Descripción: Live console adapter of the physical ventilator for a data source (the reservation id). Per source it
*   keeps a telemetry frame hub, a breath detector and the reported state outside React. Each `ventilator:telemetry`
*   batch goes synchronously into the hub (the console writes the samples into its curve ring by reference, no React
*   render per batch), into the breath detector and into the reported state; React state (derived metrics, reported
*   settings/mode/vitals, frame alarms, estimated sample rate) is committed at most once per uiThrottleMs (default
*   250 ms, trailing commit so the last values always show). `ventilator:alarm` events update the device alarms. While
*   `live` is false (device without data, from the device status of the page) the source status is `no-data`, the
*   synthetic "Equipo sin datos" alarm is raised and the breath detector restarts, so stale metrics turn into "—".
*   Read-only unless the caller passes `canControl` (T7/T8). v1.1 (T5 review fix): every commit clears the pending
*   throttle timer (an orphaned one could commit the previous source over the new one); the no-data alarm carries the time `live`
*   turned false and is shown only once that time is committed (never dated 0); the frame alarm codes are hidden while not live (stale). The
*   wall-clock freshness watchdog is the page's useTelemetryStale (no batch for telemetry.staleAfterMs → `live` false). Returns null without a source. Depends on React, the
*   realtime events and the real-console entities. v1.2 (T8): passes `modeOptionsFor` (command mode options) to the adapter. v1.3 (T9): optional `pendingResetKey` (drops the console's unconfirmed edits when it changes).
*   v1.4 (W2, Bloque 1): returns a `ConsoleAdapterStore` (stable per source) instead of a new adapter object per
*   commit: telemetry, the live toggle, device alarms and the caller options publish immutable snapshots into it
*   (createUiThrottle keeps the ≤ 1 per uiThrottleMs telemetry rate with its trailing publish; unchanged slices keep
*   their identity), so the console zones re-render only when their own slice changes and the caller never re-renders
*   per batch. Same contract as the simulator and the replay.
*   v1.5 (W10, Bloque 1): optional `alarmLimits` gives the console the client alarm limits of the source
*   (real-alarm-limits: kept in the store closure, changed from the AlarmLimitsPanel, evaluated on every published
*   snapshot against the derived metrics, never while there is no data).
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useMemo, useState } from "react";
import { useSocketEvent } from "@shared/realtime";
import type { VentilatorTelemetryFrame } from "@shared/realtime";
import { createExternalStore, createUiThrottle, reuseUnchangedSlices } from "@shared/ventilator-console";
import type {
  ConsoleAdapterStore,
  ConsoleAlarm,
  ConsoleAlarmLimit,
  ConsoleAlarmLimitChange,
  ConsoleConfirmation,
  ConsoleFrameSource,
  ConsoleLimits,
  ConsoleModeOption,
  ConsoleSettings,
  UiThrottle,
  VentilatorConsoleAdapter,
  WritableStore,
} from "@shared/ventilator-console";
import { computeBreathMetrics, createBreathDetector, EMPTY_BREATH_METRICS } from "../entities/breath-detection";
import type { BreathMetrics } from "../entities/breath-detection";
import { applyAlarmLimitChanges, DEFAULT_REAL_ALARM_LIMITS, evaluateAlarmLimits } from "../entities/real-alarm-limits";
import { buildRealConsoleAdapter } from "../entities/real-console-adapter";
import { EMPTY_REPORTED_STATE, reduceReportedState } from "../entities/reported-settings";
import type { ReportedState } from "../entities/reported-settings";
import { applyDeviceAlarm, frameAlarmsToConsole, mergeConsoleAlarms, NO_DATA_ALARM_MESSAGE, noDataAlarm } from "../entities/telemetry-alarms";
import { createTelemetryFrameHub } from "../entities/telemetry-frame-hub";

/** Minimum interval between React commits of the live values. */
export const LIVE_UI_THROTTLE_MS = 250;

export type UseRealConsoleAdapterOptions = {
  /** Data source (the reservation id); null → no adapter. */
  sourceId: string | null
  /** Whether the device is sending data (device status of the page). */
  live: boolean
  /** Overlay and read-only text while there is no data (default "Equipo sin datos"). */
  noDataMessage?: string
  canControl?: boolean
  readOnlyReason?: string
  /** T9: changing it drops the console's unconfirmed edits. */
  pendingResetKey?: string | number
  limits?: ConsoleLimits
  inFlight?: ConsoleSettings["inFlight"]
  onConfirm?: (confirmation: ConsoleConfirmation) => void
  modeOptionsFor?: (reportedMode: string | null) => readonly ConsoleModeOption[]
  /** W10: the console offers the client alarm limits (AlarmLimitsPanel, real-alarm-limits). Default false. */
  alarmLimits?: boolean
  uiThrottleMs?: number
};

type Snapshot = {
  metrics: BreathMetrics
  reported: ReportedState
  frameAlarms: readonly ConsoleAlarm[]
  noDataSince: number | null
  sampleRateHz: number | undefined
};

const EMPTY_SNAPSHOT: Snapshot = {
  metrics: EMPTY_BREATH_METRICS,
  reported: EMPTY_REPORTED_STATE,
  frameAlarms: [],
  noDataSince: null,
  sampleRateHz: undefined,
};

/** Per-source state kept outside React (closures, so the hook never mutates a memoised value). */
type LiveSource = {
  sourceId: string
  frames: ConsoleFrameSource
  /** One telemetry batch: curves (synchronously, by reference), breath detection and reported state. */
  ingest: (frames: readonly VentilatorTelemetryFrame[]) => void
  /** Without data the breath detection restarts (its metrics would be stale). */
  setLive: (live: boolean, now: number) => void
  snapshot: (now: number) => Snapshot
};

function createLiveSource(sourceId: string): LiveSource {
  const hub = createTelemetryFrameHub(sourceId);
  const detector = createBreathDetector();
  let reported: ReportedState = EMPTY_REPORTED_STATE;
  let frameAlarms: ConsoleAlarm[] = [];
  let noDataSince: number | null = null;

  return {
    sourceId,
    frames: hub.source,
    ingest(frames) {
      detector.push(hub.push(frames));
      reported = reduceReportedState(reported, frames);
    },
    setLive(live, now) {
      if (live) {
        noDataSince = null;
      } else {
        noDataSince = noDataSince ?? now;
        detector.reset();
      }
    },
    snapshot(now) {
      frameAlarms = reported.frameAlarms === null ? [] : frameAlarmsToConsole(reported.frameAlarms, now, frameAlarms);

      return {
        metrics: computeBreathMetrics(detector.breaths(), detector.latestMs()),
        reported,
        frameAlarms,
        noDataSince,
        sampleRateHz: hub.sampleRateHz(),
      };
    },
  };
}

/** What the caller decides (published when it changes). */
type CallerOptions = {
  live: boolean
  noDataMessage: string
  canControl: boolean | undefined
  readOnlyReason: string | undefined
  pendingResetKey: string | number | undefined
  limits: ConsoleLimits | undefined
  inFlight: ConsoleSettings["inFlight"]
  onConfirm: ((confirmation: ConsoleConfirmation) => void) | undefined
  modeOptionsFor: ((reportedMode: string | null) => readonly ConsoleModeOption[]) | undefined
  alarmLimits: boolean
};

/**
 * One live source and its store. The telemetry snapshot, the device alarms and the caller options live in this
 * closure (never in React state); every change publishes a snapshot whose unchanged slices keep their identity.
 */
type SourceStore = {
  store: WritableStore<VentilatorConsoleAdapter>
  ingest: (frames: readonly VentilatorTelemetryFrame[]) => void
  setLive: (live: boolean, now: number) => void
  setOptions: (options: CallerOptions) => void
  applyAlarm: (alarm: Parameters<typeof applyDeviceAlarm>[1]) => void
  /** Commits the telemetry: at once with `force`, otherwise at most once per interval (trailing). */
  requestCommit: (request: { force?: boolean, trailing?: boolean }) => void
  /** Starts the commit throttle; the returned function drops a pending commit. */
  startThrottle: (intervalMs: number) => () => void
};

function createSourceStore(sourceId: string, initial: CallerOptions): SourceStore {
  const source = createLiveSource(sourceId);
  let options = initial;
  let telemetry = EMPTY_SNAPSHOT;
  let deviceAlarms: readonly ConsoleAlarm[] = [];
  let throttle: UiThrottle | null = null;

  // W10: client alarm limits of this source (kept across caller option changes) and the alarms they raise.
  let alarmLimits: readonly ConsoleAlarmLimit[] = DEFAULT_REAL_ALARM_LIMITS;
  let limitAlarms: readonly ConsoleAlarm[] = [];
  // Declared before the first build; it only runs after the store exists (a panel change).
  let publishLimits = (): void => undefined;
  const onAlarmLimitsChange = (changes: readonly ConsoleAlarmLimitChange[]): void => {
    alarmLimits = applyAlarmLimitChanges(alarmLimits, changes);
    publishLimits();
  };

  const build = (): VentilatorConsoleAdapter => {
    // Shown once its start time is committed (one tick later), never with an invented time.
    const noData = options.live || telemetry.noDataSince === null ? null : noDataAlarm(telemetry.noDataSince);
    const withLimits = options.alarmLimits === true;

    // Without data the metrics are stale: no limit alarm (the no-data alarm says it).
    limitAlarms = withLimits && options.live ? evaluateAlarmLimits(alarmLimits, telemetry.metrics, Date.now(), limitAlarms) : [];

    return buildRealConsoleAdapter({
      frames: source.frames,
      sampleRateHz: telemetry.sampleRateHz,
      status: options.live ? "live" : "no-data",
      statusMessage: options.noDataMessage,
      metrics: telemetry.metrics,
      reported: telemetry.reported,
      // Without data the frame codes are as stale as the curves.
      alarms: mergeConsoleAlarms(deviceAlarms, options.live ? telemetry.frameAlarms : [], noData, limitAlarms),
      ...(options.canControl === undefined ? {} : { canControl: options.canControl }),
      readOnlyReason: options.readOnlyReason,
      pendingResetKey: options.pendingResetKey,
      ...(options.limits === undefined ? {} : { limits: options.limits }),
      inFlight: options.inFlight,
      ...(options.onConfirm === undefined ? {} : { onConfirm: options.onConfirm }),
      ...(options.modeOptionsFor === undefined ? {} : { modeOptionsFor: options.modeOptionsFor }),
      ...(withLimits ? { alarmLimits, onAlarmLimitsChange } : {}),
    });
  };
  const store = createExternalStore(build());
  const publish = (): void => store.set(reuseUnchangedSlices(store.getSnapshot(), build()));

  publishLimits = publish;

  return {
    store,
    ingest: (frames) => source.ingest(frames),
    setLive: (live, now) => source.setLive(live, now),
    setOptions(next) {
      options = next;
      publish();
    },
    applyAlarm(alarm) {
      deviceAlarms = applyDeviceAlarm(deviceAlarms, alarm);
      publish();
    },
    requestCommit: (request) => throttle?.request(request),
    startThrottle(intervalMs) {
      const own = createUiThrottle(() => {
        telemetry = source.snapshot(Date.now());
        publish();
      }, { intervalMs });

      throttle = own;

      return () => {
        own.dispose();

        if (throttle === own) {
          throttle = null;
        }
      };
    },
  };
}

type SourceEntry = { sourceId: string | null, target: SourceStore | null };

export function useRealConsoleAdapter({
  sourceId,
  live,
  noDataMessage = NO_DATA_ALARM_MESSAGE,
  canControl,
  readOnlyReason,
  pendingResetKey,
  limits,
  inFlight,
  onConfirm,
  modeOptionsFor,
  alarmLimits = false,
  uiThrottleMs = LIVE_UI_THROTTLE_MS,
}: UseRealConsoleAdapterOptions): ConsoleAdapterStore | null {
  const options = useMemo<CallerOptions>(
    () => ({ live, noDataMessage, canControl, readOnlyReason, pendingResetKey, limits, inFlight, onConfirm, modeOptionsFor, alarmLimits }),
    [live, noDataMessage, canControl, readOnlyReason, pendingResetKey, limits, inFlight, onConfirm, modeOptionsFor, alarmLimits],
  );
  // One store per source; its first snapshot uses the options of the render that creates it. A new source replaces
  // the entry during render (no effect round trip), like the console curve ring.
  const [entry, setEntry] = useState<SourceEntry>(() => ({ sourceId, target: sourceId === null ? null : createSourceStore(sourceId, options) }));
  let current = entry;

  if (entry.sourceId !== sourceId) {
    current = { sourceId, target: sourceId === null ? null : createSourceStore(sourceId, options) };
    setEntry(current);
  }

  const { target } = current;

  // The caller options reach the store at once (declared first, so the live toggle below commits with them).
  useEffect(() => {
    target?.setOptions(options);
  }, [target, options]);

  // At most one telemetry commit per uiThrottleMs (trailing); a new source (or unmount) drops the pending commit of
  // the previous one, so it can never land on the new store.
  useEffect(() => target?.startThrottle(uiThrottleMs), [target, uiThrottleMs]);

  // Without data the metrics of the last breaths are stale: restart the detection and raise the no-data alarm.
  // The status follows `live` at once; the dated no-data alarm and the cleared metrics are committed right after.
  useEffect(() => {
    if (target === null) {
      return undefined;
    }

    target.setLive(live, Date.now());
    const timer = setTimeout(() => target.requestCommit({ force: true }), 0);

    return () => clearTimeout(timer);
  }, [target, live]);

  useSocketEvent("ventilator:telemetry", (batch) => {
    if (target === null) {
      return;
    }

    target.ingest(batch.frames);
    target.requestCommit({ trailing: true });
  });

  useSocketEvent("ventilator:alarm", (alarm) => {
    target?.applyAlarm(alarm);
  });

  return target?.store ?? null;
}
