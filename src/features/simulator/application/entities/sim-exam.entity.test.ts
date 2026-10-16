/*
* Funcionalidad: Simulation exam entity tests
* Descripción: Verifies the pure rules of the EXAM practical part (T9): the exam context validation (app-relative
*   return URL only, unknown policy → null) and its round trip through the session store, the slot state from the
*   linked session and its status, the rubric rules read from the opaque question rubric (labels, passing score,
*   policy and the AI assist penalty), the server clock offset and the countdown to the deadline. Depends on vitest
*   and the simulator entities and stores.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { createSessionStore } from "../session/session-store";
import { buildRecord, createMemoryStorage } from "../session/sim-session-test-helpers";
import {
  deadlineRemainingMs,
  formatCountdown,
  measureServerOffsetMs,
  parseExamContext,
  practicalSlotState,
  readRubricRules,
} from "./sim-exam.entity";

const CONTEXT = {
  attemptId: "a1",
  questionId: "q1",
  evaluationId: "e1",
  returnUrl: "/evaluations/e1/attempts/a1",
  assistancePolicy: "ALLOWED_WITH_PENALTY",
  serverOffsetMs: -1500,
};

describe("exam context", () => {
  it("accepts a valid context and drops unsafe or malformed ones", () => {
    expect(parseExamContext(CONTEXT)).toEqual(CONTEXT);
    expect(parseExamContext({ ...CONTEXT, assistancePolicy: "ANYTHING", serverOffsetMs: "x", evaluationId: "" })).toMatchObject({
      assistancePolicy: null,
      serverOffsetMs: 0,
      evaluationId: null,
    });
    expect(parseExamContext({ ...CONTEXT, returnUrl: "https://evil.example/x" })).toBeNull();
    expect(parseExamContext({ ...CONTEXT, returnUrl: "//evil.example/x" })).toBeNull();
    expect(parseExamContext({ ...CONTEXT, attemptId: 3 })).toBeNull();
    expect(parseExamContext(null)).toBeNull();
  });

  it("survives a reload of the session store", () => {
    const storage = createMemoryStorage();

    createSessionStore(() => storage).save(buildRecord({ mode: "EXAM", exam: parseExamContext(CONTEXT) }));

    expect(createSessionStore(() => storage).read("s1")?.exam).toEqual(CONTEXT);
  });
});

describe("practical slot state", () => {
  it("derives not started, checking, in progress and completed", () => {
    expect(practicalSlotState(null, null)).toEqual({ status: "not_started" });
    expect(practicalSlotState("s9", null)).toEqual({ status: "checking", sessionId: "s9" });
    expect(practicalSlotState("s9", "ACTIVE")).toEqual({ status: "in_progress", sessionId: "s9" });
    expect(practicalSlotState("s9", "ENDED")).toEqual({ status: "completed", sessionId: "s9" });
    expect(practicalSlotState("s9", "EXPIRED")).toEqual({ status: "completed", sessionId: "s9" });
  });
});

describe("rubric rules", () => {
  it("reads criteria, passing score, policy and the AI assist penalty", () => {
    const rules = readRubricRules({
      assistancePolicy: "ALLOWED_WITH_PENALTY",
      passingScore: 70,
      criteria: [
        { type: "TIME_IN_RANGE", weight: 50, threshold: 0.7, windowMinutes: 5 },
        { type: "AI_ASSIST_USAGE", weight: 10, threshold: 0, penaltyPoints: 5 },
        { type: "BROKEN" },
      ],
    });

    expect(rules?.criteria.map((criterion) => criterion.label)).toEqual(["Tiempo en rango", "Uso de la asesoría IA"]);
    expect(rules).toMatchObject({ passingScore: 70, assistancePolicy: "ALLOWED_WITH_PENALTY", assistPenaltyPoints: 5 });
  });

  it("is null without a usable rubric", () => {
    expect(readRubricRules(null)).toBeNull();
    expect(readRubricRules({ criteria: [] })).toBeNull();
  });
});

describe("deadline clock", () => {
  it("measures the server offset at the midpoint of the request", () => {
    expect(measureServerOffsetMs("2026-10-16T14:10:00.000Z", Date.parse("2026-10-16T14:09:57.000Z"), Date.parse("2026-10-16T14:09:59.000Z"))).toBe(2000);
    expect(measureServerOffsetMs("not a date", 0, 10)).toBe(0);
  });

  it("counts down on the server clock and never goes below zero", () => {
    const deadline = "2026-10-16T15:00:00.000Z";
    const clientNow = Date.parse("2026-10-16T14:58:00.000Z");

    expect(deadlineRemainingMs(deadline, clientNow, 0)).toBe(120_000);
    expect(deadlineRemainingMs(deadline, clientNow, 30_000)).toBe(90_000);
    expect(deadlineRemainingMs(deadline, clientNow + 600_000, 0)).toBe(0);
    expect(deadlineRemainingMs(null, clientNow)).toBeNull();
    expect(formatCountdown(125_001)).toBe("2:06");
    expect(formatCountdown(3_723_000)).toBe("1:02:03");
    expect(formatCountdown(0)).toBe("0:00");
  });
});
