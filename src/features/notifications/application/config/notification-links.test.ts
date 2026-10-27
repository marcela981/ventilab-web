/*
* Funcionalidad: Notification deep links tests
* Descripción: Every notification type of the contract resolves to its route with the ids of its typed data (URI-encoded) and the routes match the route constants of the evaluations and ventilator-lab features; a type that needs ids gives null when its data is null, and a type unknown to this client gives null without throwing. Depends on vitest, the deep-link resolver and the evaluations and ventilator-lab barrels (route constants only). v1.1 (B2 closure): inputs are typed by the discriminated union (no untyped data cases), plus the parity with the feature route constants. v1.2 (W1 Bloque 1): VENTILATOR_OFFLINE opens the Conexión tab of the simulator workspace (/simulador?tab=conexion).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { buildAttemptResultUrl, EVALUATIONS_URL } from "@features/evaluations";
import { LAB_RESERVATIONS_URL, LAB_URL } from "@features/ventilator-lab";
import { NOTIFICATION_TYPES, resolveNotificationLink } from "./notification-links";
import type { NotificationLinkInput } from "./notification-links";

const CASES: [NotificationLinkInput, string][] = [
  [{ type: "RESERVATION_PREEMPTED", data: { reservationId: "r1", replacedByReservationId: "r2" } }, "/lab/reservations"],
  [{ type: "RESERVATION_CANCELLED", data: { reservationId: "r1" } }, "/lab/reservations"],
  [{ type: "EVALUATION_ACTIVATED", data: { evaluationId: "ev-1", assignmentId: "as-1" } }, "/evaluations/ev-1"],
  [{ type: "GRADE_PUBLISHED", data: { evaluationId: "ev-1", attemptId: "at-1" } }, "/evaluations/ev-1/attempts/at-1/result"],
  [{ type: "FEEDBACK_READY", data: { evaluationId: "ev-1", attemptId: "at-1", feedbackId: "f1" } }, "/evaluations/ev-1/attempts/at-1/result"],
  [{ type: "ROLE_CHANGED", data: { previousRole: "STUDENT", newRole: "TEACHER" } }, "/profile"],
  [{ type: "VENTILATOR_OFFLINE", data: { reservationId: "r1", reason: "timeout" } }, "/simulador?tab=conexion"],
];

describe("resolveNotificationLink", () => {
  it("covers every notification type of the API", () => {
    expect(CASES.map(([input]) => input.type)).toEqual([...NOTIFICATION_TYPES]);
  });

  it.each(CASES)("resolves %o", (input, expected) => {
    expect(resolveNotificationLink(input)).toBe(expected);
  });

  it("matches the route constants of the evaluations and lab features", () => {
    expect(resolveNotificationLink({ type: "GRADE_PUBLISHED", data: { evaluationId: "e 1", attemptId: "a/1" } }))
      .toBe(buildAttemptResultUrl("e 1", "a/1"));
    expect(resolveNotificationLink({ type: "EVALUATION_ACTIVATED", data: { evaluationId: "e1", assignmentId: "as1" } }))
      .toBe(`${EVALUATIONS_URL}/e1`);
    expect(resolveNotificationLink({ type: "RESERVATION_CANCELLED", data: { reservationId: "r1" } })).toBe(LAB_RESERVATIONS_URL);
    expect(resolveNotificationLink({ type: "VENTILATOR_OFFLINE", data: null })).toBe(LAB_URL);
  });

  it("encodes the ids", () => {
    expect(resolveNotificationLink({ type: "EVALUATION_ACTIVATED", data: { evaluationId: "a/b c", assignmentId: "as-1" } }))
      .toBe("/evaluations/a%2Fb%20c");
  });

  it("gives null for the types that need ids when data is null", () => {
    expect(resolveNotificationLink({ type: "EVALUATION_ACTIVATED", data: null })).toBeNull();
    expect(resolveNotificationLink({ type: "GRADE_PUBLISHED", data: null })).toBeNull();
    expect(resolveNotificationLink({ type: "FEEDBACK_READY", data: null })).toBeNull();
  });

  it("still links the types that need no ids when data is null", () => {
    expect(resolveNotificationLink({ type: "RESERVATION_CANCELLED", data: null })).toBe("/lab/reservations");
    expect(resolveNotificationLink({ type: "ROLE_CHANGED", data: null })).toBe("/profile");
  });

  it("gives null for a type unknown to this client", () => {
    // A runtime payload of a type added to the API after this build.
    const future = { type: "SOMETHING_NEW", data: null } as unknown as NotificationLinkInput;

    expect(resolveNotificationLink(future)).toBeNull();
  });
});
