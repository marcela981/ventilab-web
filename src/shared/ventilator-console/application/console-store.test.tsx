/*
* Funcionalidad: Console external store tests
* Descripción: Verifies the low-frequency console store (W2, Bloque 1): the store notifies only on a new snapshot
*   identity; the UI throttle publishes at most once per 250 ms window (≤ 4 per second) under 30 Hz updates and still
*   publishes the last values with its trailing publish, a forced request publishes at once and dispose drops the
*   pending one; unchanged adapter slices keep their identity (and an identical snapshot is the previous object); and
*   a component that selects one slice does not re-render when only another slice changes. Depends on Vitest and
*   Testing Library.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createExternalStore, createUiThrottle, reuseUnchangedSlices, sameData, useStoreSelector } from "./console-store";
import type { ExternalStore } from "./console-store";
import type { VentilatorConsoleAdapter } from "./ventilator-console.entity";

const UI_INTERVAL_MS = 250;
const BATCH_INTERVAL_MS = 1000 / 30;

afterEach(() => {
  vi.useRealTimers();
});

const subscribe = () => () => undefined;
const onConfirm = () => undefined;

/** A rebuilt adapter: new objects with the same content (the callbacks are stable, as the sources keep them). */
function buildAdapter(overrides: Partial<VentilatorConsoleAdapter> = {}): VentilatorConsoleAdapter {
  return {
    frames: { subscribe, sourceId: "s1" },
    settings: { current: { peep: 5 }, applied: { peep: 5 } },
    mode: { current: "VCV", options: [{ id: "VCV", label: "VCV" }] },
    metrics: { peakPressure: 20 },
    patient: { values: { spo2: 96 }, trends: { spo2: [95, 96] } },
    alarms: [],
    permissions: { canControl: true },
    limits: { peep: { min: 0, max: 20, step: 1, unit: "cmH2O" } },
    onConfirm,
    ...overrides,
  };
}

describe("createExternalStore", () => {
  it("notifies the subscribers only when the snapshot identity changes", () => {
    const first = { value: 1 };
    const store = createExternalStore(first);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(first);
    expect(listener).not.toHaveBeenCalled();

    store.set({ value: 1 });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.set({ value: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({ value: 2 });
  });
});

describe("createUiThrottle", () => {
  it("publishes at most four times per second under 30 Hz updates and shows the last values", () => {
    vi.useFakeTimers();
    let value = 0;
    const published: { atMs: number, value: number }[] = [];
    const throttle = createUiThrottle(() => published.push({ atMs: Date.now(), value }), { intervalMs: UI_INTERVAL_MS });
    const start = Date.now();

    // 3 s of 30 Hz batches, every one with new values (a fast replay carries metrics in every batch).
    for (let batch = 0; batch < 90; batch += 1) {
      value = batch;
      throttle.request({ trailing: true });
      vi.advanceTimersByTime(BATCH_INTERVAL_MS);
    }

    vi.advanceTimersByTime(UI_INTERVAL_MS);

    for (let second = 0; second < 3; second += 1) {
      const inSecond = published.filter((entry) => entry.atMs - start >= second * 1000 && entry.atMs - start < (second + 1) * 1000);

      expect(inSecond.length).toBeLessThanOrEqual(4);
    }

    published.slice(1).forEach((entry, index) => {
      expect(entry.atMs - (published[index]?.atMs ?? 0)).toBeGreaterThanOrEqual(UI_INTERVAL_MS);
    });
    // The trailing publish carries the last batch.
    expect(published.at(-1)?.value).toBe(89);
    throttle.dispose();
  });

  it("publishes a forced request at once, skips a non-trailing one inside the window and drops the pending one on dispose", () => {
    vi.useFakeTimers();
    const publish = vi.fn();
    const throttle = createUiThrottle(publish, { intervalMs: UI_INTERVAL_MS });

    throttle.request();
    expect(publish).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10);
    throttle.request();
    vi.advanceTimersByTime(UI_INTERVAL_MS);
    expect(publish).toHaveBeenCalledTimes(1);

    throttle.request({ force: true });
    expect(publish).toHaveBeenCalledTimes(2);

    throttle.request({ trailing: true });
    throttle.dispose();
    vi.advanceTimersByTime(UI_INTERVAL_MS);
    expect(publish).toHaveBeenCalledTimes(2);
  });
});

describe("reuseUnchangedSlices", () => {
  it("keeps the identity of every unchanged slice and of an identical snapshot", () => {
    const previous = buildAdapter();
    const sameContent = buildAdapter();

    expect(reuseUnchangedSlices(previous, sameContent)).toBe(previous);

    const next = reuseUnchangedSlices(previous, buildAdapter({ metrics: { peakPressure: 22 } }));

    expect(next).not.toBe(previous);
    expect(next.metrics).toEqual({ peakPressure: 22 });
    expect(next.settings).toBe(previous.settings);
    expect(next.patient).toBe(previous.patient);
    expect(next.limits).toBe(previous.limits);
    expect(next.alarms).toBe(previous.alarms);
  });

  it("compares plain data structurally and functions by identity", () => {
    const fn = () => undefined;

    expect(sameData({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(sameData({ a: [1, 2] }, { a: [1, 3] })).toBe(false);
    expect(sameData({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(sameData({ fn }, { fn })).toBe(true);
    expect(sameData({ fn }, { fn: () => undefined })).toBe(false);
  });
});

type Session = { metrics: { peak: number }, clock: number };

function MetricsReader({ store, onRender }: { store: ExternalStore<Session>, onRender: () => void }) {
  const metrics = useStoreSelector(store, (snapshot) => snapshot.metrics);

  onRender();

  return <p>{`Ppico ${metrics.peak}`}</p>;
}

function ClockReader({ store, onRender }: { store: ExternalStore<Session>, onRender: () => void }) {
  const clock = useStoreSelector(store, (snapshot) => snapshot.clock);

  onRender();

  return <p>{`Reloj ${clock}`}</p>;
}

describe("useStoreSelector", () => {
  it("does not re-render a metrics reader when only the clock changes", () => {
    const store = createExternalStore<Session>({ metrics: { peak: 20 }, clock: 0 });
    const metricsRenders = vi.fn();
    const clockRenders = vi.fn();

    render(
      <>
        <MetricsReader store={store} onRender={metricsRenders} />
        <ClockReader store={store} onRender={clockRenders} />
      </>,
    );
    expect(metricsRenders).toHaveBeenCalledTimes(1);
    expect(clockRenders).toHaveBeenCalledTimes(1);

    act(() => store.set({ ...store.getSnapshot(), clock: 1000 }));
    act(() => store.set({ ...store.getSnapshot(), clock: 2000 }));

    expect(screen.getByText("Reloj 2000")).toBeInTheDocument();
    expect(clockRenders).toHaveBeenCalledTimes(3);
    expect(metricsRenders).toHaveBeenCalledTimes(1);

    act(() => store.set({ ...store.getSnapshot(), metrics: { peak: 25 } }));

    expect(screen.getByText("Ppico 25")).toBeInTheDocument();
    expect(metricsRenders).toHaveBeenCalledTimes(2);
    expect(clockRenders).toHaveBeenCalledTimes(3);
  });

  it("keeps the previous selection when the equality check says it did not change", () => {
    const store = createExternalStore<Session>({ metrics: { peak: 20 }, clock: 0 });
    const renders = vi.fn();

    function Reader() {
      const metrics = useStoreSelector(store, (snapshot) => snapshot.metrics, sameData);

      renders();

      return <p>{metrics.peak}</p>;
    }

    render(<Reader />);
    act(() => store.set({ metrics: { peak: 20 }, clock: 5 }));

    expect(renders).toHaveBeenCalledTimes(1);
  });
});
