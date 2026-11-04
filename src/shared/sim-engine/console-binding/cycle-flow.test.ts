/*
* Funcionalidad: Cycle flow extremes tests
* Descripción: Unit tests of foldCycleFlow: the extremes come only from the samples of the completed cycle [startMs, endMs) (the first samples of the next breath do not count), the older samples are dropped and the newer kept, nothing changes until a new cycle arrives (same identity without samples), a cycle without samples gives null, a time that goes backwards starts over and the kept samples stay bounded. v0.1 (Bloque 5, C4): first version. Depends on Vitest and the cycle flow fold.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { CycleMetrics, WaveformSample } from "../engine/engine.types";
import { foldCycleFlow, INITIAL_CYCLE_FLOW, MAX_KEPT_SAMPLES } from "./cycle-flow";

const sample = (simTimeMs: number, flowLpm: number): WaveformSample => ({ simTimeMs, flowLpm, pressureCmH2O: 5, volumeMl: 0 });
const cycle = (cycleIndex: number, startMs: number, endMs: number) => ({ cycleIndex, startMs, endMs }) as CycleMetrics;

describe("foldCycleFlow", () => {
  it("takes the extremes of the completed cycle only and keeps the samples after it", () => {
    let state = foldCycleFlow(INITIAL_CYCLE_FLOW, [sample(0, 40), sample(1000, 55), sample(2000, -30), sample(3900, -2)], null);

    expect(state.peakInspiratoryFlow).toBeNull();
    // The next breath already started at 4000 with a higher flow: it does not count for cycle 0.
    state = foldCycleFlow(state, [sample(4000, 70), sample(4020, 70)], cycle(0, 0, 4000));

    expect(state).toMatchObject({ cycleIndex: 0, peakInspiratoryFlow: 55, peakExpiratoryFlow: -30 });
    expect(state.samples).toEqual([[4000, 70], [4020, 70]]);
  });

  it("changes nothing until a new cycle arrives", () => {
    const state = foldCycleFlow(INITIAL_CYCLE_FLOW, [sample(0, 10)], cycle(3, 0, 1));

    expect(foldCycleFlow(state, [], cycle(3, 0, 1))).toBe(state);
    expect(foldCycleFlow(state, [sample(20, 12)], cycle(3, 0, 1))).toMatchObject({ cycleIndex: 3, peakInspiratoryFlow: 10 });
  });

  it("gives null for a cycle it has no samples of", () => {
    expect(foldCycleFlow(INITIAL_CYCLE_FLOW, [sample(9000, 10)], cycle(5, 4000, 8000))).toMatchObject({ peakInspiratoryFlow: null, peakExpiratoryFlow: null });
  });

  it("starts over when the time goes backwards and stays bounded", () => {
    const later = foldCycleFlow(INITIAL_CYCLE_FLOW, [sample(50_000, 10)], null);

    expect(foldCycleFlow(later, [sample(0, 20)], null).samples).toEqual([[0, 20]]);

    const many = Array.from({ length: MAX_KEPT_SAMPLES + 10 }, (_, index) => sample(index * 20, 1));

    expect(foldCycleFlow(INITIAL_CYCLE_FLOW, many, null).samples).toHaveLength(MAX_KEPT_SAMPLES);
  });
});
