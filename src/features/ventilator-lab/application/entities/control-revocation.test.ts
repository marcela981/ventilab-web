/*
* Funcionalidad: Control revocation entity tests
* Descripción: Pure mapping of the live-session revocation sources (control-changed reasons, reservation:preempted,
*   countdown, a re-read without the session reservation) to the modal reason, their priority, the modal copy, the
*   successor line from the re-read (only the backend projection), the next action from canControl, and the
*   control-loss notice copy (takeover, presence timeout, release by staff, lost on re-read). Depends on vitest.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { VentilatorControlChangedReason } from "@shared/realtime";
import {
  controlLossNotice,
  mergeRevocation,
  nextActionAfterRevocation,
  REVOCATION_COPY,
  revocationFromControlEvent,
  revocationFromPreemption,
  revocationFromRead,
  revocationModal,
  isReservationTimeUp,
} from "./control-revocation.entity";
import type { CurrentReservation, FullReservation, LimitedReservation } from "./reservation.entity";

const full = (id: string, overrides: Partial<FullReservation> = {}): FullReservation => ({
  visibility: "full",
  id,
  startsAt: "2026-10-16T14:00:00.000Z",
  endsAt: "2026-10-16T15:00:00.000Z",
  status: "SCHEDULED",
  holderType: "USER",
  holderRole: "STUDENT",
  holderName: "Ana Gómez",
  groupName: null,
  purpose: null,
  preemptedReason: null,
  holderUserId: "u1",
  groupId: null,
  createdById: "u1",
  ...overrides,
});

const limited = (id: string, occupancyLabel: string): LimitedReservation => ({
  visibility: "limited",
  id,
  startsAt: "2026-10-16T14:00:00.000Z",
  endsAt: "2026-10-16T15:00:00.000Z",
  status: "SCHEDULED",
  occupancyLabel,
});

const current = (reservation: CurrentReservation["reservation"], canControl: boolean): CurrentReservation => ({ reservation, canControl });

describe("revocation sources", () => {
  const event = (reason: VentilatorControlChangedReason, reservationId = "r1") => ({ reservationId, operatorUserId: null, reason });

  it("maps only the reservation-over reasons of the session reservation", () => {
    expect(revocationFromControlEvent(event("reservation_preempted"), "r1")).toEqual({ reason: "reservation_preempted", detail: null });
    expect(revocationFromControlEvent(event("reservation_ended"), "r1")).toEqual({ reason: "reservation_ended", detail: null });

    for (const reason of ["taken", "takeover", "released", "presence_timeout"] as const) {
      expect(revocationFromControlEvent(event(reason), "r1")).toBeNull();
    }

    expect(revocationFromControlEvent(event("reservation_ended", "other"), "r1")).toBeNull();
  });

  it("maps reservation:preempted of the session reservation with the backend reason", () => {
    const preempted = { reservationId: "r1", holderType: "USER" as const, groupId: null, startsAt: "", endsAt: "", reason: "Práctica de docentes", wasActive: true };

    expect(revocationFromPreemption(preempted, "r1")).toEqual({ reason: "reservation_preempted", detail: "Práctica de docentes" });
    expect(revocationFromPreemption({ ...preempted, reason: "  " }, "r1")).toEqual({ reason: "reservation_preempted", detail: null });
    expect(revocationFromPreemption({ ...preempted, reservationId: "r2" }, "r1")).toBeNull();
  });

  it("ends the session when the countdown reaches zero (never without a readable countdown)", () => {
    expect(isReservationTimeUp(1)).toBe(false);
    expect(isReservationTimeUp(0)).toBe(true);
    expect(isReservationTimeUp(-5)).toBe(true);
    expect(isReservationTimeUp(null)).toBe(false);
  });

  it("ends the session when a re-read no longer gives the session reservation to the caller", () => {
    expect(revocationFromRead(current(full("r1"), true), "r1")).toBeNull();
    expect(revocationFromRead(current(full("r1"), false), "r1")).toEqual({ reason: "session_changed", detail: null });
    expect(revocationFromRead(current(full("r2"), true), "r1")).toEqual({ reason: "session_changed", detail: null });
    expect(revocationFromRead(current(null, false), "r1")).toEqual({ reason: "session_changed", detail: null });
  });

  it("keeps the most specific reason (preempted > ended > time up > changed) and the first detail", () => {
    const changed = { reason: "session_changed" as const, detail: null };
    const timeUp = { reason: "time_up" as const, detail: null };
    const preempted = { reason: "reservation_preempted" as const, detail: "Motivo" };

    expect(mergeRevocation(null, changed)).toEqual(changed);
    expect(mergeRevocation(changed, timeUp)).toEqual(timeUp);
    expect(mergeRevocation(timeUp, changed)).toEqual(timeUp);
    expect(mergeRevocation(timeUp, preempted)).toEqual(preempted);
    expect(mergeRevocation(preempted, { reason: "reservation_preempted", detail: null })).toEqual(preempted);
    expect(mergeRevocation({ reason: "reservation_preempted", detail: null }, preempted)).toEqual(preempted);
  });
});

describe("revocation modal", () => {
  it("has a title and an explanation per reason", () => {
    for (const reason of ["reservation_preempted", "reservation_ended", "time_up", "session_changed"] as const) {
      const modal = revocationModal({ reason, detail: null }, null, "r1");

      expect(modal.title).toBe(REVOCATION_COPY[reason].title);
      expect(modal.description).toBe(REVOCATION_COPY[reason].description);
      expect(modal.detail).toBeNull();
      expect(modal.successor).toBeNull();
    }
  });

  it("shows the preemption reason the backend sent", () => {
    expect(revocationModal({ reason: "reservation_preempted", detail: "Práctica" }, null, "r1").detail).toBe("Motivo: Práctica");
  });

  it("names the next holder only as the backend projection of the re-read gives it", () => {
    // Staff (full projection): the holder name or the group as returned.
    expect(revocationModal({ reason: "reservation_preempted", detail: null }, current(full("r2", { holderName: "Prof. Ruiz" }), true), "r1").successor)
      .toBe("Ahora el ventilador está reservado por: Prof. Ruiz");
    expect(revocationModal({ reason: "reservation_preempted", detail: null }, current(full("r2", { holderType: "GROUP", groupName: "B" }), true), "r1").successor)
      .toBe("Ahora el ventilador está reservado por: Grupo B");
    // Student (limited projection): only the occupancy label of the backend, never a name built on the client.
    expect(revocationModal({ reason: "reservation_preempted", detail: null }, current(limited("r2", "Reservado por un docente"), false), "r1").successor)
      .toBe("Ahora el ventilador está reservado por: Reservado por un docente");
    expect(revocationModal({ reason: "reservation_ended", detail: null }, current(null, false), "r1").successor).toBe(REVOCATION_COPY.free);
    // The re-read still returns the session reservation (not refreshed yet): nothing is said.
    expect(revocationModal({ reason: "time_up", detail: null }, current(full("r1"), true), "r1").successor).toBeNull();
  });

  it("decides the next action only from the re-read canControl of another reservation", () => {
    expect(nextActionAfterRevocation(current(full("r2"), true), "r1")).toBe("watch");
    expect(nextActionAfterRevocation(current(limited("r2", "x"), false), "r1")).toBe("leave");
    expect(nextActionAfterRevocation(current(null, false), "r1")).toBe("leave");
    // The backend still returns the ended reservation: never re-enter it.
    expect(nextActionAfterRevocation(current(full("r1"), true), "r1")).toBe("leave");
  });
});

describe("control loss notice", () => {
  it("names the new operator only when the backend gave the name", () => {
    expect(controlLossNotice({ reason: "takeover", operatorUserId: "u9" }, "Prof. Ruiz").text).toBe("Prof. Ruiz tomó el control del equipo.");
    expect(controlLossNotice({ reason: "takeover", operatorUserId: "u9" }, null).text).toBe("Otra persona tomó el control del equipo.");
    expect(controlLossNotice({ reason: "taken", operatorUserId: "u9" }, null).text).toBe("Otra persona tomó el control del equipo.");
  });

  it("explains a presence timeout, a release by staff and a loss found on a re-read", () => {
    expect(controlLossNotice({ reason: "presence_timeout", operatorUserId: null }, null).text).toBe(REVOCATION_COPY.loss.presenceTimeout);
    expect(controlLossNotice({ reason: "released", operatorUserId: null }, null).text).toBe(REVOCATION_COPY.loss.released);
    expect(controlLossNotice({ reason: "lost", operatorUserId: null }, null).text).toBe(REVOCATION_COPY.loss.lost);
    expect(controlLossNotice({ reason: "takeover", operatorUserId: "u9" }, null).readOnly).toBe(REVOCATION_COPY.loss.readOnly);
  });
});
