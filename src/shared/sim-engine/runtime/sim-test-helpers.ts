/*
* Funcionalidad: Simulation runtime test helpers
* Descripción: Test-only helpers for the sim-engine runtime: a minimal valid engine case (same values as the backend
*   engine test case builder) and a manual clock whose wall time the test advances explicitly. Depends on the engine
*   types and the simulation loop clock contract.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { EngineCase } from "../engine/engine.types";
import type { SimClock } from "./sim-loop";

export function buildTestCase(): EngineCase {
  return {
    id: "test-case",
    patient: { sex: "MALE", heightCm: 175 },
    mechanics: { complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10 },
    effort: { amplitudeCmH2O: 0, rateBpm: 0, inspiratoryFraction: 0.35 },
    gasExchange: {
      vco2MlPerMin: 200,
      deadSpaceMl: 150,
      bicarbonateMmolPerL: 24,
      hemoglobinGPerDl: 14,
      arteriovenousO2DifferenceMlPerDl: 5,
      initialPaco2MmHg: 40,
      initialPao2MmHg: 90,
      paco2TimeConstantMin: 3,
      oxygenTimeConstantS: 10,
      shuntCurve: [{ peepCmH2O: 0, shuntFraction: 0.05 }],
    },
    hemodynamics: { baselineMapMmHg: 85, meanAirwayPressureThresholdCmH2O: 15, mapDropPerCmH2O: 2 },
    deterioration: { ratePerMin: 0, maxComplianceLossFraction: 0.3, maxShuntIncrease: 0.2 },
    initialSettings: {
      mode: "VCV",
      tidalVolumeMl: 500,
      respiratoryRateBpm: 12,
      peepCmH2O: 5,
      fio2: 0.4,
      inspiratoryTimeS: 1,
      flowPattern: "SQUARE",
      inspiratoryPauseS: 0,
    },
    events: [],
    targets: {},
  };
}

export interface ManualClock extends SimClock {
  advance(ms: number): void;
}

export function createManualClock(startMs = 0): ManualClock {
  let nowMs = startMs;

  return {
    now: () => nowMs,
    advance(ms: number) {
      nowMs += ms;
    },
  };
}
