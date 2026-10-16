/*
* Funcionalidad: useCasePreview tests
* Descripción: Behaviour of the case editor local preview hook with an injected fake worker (jsdom has no Worker):
*   it initialises the worker with the draft engine case and the fixed seed and starts it on "ready" (no session, no
*   request), feeds the console from the batches (status, metrics, simulated time), sends a valid CONFIRMAR as a
*   PARAM_CHANGE and shows it as applied only after the worker acknowledges it, refuses an invalid combination before
*   the worker, reports a refused change and a worker error, pauses, resumes, restarts with a new worker, terminates
*   the worker on unmount and reports a browser without Worker support. Depends on Vitest, Testing Library and the
*   sim-engine types. v1.1: a batch after a worker error keeps the error, the validation includes the changes waiting
*   for an acknowledgement, and a late batch of the previous worker is ignored after a restart.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EngineCase, EngineMetrics, SimBatch, SimCommand, SimWorkerClient, SimWorkerListener, SimWorkerMessage } from "@shared/sim-engine";
import { PREVIEW_HOOK_COPY, PREVIEW_SEED, useCasePreview } from "./use-case-preview";

type FakeWorker = SimWorkerClient & { sent: SimCommand[], emit: (message: SimWorkerMessage) => void, terminated: boolean };

function createFakeWorker(): FakeWorker {
  const listeners = new Set<SimWorkerListener>();
  const worker: FakeWorker = {
    sent: [],
    terminated: false,
    send(command) {
      worker.sent.push(command);
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    terminate() {
      worker.terminated = true;
      listeners.clear();
    },
    emit(message) {
      listeners.forEach((listener) => listener(message));
    },
  };

  return worker;
}

const ENGINE_CASE: EngineCase = {
  id: "c1",
  patient: { sex: "FEMALE", heightCm: 165 },
  mechanics: { complianceMlPerCmH2O: 30, resistanceCmH2OPerLps: 12 },
  effort: { amplitudeCmH2O: 0, rateBpm: 0, inspiratoryFraction: 0.35 },
  gasExchange: {
    vco2MlPerMin: 220,
    deadSpaceMl: 150,
    bicarbonateMmolPerL: 24,
    hemoglobinGPerDl: 13,
    arteriovenousO2DifferenceMlPerDl: 5,
    initialPaco2MmHg: 48,
    initialPao2MmHg: 62,
    paco2TimeConstantMin: 3,
    oxygenTimeConstantS: 30,
    shuntCurve: [{ peepCmH2O: 0, shuntFraction: 0.2 }],
  },
  hemodynamics: { baselineMapMmHg: 85, meanAirwayPressureThresholdCmH2O: 15, mapDropPerCmH2O: 1 },
  deterioration: { ratePerMin: 0, maxComplianceLossFraction: 0.3, maxShuntIncrease: 0.1 },
  initialSettings: { mode: "VCV", peepCmH2O: 8 },
  events: [],
  targets: { spo2Percent: { min: 88, max: 95 } },
};

function batch(overrides: Partial<SimBatch> = {}): SimBatch {
  return {
    simTimeMs: 1000,
    status: "running",
    backlogMs: 0,
    samples: [],
    droppedSamples: 0,
    metrics: null,
    alarms: [],
    appliedEvents: [],
    confirmedEvents: [],
    rejectedEvents: [],
    ...overrides,
  };
}

const METRICS = {
  simTimeMs: 2000,
  gasExchange: { spo2Percent: 92, pao2MmHg: 70, paco2MmHg: 45, ph: 7.36 },
  hemodynamics: { meanArterialPressureMmHg: 80 },
  ventilation: { minuteVolumeLpm: 7, totalRespiratoryRateBpm: 18 },
  lastCycle: null,
} as unknown as EngineMetrics;

function setup(engineCase: EngineCase | null = ENGINE_CASE) {
  const workers: FakeWorker[] = [];
  const createWorker = () => {
    const worker = createFakeWorker();

    workers.push(worker);

    return worker;
  };
  const hook = renderHook(({ value }) => useCasePreview(value, { createWorker }), { initialProps: { value: engineCase } });

  return { ...hook, workers };
}

describe("useCasePreview", () => {
  it("initialises the worker with the draft case and starts it when ready, without any request", () => {
    const { result, workers } = setup();
    const worker = workers[0];

    expect(worker?.sent[0]).toMatchObject({ type: "init", engineCase: ENGINE_CASE, seed: PREVIEW_SEED });
    expect(result.current.status).toBe("starting");

    act(() => worker?.emit({ type: "ready", engineVersion: "1.0.0" }));
    expect(worker?.sent.at(-1)).toEqual({ type: "start" });

    act(() => worker?.emit({ type: "batch", batch: batch({ simTimeMs: 2000, metrics: METRICS }) }));

    expect(result.current.status).toBe("running");
    expect(result.current.simTimeMs).toBe(2000);
    expect(result.current.adapter?.patient.values.spo2).toBe(92);
    expect(result.current.adapter?.permissions.canControl).toBe(true);
    expect(result.current.adapter?.ranges?.patient?.spo2).toEqual({ min: 88, max: 95 });
  });

  it("sends a valid change to the worker and shows it as applied only once acknowledged", () => {
    const { result, workers } = setup();
    const worker = workers[0];

    act(() => worker?.emit({ type: "batch", batch: batch() }));
    act(() => result.current.adapter?.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 10 }] }));

    const sent = worker?.sent.at(-1);

    expect(sent).toMatchObject({ type: "applyEvent", event: { type: "PARAM_CHANGE", changes: { peepCmH2O: 10 } } });
    expect(result.current.adapter?.settings.applied.peep).toBe(8);

    const id = sent?.type === "applyEvent" ? sent.event.id ?? "" : "";

    act(() => worker?.emit({ type: "batch", batch: batch({ confirmedEvents: [{ id, effectiveSimTimeMs: 1000 }] }) }));
    expect(result.current.adapter?.settings.applied.peep).toBe(10);
  });

  it("refuses an invalid combination before the worker, and reports a change the worker refused", () => {
    const { result, workers } = setup();
    const worker = workers[0];

    act(() => worker?.emit({ type: "batch", batch: batch() }));

    const before = worker?.sent.length ?? 0;

    act(() => result.current.adapter?.onConfirm({ mode: null, changes: [{ parameter: "inspiratoryTime", value: 5 }, { parameter: "respiratoryRate", value: 40 }] }));
    expect(worker?.sent.length).toBe(before);
    expect(result.current.changeError).not.toBeNull();

    act(() => result.current.dismissChangeError());
    act(() => result.current.adapter?.onConfirm({ mode: null, changes: [{ parameter: "peep", value: 10 }] }));

    const sent = worker?.sent.at(-1);
    const id = sent?.type === "applyEvent" ? sent.event.id ?? "" : "";

    act(() => worker?.emit({ type: "batch", batch: batch({ rejectedEvents: [{ event: { type: "PARAM_CHANGE", changes: { peepCmH2O: 10 }, id }, message: "invalid" }] }) }));
    expect(result.current.changeError).toBe(PREVIEW_HOOK_COPY.refused);
    expect(result.current.adapter?.settings.applied.peep).toBe(8);
  });

  it("pauses, resumes, reports a worker error and restarts with a new worker", () => {
    const { result, workers } = setup();
    const first = workers[0];

    act(() => result.current.pause());
    expect(first?.sent.at(-1)).toEqual({ type: "pause" });
    act(() => first?.emit({ type: "batch", batch: batch({ status: "paused" }) }));
    expect(result.current.status).toBe("paused");
    act(() => result.current.resume());
    expect(first?.sent.at(-1)).toEqual({ type: "resume" });

    act(() => first?.emit({ type: "error", message: "boom" }));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(PREVIEW_HOOK_COPY.workerFailed);

    act(() => result.current.restart());
    expect(first?.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(workers[1]?.sent[0]).toMatchObject({ type: "init" });
    expect(result.current.status).toBe("starting");
    expect(result.current.error).toBeNull();
  });

  it("keeps the error status when a batch arrives after a worker error, until restart", () => {
    const { result, workers } = setup();
    const worker = workers[0];

    act(() => worker?.emit({ type: "batch", batch: batch() }));
    act(() => worker?.emit({ type: "error", message: "boom" }));
    act(() => worker?.emit({ type: "batch", batch: batch({ simTimeMs: 3000 }) }));

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(PREVIEW_HOOK_COPY.workerFailed);
    expect(result.current.adapter?.permissions.canControl).toBe(false);
  });

  it("validates a change against the applied settings plus the changes still waiting for the worker", () => {
    const { result, workers } = setup();
    const worker = workers[0];

    act(() => worker?.emit({ type: "batch", batch: batch() }));
    // Ti 2.5 s is valid at the applied 14 /min; it is sent but not acknowledged yet.
    act(() => result.current.adapter?.onConfirm({ mode: null, changes: [{ parameter: "inspiratoryTime", value: 2.5 }] }));
    expect(worker?.sent.at(-1)).toMatchObject({ type: "applyEvent" });

    const before = worker?.sent.length ?? 0;

    // 25 /min alone is valid with the applied Ti 1 s, but not with the pending Ti 2.5 s.
    act(() => result.current.adapter?.onConfirm({ mode: null, changes: [{ parameter: "respiratoryRate", value: 25 }] }));
    expect(worker?.sent.length).toBe(before);
    expect(result.current.changeError).toBe(PREVIEW_HOOK_COPY.timing);
  });

  it("ignores a late batch of the previous worker after a restart", () => {
    const { result, workers } = setup();
    const first = workers[0];

    act(() => result.current.restart());
    act(() => first?.emit({ type: "batch", batch: batch({ simTimeMs: 9000, status: "paused" }) }));

    expect(result.current.status).toBe("starting");
    expect(result.current.simTimeMs).toBe(0);
  });

  it("stops and terminates the worker on unmount, and runs nothing without a case", () => {
    const { unmount, workers } = setup();

    unmount();
    expect(workers[0]?.sent.at(-1)).toEqual({ type: "stop" });
    expect(workers[0]?.terminated).toBe(true);

    const idle = setup(null);

    expect(idle.workers).toHaveLength(0);
    expect(idle.result.current.adapter).toBeNull();
  });

  it("reports a browser without Worker support", async() => {
    const { result } = renderHook(() => useCasePreview(ENGINE_CASE, { createWorker: () => null }));

    await waitFor(() => expect(result.current.status).toBe("unsupported"));
    expect(result.current.error).toBe(PREVIEW_HOOK_COPY.unsupported);
  });
});
