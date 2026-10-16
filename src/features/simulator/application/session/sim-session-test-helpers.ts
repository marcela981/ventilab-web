/*
* Funcionalidad: Simulation session test helpers
* Descripción: Test doubles of the running session (T6): an engine case, a session record and boot data, a fake
*   simulation worker client that records the commands it receives and lets a test emit ready/batch/error messages
*   (jsdom has no Worker), a batch builder and an in-memory storage. Used only by tests. Depends on the sim-engine
*   public types and the session entities. v1.1: batches carry an empty `confirmedEvents` list by default.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { EngineCase, SimBatch, SimCommand, SimWorkerClient, SimWorkerListener, SimWorkerMessage } from "@shared/sim-engine";
import type { SessionBoot, SessionRecord } from "../entities/sim-session.entity";
import type { StorageLike } from "./session-store";

export function buildEngineCase(overrides: Partial<EngineCase> = {}): EngineCase {
  return {
    id: "case-1",
    patient: { sex: "MALE", heightCm: 175 },
    mechanics: { complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10 },
    effort: { amplitudeCmH2O: 0, rateBpm: 0, inspiratoryFraction: 0.35 } as EngineCase["effort"],
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
    initialSettings: { mode: "VCV", tidalVolumeMl: 500, respiratoryRateBpm: 12, peepCmH2O: 5, fio2: 0.4, inspiratoryTimeS: 1 },
    events: [],
    targets: { spo2Percent: { min: 88, max: 95 }, plateauPressureMaxCmH2O: 30 },
    ...overrides,
  } as EngineCase;
}

export function buildRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "s1",
    mode: "FREE",
    seed: 42,
    engineVersion: "1.0.0",
    timeMultiplier: 1,
    expiresAt: null,
    engineCase: buildEngineCase(),
    caseId: "case-1",
    fresh: false,
    ...overrides,
  };
}

export function buildBoot(overrides: Partial<SessionRecord> = {}, boot: Partial<Omit<SessionBoot, "record">> = {}): SessionBoot {
  return { record: buildRecord(overrides), initialEvents: [], startAtSimTimeMs: 0, ...boot };
}

export function buildBatch(overrides: Partial<SimBatch> = {}): SimBatch {
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

export type FakeWorker = SimWorkerClient & {
  sent: SimCommand[]
  emit: (message: SimWorkerMessage) => void
  terminated: boolean
};

export function createFakeWorker(): FakeWorker {
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

export function createMemoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();

  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}
