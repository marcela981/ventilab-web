/*
* Funcionalidad: Simulation result and replay entity tests
* Descripción: Verifies the pure rules of the result and replay pages (T8): the determinism comparison of the local
*   replay final metrics with the server finalMetrics (match after a JSON round trip, mismatch with the differing
*   fields, unavailable without an object, missing server fields skipped), the evolution sampling, the rubric criteria
*   lookups, the summary mapper (unknown targets dropped, opaque breakdown items checked), the exam return URL and
*   store, the replay length, the event and alarm marks positioned by time and the engine version warning. Depends on
*   vitest, the engine replay and the simulator entities, mappers and stores. v1.1: the comparison is unavailable
*   without simTimeMs or with nothing clinical compared.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, replay } from "@shared/sim-engine";
import type { EngineMetrics } from "@shared/sim-engine";
import { toSessionSummary } from "../../api/mappers/simulator.mapper";
import { resolveExamReturnUrl } from "../pages/session-result.page";
import { summaryDto } from "../pages/simulator-test-helpers";
import { createExamReturnStore } from "../session/exam-return-store";
import { buildEngineCase, createMemoryStorage } from "../session/sim-session-test-helpers";
import { alarmOnsetMarks, eventMarks, markPosition, replayDurationMs, replayVersionWarning } from "./sim-replay.entity";
import { buildEvolution, compareFinalMetrics, safetyViolations, sampleIndexes, timeToStabilize } from "./sim-result.entity";

const EVENTS = [{ type: "PARAM_CHANGE" as const, simTimeMs: 3000, changes: { peepCmH2O: 8 } }];
const REPLAY = replay(buildEngineCase(), 42, EVENTS, 8000);

describe("compareFinalMetrics", () => {
  it("matches the server metrics of the same deterministic replay (after JSON)", () => {
    const server: unknown = JSON.parse(JSON.stringify(REPLAY.final));

    expect(compareFinalMetrics(REPLAY.final, server)).toEqual({ status: "match" });
  });

  it("lists the differing fields and target statuses", () => {
    const server = JSON.parse(JSON.stringify(REPLAY.final)) as { gasExchange: { spo2Percent: number }, targets: { id: string, status: string }[] };

    server.gasExchange.spo2Percent += 1;
    server.targets = REPLAY.final.targets.map((target) => ({ ...target, status: target.status === "MET" ? "UNMET" : "MET" }));

    const result = compareFinalMetrics(REPLAY.final, server);

    expect(result.status).toBe("mismatch");
    expect(result.status === "mismatch" ? result.differences.map((d) => d.field) : []).toEqual(
      expect.arrayContaining(["gasExchange.spo2Percent", `targets.${REPLAY.final.targets[0]?.id ?? ""}`]),
    );
  });

  it("is unavailable without an object, without simTimeMs or when nothing clinical was compared", () => {
    expect(compareFinalMetrics(REPLAY.final, null)).toEqual({ status: "unavailable" });
    expect(compareFinalMetrics(REPLAY.final, {})).toEqual({ status: "unavailable" });
    expect(compareFinalMetrics(REPLAY.final, { simTimeMs: REPLAY.final.simTimeMs })).toEqual({ status: "unavailable" });
    expect(compareFinalMetrics(REPLAY.final, { gasExchange: { spo2Percent: REPLAY.final.gasExchange.spo2Percent } })).toEqual({ status: "unavailable" });
  });

  it("skips the fields the server omits and compares the rest", () => {
    const partial = { simTimeMs: REPLAY.final.simTimeMs, gasExchange: { spo2Percent: REPLAY.final.gasExchange.spo2Percent } };

    expect(compareFinalMetrics(REPLAY.final, partial)).toEqual({ status: "match" });
    expect(compareFinalMetrics(REPLAY.final, { ...partial, simTimeMs: REPLAY.final.simTimeMs + 1000 }).status).toBe("mismatch");
  });
});

describe("evolution and criteria", () => {
  it("samples evenly and always keeps the last snapshot", () => {
    expect(sampleIndexes(5, 12)).toEqual([0, 1, 2, 3, 4]);
    expect(sampleIndexes(100, 4)).toEqual([0, 33, 66, 99]);
  });

  it("builds key metric series from the timeline", () => {
    const evolution = buildEvolution(REPLAY.metricsTimeline, REPLAY.final, 4);

    expect(evolution.timesMs.at(-1)).toBe(8000);
    expect(evolution.series.map((series) => series.id)).toEqual(["spo2", "paco2", "plateauPressure", "tidalVolumePerKg"]);
    expect(evolution.series[0]?.values).toHaveLength(evolution.timesMs.length);
  });

  it("finds the time to stabilise and the safety violations only when the rubric has them", () => {
    const summary = toSessionSummary(summaryDto({
      breakdown: [
        { criterion: "TIME_TO_STABILIZE", weight: 1, value: 42.5, threshold: 60, points: 1, weightedPoints: 0.5, justification: "ok" },
        { criterion: "SAFETY_VIOLATIONS", weight: 1, value: 0, threshold: 10, points: 1, weightedPoints: 0.5, justification: "none" },
      ],
    }));

    expect(timeToStabilize(summary)?.value).toBe(42.5);
    expect(safetyViolations(summary)?.value).toBe(0);
    expect(timeToStabilize(toSessionSummary(summaryDto()))).toBeNull();
  });
});

describe("toSessionSummary", () => {
  it("keeps known targets and checked breakdown items only", () => {
    const summary = toSessionSummary(summaryDto({
      targets: [{ id: "SPO2", status: "MET", value: 93, min: 88, max: 95 }, { id: "HEART_RATE", status: "MET" }, { nope: true }],
      breakdown: [{ criterion: "TARGETS_REACHED", points: 1 }, { points: 2 }],
    }));

    expect(summary.targets).toEqual([{ id: "SPO2", status: "MET", value: 93, min: 88, max: 95 }]);
    expect(summary.breakdown).toEqual([
      { criterion: "TARGETS_REACHED", weight: null, value: null, threshold: null, points: 1, weightedPoints: null, justification: "" },
    ]);
    expect(summary.score).toBe(0.82);
  });
});

describe("exam return", () => {
  it("links to the recorded attempt, otherwise to the evaluations list", () => {
    const storage = createMemoryStorage();
    const store = createExamReturnStore(() => storage);
    const link = { mode: "EXAM", attemptId: "a1", questionId: "q1" };

    expect(resolveExamReturnUrl("s1", link, store)).toBe("/evaluations");

    store.save("s1", { evaluationId: "e 1", attemptId: "a1" });

    expect(resolveExamReturnUrl("s1", link, store)).toBe("/evaluations/e%201/attempts/a1");
    expect(resolveExamReturnUrl("s1", { ...link, attemptId: "other" }, store)).toBe("/evaluations");

    storage.setItem("ventylab.simulator.exam-return.s2", "{broken");
    expect(store.read("s2")).toBeNull();
  });
});

describe("replay marks", () => {
  const recorded = [
    { id: "e1", type: "PARAM_CHANGE", simTimeMs: 2000, payload: { changes: { peepCmH2O: 8, fio2: 0.5 } } },
    { id: "e2", type: "AI_HELP", simTimeMs: 6000, payload: {} },
    { id: "e3", type: "ALARM_ACK", simTimeMs: 4000, payload: { alarmCode: "APNEA" } },
    { id: "e4", type: "START", simTimeMs: 0, payload: {} },
  ];

  it("positions the recorded events by time and ignores the ones without a mark", () => {
    const marks = eventMarks(recorded, 8000);

    expect(marks.map((mark) => [mark.id, mark.kind, mark.position])).toEqual([
      ["e1", "param", 25],
      ["e3", "alarmAck", 50],
      ["e2", "assist", 75],
    ]);
    expect(marks[0]?.label).toBe("Cambio de parámetros (2)");
    expect(markPosition(9000, 8000)).toBe(100);
    expect(markPosition(10, 0)).toBe(0);
  });

  it("marks each alarm onset once while it stays active", () => {
    const at = (simTimeMs: number, codes: string[]) => ({ simTimeMs, alarms: codes.map((code) => ({ code })) }) as unknown as EngineMetrics;
    const marks = alarmOnsetMarks([at(1000, []), at(2000, ["APNEA"]), at(3000, ["APNEA"]), at(4000, []), at(5000, ["APNEA"])], 10000);

    expect(marks.map((mark) => [mark.simTimeMs, mark.position, mark.kind])).toEqual([[2000, 20, "alarm"], [5000, 50, "alarm"]]);
  });

  it("uses the server time or the last event as the playback length", () => {
    expect(replayDurationMs(7000, recorded)).toBe(7000);
    expect(replayDurationMs(null, recorded)).toBe(6000);
  });

  it("warns on an engine mismatch with the server or with this browser", () => {
    expect(replayVersionWarning({ engineVersion: ENGINE_VERSION, currentEngineVersion: ENGINE_VERSION, engineVersionMismatch: false, warning: null })).toBeNull();
    expect(replayVersionWarning({ engineVersion: "0.9.0", currentEngineVersion: ENGINE_VERSION, engineVersionMismatch: true, warning: "Versión distinta" })).toBe("Versión distinta");
    expect(replayVersionWarning({ engineVersion: "0.9.0", engineVersionMismatch: false })).toContain("0.9.0");
  });
});
