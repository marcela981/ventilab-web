/*
* Funcionalidad: My reservations entity tests
* Descripción: Pure tests of the "Mis reservas" model: split of GET /api/reservations/mine into upcoming (scheduled, ordered by start, the one in progress flagged) and past (cancelled, preempted, completed or ended, most recent first), the status label with "En curso", the client mirror of the backend cancel permission (admin; creator; holder user; leader of the holder group; teacher supervising the holder group; only scheduled reservations that have not ended; never a limited projection) and the Spanish messages of the cancel error codes. Depends on vitest, the api-client error and the lab entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { CANCEL_RESERVATION_ERROR_COPY, getCancelReservationErrorMessage, LAB_FALLBACK_MESSAGES } from "./lab-error-messages";
import { canCancelReservation, myReservationStatusLabel, splitMyReservations } from "./my-reservations.entity";
import type { CancelActor } from "./my-reservations.entity";
import type { FullReservation, LabReservation } from "./reservation.entity";

const NOW = new Date("2026-10-16T14:37:00.000Z");

const full = (id: string, overrides: Partial<FullReservation> = {}): FullReservation => ({
  visibility: "full",
  id,
  startsAt: "2026-10-16T16:00:00.000Z",
  endsAt: "2026-10-16T17:00:00.000Z",
  status: "SCHEDULED",
  holderType: "USER",
  holderRole: "STUDENT",
  holderName: "Ana Gómez",
  groupName: null,
  holderUserId: "someone",
  groupId: null,
  createdById: "someone",
  purpose: null,
  preemptedReason: null,
  ...overrides,
});

const actor = (overrides: Partial<CancelActor> = {}): CancelActor => ({
  userId: "me",
  role: "STUDENT",
  leadGroupIds: new Set<string>(),
  supervisedGroupIds: new Set<string>(),
  ...overrides,
});

describe("splitMyReservations", () => {
  it("lists scheduled reservations as upcoming by start and the rest as past, most recent first", () => {
    const later = full("later", { startsAt: "2026-10-17T14:00:00.000Z", endsAt: "2026-10-17T15:00:00.000Z" });
    const soon = full("soon");
    const running = full("running", { startsAt: "2026-10-16T14:00:00.000Z", endsAt: "2026-10-16T15:00:00.000Z" });
    const cancelled = full("cancelled", { status: "CANCELLED", startsAt: "2026-10-18T14:00:00.000Z", endsAt: "2026-10-18T15:00:00.000Z" });
    const preempted = full("preempted", { status: "PREEMPTED", preemptedReason: "Clase" });
    const completed = full("completed", { status: "COMPLETED", startsAt: "2026-10-16T13:00:00.000Z", endsAt: "2026-10-16T14:10:00.000Z" });
    const ended = full("ended", { startsAt: "2026-10-16T12:00:00.000Z", endsAt: "2026-10-16T13:00:00.000Z" });

    const split = splitMyReservations([later, cancelled, completed, soon, preempted, running, ended], NOW);

    expect(split.upcoming.map(({ id }) => id)).toEqual(["running", "soon", "later"]);
    expect(split.past.map(({ id }) => id)).toEqual(["cancelled", "preempted", "completed", "ended"]);
  });

  it("labels the scheduled reservation in progress as \"En curso\" and the others by backend status", () => {
    const running = full("running", { startsAt: "2026-10-16T14:00:00.000Z", endsAt: "2026-10-16T15:00:00.000Z" });

    expect(myReservationStatusLabel(running, NOW)).toBe("En curso");
    expect(myReservationStatusLabel(full("soon"), NOW)).toBe("Programada");
    expect(myReservationStatusLabel(full("p", { status: "PREEMPTED" }), NOW)).toBe("Desplazada");
    expect(myReservationStatusLabel(full("c", { status: "CANCELLED" }), NOW)).toBe("Cancelada");
    expect(myReservationStatusLabel(full("d", { status: "COMPLETED" }), NOW)).toBe("Finalizada");
  });
});

describe("canCancelReservation (mirror of reservation-access-policy.canCancel)", () => {
  it("lets the creator, the holder user and an admin cancel", () => {
    expect(canCancelReservation(full("r", { createdById: "me" }), actor(), NOW)).toBe(true);
    expect(canCancelReservation(full("r", { holderUserId: "me" }), actor(), NOW)).toBe(true);
    expect(canCancelReservation(full("r"), actor({ role: "ADMIN" }), NOW)).toBe(true);
    expect(canCancelReservation(full("r"), actor(), NOW)).toBe(false);
  });

  it("lets the leader of the holder group, and a teacher who supervises it, cancel a group reservation", () => {
    const group = full("g", { holderType: "GROUP", holderUserId: null, groupId: "g1", groupName: "Grupo A" });

    expect(canCancelReservation(group, actor({ leadGroupIds: new Set(["g1"]) }), NOW)).toBe(true);
    expect(canCancelReservation(group, actor(), NOW)).toBe(false);
    expect(canCancelReservation(group, actor({ role: "TEACHER", supervisedGroupIds: new Set(["g1"]) }), NOW)).toBe(true);
    // Supervision counts only for teachers, as in the backend policy.
    expect(canCancelReservation(group, actor({ supervisedGroupIds: new Set(["g1"]) }), NOW)).toBe(false);
    // Leading another group does not count.
    expect(canCancelReservation(group, actor({ leadGroupIds: new Set(["g2"]) }), NOW)).toBe(false);
  });

  it("allows only scheduled reservations that have not ended (also the one in progress)", () => {
    const mine = { createdById: "me" };

    expect(canCancelReservation(full("r", { ...mine, status: "CANCELLED" }), actor(), NOW)).toBe(false);
    expect(canCancelReservation(full("r", { ...mine, status: "PREEMPTED" }), actor(), NOW)).toBe(false);
    expect(canCancelReservation(full("r", { ...mine, status: "COMPLETED" }), actor(), NOW)).toBe(false);
    expect(canCancelReservation(full("r", { ...mine, endsAt: "2026-10-16T14:30:00.000Z" }), actor({ role: "ADMIN" }), NOW)).toBe(false);
    expect(canCancelReservation(
      full("r", { ...mine, startsAt: "2026-10-16T14:00:00.000Z", endsAt: "2026-10-16T15:00:00.000Z" }),
      actor(),
      NOW,
    )).toBe(true);
  });

  it("never offers cancel on a limited projection (other people's reservation seen by a student)", () => {
    const limited: LabReservation = {
      visibility: "limited",
      id: "x",
      startsAt: "2026-10-16T16:00:00.000Z",
      endsAt: "2026-10-16T17:00:00.000Z",
      status: "SCHEDULED",
      occupancyLabel: "Reservado por un estudiante",
    };

    expect(canCancelReservation(limited, actor(), NOW)).toBe(false);
  });
});

describe("getCancelReservationErrorMessage", () => {
  const error = (code: string, status: number) => new ApiError({ code, status, message: code });

  it("translates the backend cancel codes and falls back to the generic lab messages", () => {
    expect(getCancelReservationErrorMessage(error("reservations.cancel_forbidden", 403))).toBe(CANCEL_RESERVATION_ERROR_COPY.forbidden);
    expect(getCancelReservationErrorMessage(error("reservations.not_scheduled", 409))).toBe(CANCEL_RESERVATION_ERROR_COPY.notScheduled);
    expect(getCancelReservationErrorMessage(error("reservations.reservation_not_found", 404))).toBe(CANCEL_RESERVATION_ERROR_COPY.notFound);
    expect(getCancelReservationErrorMessage(error("common.internal_server_error", 500))).toBe(LAB_FALLBACK_MESSAGES.server);
  });
});
