/*
* Funcionalidad: Evaluation entities tests
* Descripción: Verifies the pure rules of the student evaluations feature: filtering and counting by state and type, choosing the assignment shown on the intro page (active first, then the next upcoming, then the latest closed), the intro action (start, continue the attempt in progress, or blocked with the reason for upcoming, closed, no attempts left or unavailable), the last submitted attempt, and the URL builders. Depends on vitest, the mappers, the entities, the URLs and the test helpers. v1.1 (Bloque 3): re-entry text and "Intento x de N".
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { toMyEvaluations } from "../../api/mappers/evaluations.mapper";
import { attemptDto, myEvaluationDto } from "../pages/evaluations-test-helpers";
import type { MyEvaluation } from "./evaluation.entity";
import {
  attemptOrdinalLabel,
  BLOCKED_REASONS,
  countByState,
  filterEvaluations,
  findIntroEvaluation,
  findLastSubmittedAttempt,
  resolveIntroAction,
} from "./evaluation.entity";
import { buildAttemptResultUrl, buildAttemptUrl, buildEvaluationIntroUrl } from "./evaluations-urls";

const list = toMyEvaluations([
  myEvaluationDto("as1", "e1", { evaluation: { type: "EXAM" } }),
  myEvaluationDto("as2", "e2", { evaluation: { type: "QUIZ" } }),
  myEvaluationDto("as3", "e3", { state: "UPCOMING", canStart: false, evaluation: { type: "QUIZ" } }),
  myEvaluationDto("as4", "e4", { state: "CLOSED", canStart: false, evaluation: { type: "WORKSHOP" } }),
]);

function single(overrides: Parameters<typeof myEvaluationDto>[2]): MyEvaluation {
  const [item] = toMyEvaluations([myEvaluationDto("as1", "e1", overrides)]);

  if (!item) {
    throw new Error("fixture without evaluation");
  }

  return item;
}

describe("filterEvaluations and countByState", () => {
  it("filters by state and optional type", () => {
    expect(filterEvaluations(list, "ACTIVE", null).map((item) => item.assignmentId)).toEqual(["as1", "as2"]);
    expect(filterEvaluations(list, "ACTIVE", "QUIZ").map((item) => item.assignmentId)).toEqual(["as2"]);
    expect(filterEvaluations(list, "CLOSED", "QUIZ")).toEqual([]);
  });

  it("counts per state for the selected type", () => {
    expect(countByState(list, null)).toEqual({ ACTIVE: 2, UPCOMING: 1, CLOSED: 1 });
    expect(countByState(list, "QUIZ")).toEqual({ ACTIVE: 1, UPCOMING: 1, CLOSED: 0 });
  });
});

describe("findIntroEvaluation", () => {
  it("prefers the active assignment, then the next upcoming, then the latest closed", () => {
    const assignments = toMyEvaluations([
      myEvaluationDto("closed-old", "e1", { state: "CLOSED", startsAt: "2026-09-01T00:00:00.000Z" }),
      myEvaluationDto("closed-new", "e1", { state: "CLOSED", startsAt: "2026-10-01T00:00:00.000Z" }),
      myEvaluationDto("upcoming-late", "e1", { state: "UPCOMING", startsAt: "2026-12-01T00:00:00.000Z" }),
      myEvaluationDto("upcoming-soon", "e1", { state: "UPCOMING", startsAt: "2026-11-01T00:00:00.000Z" }),
      myEvaluationDto("active", "e1"),
    ]);

    expect(findIntroEvaluation(assignments, "e1")?.assignmentId).toBe("active");
    expect(findIntroEvaluation(assignments.filter((item) => item.state !== "ACTIVE"), "e1")?.assignmentId).toBe("upcoming-soon");
    expect(findIntroEvaluation(assignments.filter((item) => item.state === "CLOSED"), "e1")?.assignmentId).toBe("closed-new");
    expect(findIntroEvaluation(assignments, "missing")).toBeNull();
  });
});

describe("resolveIntroAction", () => {
  it("starts when the backend allows it and there is no attempt in progress", () => {
    expect(resolveIntroAction(single({}))).toEqual({ kind: "start" });
  });

  it("continues the attempt in progress", () => {
    const evaluation = single({ attempts: [attemptDto("at1", 1, { status: "IN_PROGRESS", submittedAt: null })] });

    expect(resolveIntroAction(evaluation)).toEqual({ kind: "continue", attemptId: "at1" });
  });

  it("is blocked with a reason when the backend does not allow a start", () => {
    expect(resolveIntroAction(single({ state: "UPCOMING", canStart: false, startsAt: "2026-10-20T15:00:00.000Z" })))
      .toEqual({ kind: "blocked", reason: BLOCKED_REASONS.upcoming("2026-10-20T15:00:00.000Z") });
    expect(resolveIntroAction(single({ state: "CLOSED", canStart: false }))).toEqual({ kind: "blocked", reason: BLOCKED_REASONS.closed });
    expect(resolveIntroAction(single({
      canStart: false,
      attempts: [attemptDto("at1", 1), attemptDto("at2", 2)],
    }))).toEqual({ kind: "blocked", reason: BLOCKED_REASONS.alreadyTaken("2026-10-14T14:20:00.000Z", 2) });
    expect(resolveIntroAction(single({ canStart: false }))).toEqual({ kind: "blocked", reason: BLOCKED_REASONS.unavailable });
  });
});

describe("re-entry and attempt ordinal (Bloque 3)", () => {
  it("uses the July text when the only attempt was taken and counts granted attempts", () => {
    const taken = single({ canStart: false, attemptsAllowed: 1, attempts: [attemptDto("at1", 1)] });

    expect(resolveIntroAction(taken)).toEqual({
      kind: "blocked",
      reason: BLOCKED_REASONS.alreadyTaken("2026-10-14T14:20:00.000Z", 1),
    });
    expect(BLOCKED_REASONS.alreadyTaken("2026-10-14T14:20:00.000Z", 1)).toMatch(/^Ya realizaste esta evaluación el .+. Solo se permite un intento; contacta a tu docente si necesitas repetirla.$/);

    const granted = single({ canStart: true, attemptsAllowed: 2, attempts: [attemptDto("at1", 1)] });

    expect(resolveIntroAction(granted)).toEqual({ kind: "start" });
    expect(attemptOrdinalLabel(granted, { kind: "start" })).toBe("Intento 2 de 2");
    expect(attemptOrdinalLabel(single({ attemptsAllowed: 1 }), { kind: "start" })).toBeNull();
  });
});

describe("findLastSubmittedAttempt", () => {
  it("skips the attempt in progress", () => {
    const evaluation = single({
      attempts: [attemptDto("at2", 2, { status: "IN_PROGRESS", submittedAt: null }), attemptDto("at1", 1)],
    });

    expect(findLastSubmittedAttempt(evaluation)?.id).toBe("at1");
    expect(findLastSubmittedAttempt(single({}))).toBeNull();
  });
});

describe("evaluations URLs", () => {
  it("builds the student routes with encoded segments", () => {
    expect(buildEvaluationIntroUrl("e 1")).toBe("/evaluations/e%201");
    expect(buildAttemptUrl("e1", "at1")).toBe("/evaluations/e1/attempts/at1");
    expect(buildAttemptResultUrl("e1", "at1")).toBe("/evaluations/e1/attempts/at1/result");
  });
});
