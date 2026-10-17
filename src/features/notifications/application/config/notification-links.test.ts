/*
* Funcionalidad: Notification deep links tests
* Descripción: Every known notification type resolves to its route with the ids of its data (URI-encoded), a type that needs ids gives null when they are missing, empty or not strings, an unknown type or a non-object data gives null, and nothing throws. Depends on vitest and the deep-link table.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { NOTIFICATION_LINKS, resolveNotificationLink } from "./notification-links";

describe("resolveNotificationLink", () => {
  it("covers every notification type of the API", () => {
    expect(Object.keys(NOTIFICATION_LINKS).sort()).toEqual([
      "EVALUATION_ACTIVATED",
      "FEEDBACK_READY",
      "GRADE_PUBLISHED",
      "RESERVATION_CANCELLED",
      "RESERVATION_PREEMPTED",
      "ROLE_CHANGED",
      "VENTILATOR_OFFLINE",
    ]);
  });

  it.each([
    ["RESERVATION_PREEMPTED", { reservationId: "r1", replacedByReservationId: "r2" }, "/lab/reservations"],
    ["RESERVATION_CANCELLED", { reservationId: "r1" }, "/lab/reservations"],
    ["EVALUATION_ACTIVATED", { evaluationId: "ev-1", assignmentId: "as-1" }, "/evaluations/ev-1"],
    ["GRADE_PUBLISHED", { evaluationId: "ev-1", attemptId: "at-1" }, "/evaluations/ev-1/attempts/at-1/result"],
    ["FEEDBACK_READY", { evaluationId: "ev-1", attemptId: "at-1", feedbackId: "f1" }, "/evaluations/ev-1/attempts/at-1/result"],
    ["ROLE_CHANGED", { previousRole: "STUDENT", newRole: "TEACHER" }, "/profile"],
    ["VENTILATOR_OFFLINE", { reservationId: "r1", reason: "timeout" }, "/lab"],
  ])("resolves %s", (type, data, expected) => {
    expect(resolveNotificationLink({ type, data })).toBe(expected);
  });

  it("encodes the ids", () => {
    expect(resolveNotificationLink({ type: "EVALUATION_ACTIVATED", data: { evaluationId: "a/b c" } })).toBe("/evaluations/a%2Fb%20c");
  });

  it.each([
    ["EVALUATION_ACTIVATED", {}],
    ["EVALUATION_ACTIVATED", { evaluationId: "" }],
    ["EVALUATION_ACTIVATED", { evaluationId: 42 }],
    ["GRADE_PUBLISHED", { evaluationId: "ev-1" }],
    ["GRADE_PUBLISHED", { attemptId: "at-1" }],
    ["FEEDBACK_READY", { evaluationId: "ev-1", attemptId: null }],
  ])("gives null for %s without its ids (%o)", (type, data) => {
    expect(resolveNotificationLink({ type, data })).toBeNull();
  });

  it("gives null for data that is not an object, for the types that need ids", () => {
    for (const data of [null, undefined, "ev-1", 3, ["ev-1"]]) {
      expect(resolveNotificationLink({ type: "GRADE_PUBLISHED", data })).toBeNull();
    }
  });

  it("still links the types that need no ids when data is null", () => {
    expect(resolveNotificationLink({ type: "RESERVATION_CANCELLED", data: null })).toBe("/lab/reservations");
    expect(resolveNotificationLink({ type: "ROLE_CHANGED", data: null })).toBe("/profile");
  });

  it("gives null for an unknown type and for prototype keys", () => {
    expect(resolveNotificationLink({ type: "SOMETHING_NEW", data: { evaluationId: "ev-1" } })).toBeNull();
    expect(resolveNotificationLink({ type: "toString", data: {} })).toBeNull();
    expect(resolveNotificationLink({ type: "__proto__", data: {} })).toBeNull();
  });
});
