/*
* Funcionalidad: Simulation live state tests
* Descripción: The live state fold against the real engine through the simulation loop: after some breaths the console metrics carry the engine mean airway pressure of the last cycle and the flow extremes of that cycle taken from the same waveform samples the curves get. v0.1 (Bloque 5, C4): first version. Depends on Vitest, the sim-engine loop and the live state helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { createSimLoop, resolveVentilatorSettings } from "@shared/sim-engine";
import type { WaveformSample } from "@shared/sim-engine";
import { toConsoleMetrics } from "@shared/sim-engine/console-binding";
import { metricNumber } from "@shared/ventilator-console";
import { ingestBatch, initialLiveState } from "./sim-live-state";
import { buildEngineCase } from "./sim-session-test-helpers";

describe("simulation live state (C4)", () => {
  it("publishes Pmedia and the flow extremes of the last cycle from the engine output", () => {
    let nowMs = 0;
    const engineCase = buildEngineCase();
    const loop = createSimLoop(engineCase, 42, { clock: { now: () => nowMs } });
    const samples: WaveformSample[] = [];
    let live = initialLiveState(0);

    loop.start();

    for (let step = 0; step < 300; step += 1) {
      nowMs += 50;
      const batch = loop.tick();

      samples.push(...batch.samples);
      live = ingestBatch(live, batch);
    }

    const cycle = live.metrics?.lastCycle;

    expect(cycle).toBeTruthy();

    const inCycle = samples.filter((sample) => sample.simTimeMs >= cycle!.startMs && sample.simTimeMs < cycle!.endMs).map((sample) => sample.flowLpm);
    const metrics = toConsoleMetrics(live.metrics, resolveVentilatorSettings(engineCase.initialSettings), live.cycleFlow);

    expect(metricNumber(metrics.meanPressure)).toBe(cycle!.meanAirwayPressureCmH2O);
    expect(metricNumber(metrics.peakInspiratoryFlow)).toBe(Math.max(...inCycle));
    expect(metricNumber(metrics.peakExpiratoryFlow)).toBe(Math.min(...inCycle));
    expect(Math.max(...inCycle)).toBeGreaterThan(0);
    expect(Math.min(...inCycle)).toBeLessThan(0);
  });
});
