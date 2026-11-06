/*
* Funcionalidad: Server replay parity of the console worker
* Descripción: In an unstable ARDS case that deteriorates with no event at all (the student touches nothing), the
*   console worker loop (×4, same seed and slow-dynamics multiplier as a session) shows exactly the metrics that a
*   replay up to the same simulated time gives, so the server, which replays the same engine, analyzes what the screen
*   shows (fix sim-assist-current-state). The fingerprint of the metrics at 76.2 s is pinned here and in the server
*   parity test (ventylab-server engine-replay-parity.spec.ts): same vendored engine, case, seed and time.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { EngineCase, EngineMetrics } from "../engine/engine.types";
import { replay } from "../engine/simulation";
import { createSimLoop } from "./sim-loop";
import { createManualClock } from "./sim-test-helpers";

const SEED = 1984941366;
const SIM_TIME_MS = 76_200;
/** fnv1a of JSON.stringify(replay(...).final) at SIM_TIME_MS: the same value as the server parity test. */
const SERVER_METRICS_HASH = 3221113573;

// The server test case (buildTestCase of the backend engine specs with the unstable ARDS evolution), as plain data.
const PARITY_CASE = {
  id: "test-case",
  patient: { sex: "MALE", heightCm: 175 },
  mechanics: { complianceMlPerCmH2O: 30, resistanceCmH2OPerLps: 12 },
  effort: { amplitudeCmH2O: 0, rateBpm: 0, inspiratoryFraction: 0.35 },
  gasExchange: {
    vco2MlPerMin: 200,
    deadSpaceMl: 150,
    bicarbonateMmolPerL: 24,
    hemoglobinGPerDl: 14,
    arteriovenousO2DifferenceMlPerDl: 5,
    initialPaco2MmHg: 40,
    initialPao2MmHg: 60,
    paco2TimeConstantMin: 3,
    oxygenTimeConstantS: 10,
    shuntCurve: [
      { peepCmH2O: 0, shuntFraction: 0.45 },
      { peepCmH2O: 5, shuntFraction: 0.35 },
      { peepCmH2O: 10, shuntFraction: 0.22 },
      { peepCmH2O: 15, shuntFraction: 0.14 },
      { peepCmH2O: 20, shuntFraction: 0.11 },
    ],
  },
  hemodynamics: { baselineMapMmHg: 85, meanAirwayPressureThresholdCmH2O: 15, mapDropPerCmH2O: 2 },
  deterioration: { ratePerMin: 0.06, maxComplianceLossFraction: 0.3, maxShuntIncrease: 0.3 },
  initialSettings: { mode: "VCV", tidalVolumeMl: 500, respiratoryRateBpm: 12, peepCmH2O: 5, fio2: 0.4, inspiratoryTimeS: 1, flowPattern: "SQUARE", inspiratoryPauseS: 0 },
  events: [],
  targets: {},
  evolution: {
    initialSeverity: 0.3,
    minSeverity: 0.1,
    progressionRatePerMin: 0.06,
    viliRatePerMin: 0.02,
    recoveryRatePerMin: 0.04,
    arrestAfterCriticalMin: 4,
    deathAfterArrestMin: 2,
    baselineHeartRateBpm: 100,
  },
} as unknown as EngineCase;

function fnv1aHash(text: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash;
}

describe("server replay parity of the console worker", () => {
  it("gives the server fingerprint for the deterioration without events at 76.2 s", () => {
    const final = replay(PARITY_CASE, SEED, [], SIM_TIME_MS, { timeMultiplier: 4 }).final;

    expect(fnv1aHash(JSON.stringify(final))).toBe(SERVER_METRICS_HASH);
    expect(final.patient?.status).toBe("CRITICAL");
  });

  it("shows in the worker loop exactly what a replay up to the same simulated time gives", () => {
    const clock = createManualClock(0);
    const loop = createSimLoop(PARITY_CASE, SEED, { clock, multiplier: 4, engineOptions: { timeMultiplier: 4 } });
    let latest: EngineMetrics | null = null;

    loop.start();

    // 50 Hz frames of wall time at ×4 until 19.05 s (76.2 s simulated).
    for (let frame = 0; frame < 19_050 / 20; frame += 1) {
      clock.advance(20);

      const batch = loop.tick();

      latest = batch.metrics ?? latest;
    }

    expect(latest).not.toBeNull();

    const shown = latest as EngineMetrics;

    expect(shown.simTimeMs).toBeGreaterThan(70_000);
    expect(shown).toEqual(replay(PARITY_CASE, SEED, [], shown.simTimeMs, { timeMultiplier: 4 }).final);
  });
});
