/*
* Funcionalidad: useRealConsoleAdapter tests
* Descripción: Drives the live console adapter with a fake socket: batches reach the console listener synchronously
*   without one React render per batch (throttled commits), the reported settings/mode/vitals and the derived metrics
*   show after the throttle window, device alarms are added and cleared, the no-data state raises the synthetic alarm
*   and clears the metrics, the source is stable across renders and a new source id gives a new source. v1.1 (T5 review fix): a pending throttled commit of a previous source never overwrites the new source, the no-data alarm carries the time no-data started (never 0), and the frame alarm codes are hidden while there is no data. Depends on
*   Vitest, Testing Library and the lab test helpers.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VentilatorTelemetryFrame } from "@shared/realtime";
import { metricNumber } from "@shared/ventilator-console";
import type { ConsoleSampleBatch, VentilatorConsoleAdapter } from "@shared/ventilator-console";
import { createFakeSocket, renderLabHook } from "../pages/lab-test-helpers";
import { NO_DATA_ALARM_ID } from "../entities/telemetry-alarms";
import { useRealConsoleAdapter } from "./use-real-console-adapter";
import type { UseRealConsoleAdapterOptions } from "./use-real-console-adapter";

const SAMPLE_MS = 20;

/** Square volume-control breaths (RR 15, Ti 1 s): flow +30 L/min then -30 L/min decaying, PEEP 5, peak 20. */
function breathFrames(fromMs: number, breaths: number, extra: Partial<VentilatorTelemetryFrame> = {}): VentilatorTelemetryFrame[] {
  const frames: VentilatorTelemetryFrame[] = [];
  const perBreath = 4000 / SAMPLE_MS;

  for (let index = 0; index < breaths * perBreath; index += 1) {
    const t = (index % perBreath) * SAMPLE_MS;
    const inspiration = t < 1000;
    const volume = inspiration ? (500 * t) / 1000 : 500 * Math.exp(-(t - 1000) / 300);

    frames.push({
      serverTs: fromMs + index * SAMPLE_MS,
      pressure: inspiration ? 5 + volume / 50 + 5 : 5,
      flow: inspiration ? 30 : -(volume / 300) * 60,
      volume,
      deviceId: "vent-1",
      ...extra,
    });
  }

  return frames;
}

function renderAdapter(options: Partial<UseRealConsoleAdapterOptions> = {}) {
  const socket = createFakeSocket();
  let renders = 0;
  const view = renderLabHook<VentilatorConsoleAdapter | null, UseRealConsoleAdapterOptions>(
    (props: UseRealConsoleAdapterOptions) => {
      renders += 1;

      return useRealConsoleAdapter(props);
    },
    { socket, initialProps: { sourceId: "reservation-1", live: true, uiThrottleMs: 200, ...options } },
  );

  return { ...view, socket, renders: () => renders };
}

function current(adapter: VentilatorConsoleAdapter | null): VentilatorConsoleAdapter {
  if (adapter === null) {
    throw new Error("No adapter");
  }

  return adapter;
}

describe("useRealConsoleAdapter", () => {
  it("returns null without a source and a read-only console with a stable frame source otherwise", () => {
    const { result, rerender } = renderAdapter({ sourceId: null });
    expect(result.current).toBeNull();

    rerender({ sourceId: "reservation-1", live: true });
    const first = current(result.current);
    expect(first.permissions.canControl).toBe(false);
    expect(first.frames.sourceId).toBe("reservation-1");

    rerender({ sourceId: "reservation-1", live: true, readOnlyReason: "Sin control" });
    expect(current(result.current).frames.subscribe).toBe(first.frames.subscribe);
    expect(current(result.current).permissions.readOnlyReason).toBe("Sin control");

    rerender({ sourceId: "reservation-2", live: true });
    expect(current(result.current).frames.sourceId).toBe("reservation-2");
    expect(current(result.current).frames.subscribe).not.toBe(first.frames.subscribe);
  });

  it("delivers every batch to the curves synchronously while throttling the React commits", async() => {
    const { result, socket, renders } = renderAdapter();
    const listener = vi.fn<(batch: ConsoleSampleBatch) => void>();
    current(result.current).frames.subscribe(listener);
    const frames = breathFrames(10_000, 3, { settings: { peep: 5, fio2: 0.5, pressureLimit: 30 }, mode: "VCV", spo2: 96 });
    const before = renders();

    for (let index = 0; index < 6; index += 1) {
      socket.dispatch("ventilator:telemetry", { frames: frames.slice(index * 100, (index + 1) * 100), serverTs: 0 });
    }

    expect(listener).toHaveBeenCalledTimes(6);
    expect(listener.mock.calls.reduce((count, [batch]) => count + batch.samples.length, 0)).toBe(600);
    // One immediate commit for the first batch; the rest wait for the throttle window.
    expect(renders() - before).toBeLessThanOrEqual(2);

    // The trailing commit carries the state after the last batch.
    await waitFor(() => expect(metricNumber(current(result.current).metrics.totalRespiratoryRate)).not.toBeNull());
    const adapter = current(result.current);
    expect(adapter.settings.applied).toEqual({ peep: 5, fio2: 50 });
    expect(adapter.mode.current).toBe("VCV");
    expect(adapter.patient.values).toEqual({ spo2: 96 });
    expect(adapter.capabilities?.patientMonitor).toBe(true);
    expect(adapter.frames.sampleRateHz).toBe(50);
    expect(metricNumber(adapter.metrics.totalRespiratoryRate)).toBeCloseTo(15, 5);
    expect(metricNumber(adapter.metrics.peakPressure)).toBeCloseTo(19.8, 5);
    expect(adapter.metrics.peakPressure).toMatchObject({ derived: true });
    expect(metricNumber(adapter.metrics.plateauPressure)).toBeNull();
  });

  it("adds and clears device alarms and shows the frame alarm codes", async() => {
    const { result, socket } = renderAdapter();

    socket.dispatch("ventilator:alarm", {
      type: "APNEA",
      severity: "CRITICAL",
      message: "[CRITICAL] Apnea",
      currentValue: null,
      thresholdValue: null,
      timestamp: 1000,
      active: true,
      acknowledged: false,
    });
    expect(current(result.current).alarms).toEqual([{ id: "device:APNEA", type: "APNEA", priority: "high", message: "Apnea", since: 1000 }]);

    socket.dispatch("ventilator:telemetry", { frames: breathFrames(0, 1, { alarms: ["APNEA", "LOW_VOLUME"] }).slice(0, 5), serverTs: 0 });
    await waitFor(() => expect(current(result.current).alarms.map((alarm) => alarm.id)).toEqual(["device:APNEA", "frame:LOW_VOLUME"]));

    socket.dispatch("ventilator:alarm", {
      type: "APNEA",
      severity: "CRITICAL",
      message: "",
      currentValue: null,
      thresholdValue: null,
      timestamp: 2000,
      active: false,
      acknowledged: false,
    });
    expect(current(result.current).alarms.map((alarm) => alarm.id)).toEqual(["frame:APNEA", "frame:LOW_VOLUME"]);
  });

  it("marks the source without data, raises the synthetic alarm and clears the derived metrics", async() => {
    const { result, socket, rerender } = renderAdapter();

    socket.dispatch("ventilator:telemetry", { frames: breathFrames(0, 3), serverTs: 0 });
    await waitFor(() => expect(metricNumber(current(result.current).metrics.peakPressure)).not.toBeNull());

    rerender({ sourceId: "reservation-1", live: false, uiThrottleMs: 200 });
    await waitFor(() => expect(metricNumber(current(result.current).metrics.peakPressure)).toBeNull());
    const adapter = current(result.current);
    expect(adapter.frames.status).toBe("no-data");
    expect(adapter.frames.statusMessage).toBe("Equipo sin datos");
    expect(adapter.alarms[0]).toMatchObject({ id: NO_DATA_ALARM_ID, priority: "high", message: "Equipo sin datos" });

    rerender({ sourceId: "reservation-1", live: true, uiThrottleMs: 200 });
    expect(current(result.current).frames.status).toBe("live");
    expect(current(result.current).alarms).toEqual([]);
  });

  it("never lets a pending throttled commit of the previous source overwrite the new source", () => {
    vi.useFakeTimers();
    try {
      const { result, socket, rerender } = renderAdapter();
      act(() => vi.advanceTimersByTime(0));

      // A batch right after the first commit waits for the throttle window (200 ms).
      act(() => socket.dispatch("ventilator:telemetry", { frames: breathFrames(0, 1, { settings: { peep: 5 } }).slice(0, 3), serverTs: 0 }));
      act(() => vi.advanceTimersByTime(10));
      act(() => socket.dispatch("ventilator:telemetry", { frames: breathFrames(60, 1, { settings: { peep: 5 } }).slice(0, 3), serverTs: 0 }));
      // The live toggle commits at once (the throttled commit of reservation-1 is still pending).
      rerender({ sourceId: "reservation-1", live: false, uiThrottleMs: 200 });
      act(() => vi.advanceTimersByTime(0));

      rerender({ sourceId: "reservation-2", live: true, uiThrottleMs: 200 });
      act(() => socket.dispatch("ventilator:telemetry", { frames: breathFrames(0, 1, { settings: { peep: 8 } }).slice(0, 3), serverTs: 0 }));
      act(() => vi.advanceTimersByTime(0));
      expect(current(result.current).settings.applied).toEqual({ peep: 8 });

      act(() => vi.advanceTimersByTime(500));
      expect(current(result.current).settings.applied).toEqual({ peep: 8 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("dates the no-data alarm from when no-data started and never shows it with an invented time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(50_000);
    try {
      const { result, rerender } = renderAdapter({ live: false });

      // Before the start time is committed there is no alarm at all (the overlay already shows no-data).
      expect(current(result.current).frames.status).toBe("no-data");
      expect(current(result.current).alarms.some((alarm) => alarm.since === 0)).toBe(false);
      act(() => vi.advanceTimersByTime(0));
      expect(current(result.current).alarms[0]).toMatchObject({ id: NO_DATA_ALARM_ID, since: 50_000 });
      act(() => vi.advanceTimersByTime(1_000));
      expect(current(result.current).alarms[0]?.since).toBe(50_000);

      rerender({ sourceId: "reservation-1", live: true, uiThrottleMs: 200 });
      act(() => vi.advanceTimersByTime(1_000));
      rerender({ sourceId: "reservation-1", live: false, uiThrottleMs: 200 });
      act(() => vi.advanceTimersByTime(0));
      expect(current(result.current).alarms[0]?.since).toBe(52_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides the frame alarm codes while there is no data (they are stale)", async() => {
    const { result, socket, rerender } = renderAdapter();

    socket.dispatch("ventilator:telemetry", { frames: breathFrames(0, 1, { alarms: ["APNEA"] }).slice(0, 5), serverTs: 0 });
    await waitFor(() => expect(current(result.current).alarms.map((alarm) => alarm.id)).toEqual(["frame:APNEA"]));

    rerender({ sourceId: "reservation-1", live: false, uiThrottleMs: 200 });
    await waitFor(() => expect(current(result.current).alarms.map((alarm) => alarm.id)).toEqual([NO_DATA_ALARM_ID]));
  });
});
