/*
* Funcionalidad: VentilatorConsole store adapter tests
* Descripción: Verifies the console fed by a `ConsoleAdapterStore` (W2, Bloque 1): a snapshot that only changes the
*   alarms re-renders neither the numeric monitor nor the patient monitor nor the curves, a metrics change re-renders
*   only the numeric monitor, the console shell does not re-render when the layout is unchanged, and the frame
*   subscription survives every snapshot. The zone components are mocked as render counters. Depends on Vitest and
*   Testing Library.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Profiler } from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExternalStore, reuseUnchangedSlices } from "./console-store";
import { VentilatorConsole } from "./ventilator-console";
import type { VentilatorConsoleAdapter } from "./ventilator-console.entity";

const counts = vi.hoisted(() => ({ numeric: 0, patient: 0, curves: 0, alarms: 0 }));

vi.mock("./numeric-monitor", () => ({
  NumericMonitor: () => {
    counts.numeric += 1;

    return null;
  },
}));

vi.mock("./patient-monitor", () => ({
  PatientMonitor: () => {
    counts.patient += 1;

    return null;
  },
}));

vi.mock("./curves-zone", () => ({
  CurvesZone: () => {
    counts.curves += 1;

    return null;
  },
}));

vi.mock("./alarms-bar", () => ({
  AlarmsBar: () => {
    counts.alarms += 1;

    return null;
  },
}));

beforeEach(() => {
  counts.numeric = 0;
  counts.patient = 0;
  counts.curves = 0;
  counts.alarms = 0;
});

describe("VentilatorConsole with a store adapter", () => {
  it("re-renders only the zone whose slice changed and keeps one frame subscription", () => {
    const subscribe = vi.fn(() => () => undefined);
    const initial: VentilatorConsoleAdapter = {
      frames: { subscribe, sourceId: "s1" },
      settings: { current: { peep: 5 }, applied: { peep: 5 } },
      mode: { current: "VCV", options: [{ id: "VCV", label: "VCV" }] },
      metrics: { peakPressure: 20 },
      patient: { values: { spo2: 96 } },
      alarms: [],
      permissions: { canControl: true },
      limits: {},
      onConfirm: () => undefined,
    };
    const store = createExternalStore(initial);
    const publish = (next: Partial<VentilatorConsoleAdapter>) => {
      act(() => store.set(reuseUnchangedSlices(store.getSnapshot(), { ...store.getSnapshot(), ...next })));
    };
    let shellCommits = 0;

    render(
      <Profiler id="console" onRender={(_id, phase) => {
        if (phase === "update") {
          shellCommits += 1;
        }
      }}>
        <VentilatorConsole adapter={store} variant="live" />
      </Profiler>,
    );

    const after = { ...counts };

    publish({ alarms: [{ id: "APNEA", type: "APNEA", priority: "high", message: "Apnea", since: 0 }] });

    expect(counts.alarms).toBe(after.alarms + 1);
    expect(counts.numeric).toBe(after.numeric);
    expect(counts.patient).toBe(after.patient);
    expect(counts.curves).toBe(after.curves);

    publish({ metrics: { peakPressure: 22 } });

    expect(counts.numeric).toBe(after.numeric + 1);
    expect(counts.patient).toBe(after.patient);
    expect(counts.curves).toBe(after.curves);
    expect(counts.alarms).toBe(after.alarms + 1);

    // A rebuilt snapshot with the same content changes nothing at all.
    publish({ metrics: { peakPressure: 22 } });
    expect(counts.numeric).toBe(after.numeric + 1);

    // Two snapshots that changed something, two commits; the curves never re-render and the source stays subscribed.
    expect(shellCommits).toBe(2);
    expect(subscribe).toHaveBeenCalledTimes(1);
  });
});
