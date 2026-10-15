/*
* Funcionalidad: Evaluation assignment entities tests
* Descripción: Verifies the activation rules: READY-only activation, close-now and delete availability per state and attempts, the default window (next full hour, one week, Bogota wall clock), validation (groups, valid dates, end after start) and the request body with the Bogota window converted to UTC ISO. Depends on vitest and the assignment entities. v1.1 (A4 review W3/S4): delete for any state without attempts; an end that is not in the future is rejected.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  ACTIVATION_ERRORS,
  canActivate,
  canCloseAssignment,
  canDeleteAssignment,
  defaultActivationForm,
  toActivationBody,
  validateActivation,
} from "./evaluation-assignment.entity";
import type { EvaluationAssignment } from "./evaluation-assignment.entity";

const NO_ATTEMPTS = { inProgress: 0, submitted: 0, pendingReview: 0, graded: 0 };
// 2026-10-15 08:00 in Bogota.
const NOW = new Date("2026-10-15T13:00:00.000Z");

function assignment(overrides: Partial<EvaluationAssignment> = {}): EvaluationAssignment {
  return {
    id: "a1",
    groupId: "g1",
    groupName: "UCI",
    startsAt: "2026-10-20T13:00:00.000Z",
    endsAt: "2026-10-21T13:00:00.000Z",
    state: "UPCOMING",
    attemptCounts: NO_ATTEMPTS,
    ...overrides,
  };
}

describe("assignment actions", () => {
  it("activates READY evaluations only", () => {
    expect(canActivate("READY")).toBe(true);
    expect(canActivate("DRAFT")).toBe(false);
    expect(canActivate("ARCHIVED")).toBe(false);
  });

  it("closes upcoming and active activations", () => {
    expect(canCloseAssignment(assignment({ state: "UPCOMING" }))).toBe(true);
    expect(canCloseAssignment(assignment({ state: "ACTIVE" }))).toBe(true);
    expect(canCloseAssignment(assignment({ state: "CLOSED" }))).toBe(false);
  });

  it("deletes any activation without attempts, whatever its state", () => {
    expect(canDeleteAssignment(assignment())).toBe(true);
    expect(canDeleteAssignment(assignment({ state: "ACTIVE" }))).toBe(true);
    expect(canDeleteAssignment(assignment({ state: "CLOSED" }))).toBe(true);
    expect(canDeleteAssignment(assignment({ attemptCounts: { ...NO_ATTEMPTS, inProgress: 1 } }))).toBe(false);
    expect(canDeleteAssignment(assignment({ state: "CLOSED", attemptCounts: { ...NO_ATTEMPTS, graded: 2 } }))).toBe(false);
  });
});

describe("activation form", () => {
  it("defaults to the next full hour for one week, in Bogota time", () => {
    // 15:20 UTC is 10:20 in Bogota.
    expect(defaultActivationForm(new Date("2026-10-15T15:20:00.000Z"))).toEqual({
      groupIds: [],
      startsAt: "2026-10-15T11:00",
      endsAt: "2026-10-22T11:00",
    });
  });

  it("requires groups and valid dates with the end after the start", () => {
    expect(validateActivation({ groupIds: [], startsAt: "", endsAt: "2026-10-15T10:00" }, NOW)).toEqual({
      groupIds: ACTIVATION_ERRORS.groupsRequired,
      startsAt: ACTIVATION_ERRORS.startInvalid,
    });
    expect(validateActivation({ groupIds: ["g1"], startsAt: "2026-10-15T10:00", endsAt: "2026-10-15T10:00" }, NOW)).toEqual({
      endsAt: ACTIVATION_ERRORS.endBeforeStart,
    });
    expect(validateActivation({ groupIds: ["g1"], startsAt: "2026-10-15T10:00", endsAt: "bad" }, NOW)).toEqual({
      endsAt: ACTIVATION_ERRORS.endInvalid,
    });
  });

  it("requires the end to be in the future", () => {
    expect(validateActivation({ groupIds: ["g1"], startsAt: "2026-10-14T07:00", endsAt: "2026-10-15T08:00" }, NOW)).toEqual({
      endsAt: ACTIVATION_ERRORS.endNotFuture,
    });
    expect(validateActivation({ groupIds: ["g1"], startsAt: "2026-10-14T07:00", endsAt: "2026-10-15T08:01" }, NOW)).toEqual({});
    expect(toActivationBody({ groupIds: ["g1"], startsAt: "2026-10-14T07:00", endsAt: "2026-10-15T07:00" }, NOW)).toBeNull();
  });

  it("builds the body with the window in UTC", () => {
    expect(toActivationBody({ groupIds: ["g1", "g2"], startsAt: "2026-12-31T20:00", endsAt: "2027-01-02T08:00" }, NOW)).toEqual({
      groupIds: ["g1", "g2"],
      startsAt: "2027-01-01T01:00:00.000Z",
      endsAt: "2027-01-02T13:00:00.000Z",
    });
    expect(toActivationBody({ groupIds: [], startsAt: "2026-12-31T20:00", endsAt: "2027-01-02T08:00" }, NOW)).toBeNull();
  });
});
