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
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocketEvent } from "@shared/realtime";
import type { VentilatorTelemetryFrame } from "@shared/realtime";
import type {
  ConsoleAlarm,
  ConsoleConfirmation,
  ConsoleFrameSource,
  ConsoleLimits,
  ConsoleModeOption,
  ConsoleSettings,
  VentilatorConsoleAdapter,
} from "@shared/ventilator-console";
import { computeBreathMetrics, createBreathDetector, EMPTY_BREATH_METRICS } from "../entities/breath-detection";
import type { BreathMetrics } from "../entities/breath-detection";
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
  uiThrottleMs?: number
};

type Snapshot = {
  sourceId: string | null
  metrics: BreathMetrics
  reported: ReportedState
  frameAlarms: readonly ConsoleAlarm[]
  noDataSince: number | null
  sampleRateHz: number | undefined
};

type DeviceAlarms = { sourceId: string | null, alarms: readonly ConsoleAlarm[] };

const EMPTY_SNAPSHOT: Snapshot = {
  sourceId: null,
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
        sourceId,
        metrics: computeBreathMetrics(detector.breaths(), detector.latestMs()),
        reported,
        frameAlarms,
        noDataSince,
        sampleRateHz: hub.sampleRateHz(),
      };
    },
  };
}

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
  uiThrottleMs = LIVE_UI_THROTTLE_MS,
}: UseRealConsoleAdapterOptions): VentilatorConsoleAdapter | null {
  const source = useMemo(() => (sourceId === null ? null : createLiveSource(sourceId)), [sourceId]);
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [deviceAlarms, setDeviceAlarms] = useState<DeviceAlarms>({ sourceId: null, alarms: [] });
  const lastCommitRef = useRef(Number.NEGATIVE_INFINITY);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback((target: LiveSource) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const now = Date.now();
    lastCommitRef.current = now;
    setSnapshot(target.snapshot(now));
  }, []);

  const scheduleCommit = useCallback((target: LiveSource) => {
    if (timerRef.current !== null) {
      return;
    }

    const wait = uiThrottleMs - (Date.now() - lastCommitRef.current);

    if (wait <= 0) {
      commit(target);
    } else {
      timerRef.current = setTimeout(() => commit(target), wait);
    }
  }, [commit, uiThrottleMs]);

  // A new source (or unmount) drops the pending commit of the previous one.
  useEffect(() => () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    lastCommitRef.current = Number.NEGATIVE_INFINITY;
  }, [source]);

  // Without data the metrics of the last breaths are stale: restart the detection and raise the no-data alarm.
  // The status follows `live` at once; the dated no-data alarm and the cleared metrics are committed right after.
  useEffect(() => {
    if (source === null) {
      return undefined;
    }

    source.setLive(live, Date.now());
    const timer = setTimeout(() => commit(source), 0);

    return () => clearTimeout(timer);
  }, [source, live, commit]);

  useSocketEvent("ventilator:telemetry", (batch) => {
    if (source === null) {
      return;
    }

    source.ingest(batch.frames);
    scheduleCommit(source);
  });

  useSocketEvent("ventilator:alarm", (alarm) => {
    setDeviceAlarms((previous) => ({
      sourceId,
      alarms: applyDeviceAlarm(previous.sourceId === sourceId ? previous.alarms : [], alarm),
    }));
  });

  return useMemo(() => {
    if (source === null) {
      return null;
    }

    const current = snapshot.sourceId === source.sourceId ? snapshot : EMPTY_SNAPSHOT;
    const device = deviceAlarms.sourceId === source.sourceId ? deviceAlarms.alarms : [];
    // Shown once its start time is committed (one tick later), never with an invented time.
    const noData = live || current.noDataSince === null ? null : noDataAlarm(current.noDataSince);

    return buildRealConsoleAdapter({
      frames: source.frames,
      sampleRateHz: current.sampleRateHz,
      status: live ? "live" : "no-data",
      statusMessage: noDataMessage,
      metrics: current.metrics,
      reported: current.reported,
      // Without data the frame codes are as stale as the curves.
      alarms: mergeConsoleAlarms(device, live ? current.frameAlarms : [], noData),
      ...(canControl === undefined ? {} : { canControl }),
      readOnlyReason,
      pendingResetKey,
      ...(limits === undefined ? {} : { limits }),
      inFlight,
      ...(onConfirm === undefined ? {} : { onConfirm }),
      ...(modeOptionsFor === undefined ? {} : { modeOptionsFor }),
    });
  }, [source, snapshot, deviceAlarms, live, noDataMessage, canControl, readOnlyReason, pendingResetKey, limits, inFlight, onConfirm, modeOptionsFor]);
}
