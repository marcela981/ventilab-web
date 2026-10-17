/*
* Funcionalidad: Preemption entities tests
* Descripción: The teacher-versus-teacher rule (a non-preemptable overlap with a teacher's or admin's reservation needs an admin; a student's 409 carries no roles), the create failure message that explains it, and the Spanish notice of a preempted reservation from the reservation:preempted event and from a RESERVATION_PREEMPTED notification (other notifications give none). Depends on vitest, the api-client ApiError and the lab entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { requiresAdminToPreempt } from "./create-reservation.entity";
import type { ReservationConflict, ReservationConflictItem } from "./create-reservation.entity";
import { CREATE_RESERVATION_ERROR_COPY, getCreateReservationFailureMessage } from "./lab-error-messages";
import { LAB_SETTING_DEFAULTS } from "./lab-settings.entity";
import { noticeFromNotification, noticeFromPreemptedEvent } from "./preemption-notice.entity";

const item = (holderRole: string | null): ReservationConflictItem => ({
  reservationId: "r1",
  holderType: "USER",
  holderRole,
  holderName: null,
  holderIdentifier: null,
  groupName: null,
  startsAt: "2026-10-16T15:00:00.000Z",
  endsAt: "2026-10-16T16:00:00.000Z",
});
const conflict = (preemptable: boolean, ...roles: (string | null)[]): ReservationConflict => ({ preemptable, conflicts: roles.map(item) });
const conflictError = (preemptable: boolean) => new ApiError({
  code: preemptable ? "reservations.conflict_preemptable" : "reservations.conflict",
  status: 409,
  message: "overlap",
});

describe("requiresAdminToPreempt", () => {
  it("is true only for a non-preemptable overlap with a teacher's or admin's reservation", () => {
    expect(requiresAdminToPreempt(conflict(false, "STUDENT", "TEACHER"))).toBe(true);
    expect(requiresAdminToPreempt(conflict(false, "ADMIN"))).toBe(true);
    expect(requiresAdminToPreempt(conflict(false, "STUDENT"))).toBe(false);
    // A student's 409 only carries the windows.
    expect(requiresAdminToPreempt(conflict(false, null))).toBe(false);
    expect(requiresAdminToPreempt(conflict(true, "STUDENT"))).toBe(false);
    expect(requiresAdminToPreempt(null)).toBe(false);
  });
});

describe("getCreateReservationFailureMessage", () => {
  it("says that only an admin can preempt a teacher's reservation", () => {
    expect(getCreateReservationFailureMessage(conflictError(false), conflict(false, "TEACHER"), LAB_SETTING_DEFAULTS))
      .toBe(CREATE_RESERVATION_ERROR_COPY.adminOnlyPreempt);
    expect(CREATE_RESERVATION_ERROR_COPY.adminOnlyPreempt).toMatch(/Solo un administrador/);
  });

  it("keeps the overlap and the other backend messages otherwise", () => {
    expect(getCreateReservationFailureMessage(conflictError(false), conflict(false, null), LAB_SETTING_DEFAULTS))
      .toBe(CREATE_RESERVATION_ERROR_COPY.overlap);
    expect(getCreateReservationFailureMessage(conflictError(true), conflict(true, "STUDENT"), LAB_SETTING_DEFAULTS))
      .toBe(CREATE_RESERVATION_ERROR_COPY.overlap);
    expect(getCreateReservationFailureMessage(new ApiError({ code: "reservations.limit_reached", status: 409, message: "x" }), null, LAB_SETTING_DEFAULTS))
      .toBe(CREATE_RESERVATION_ERROR_COPY.limitReached);
  });
});

describe("preemption notices", () => {
  const event = {
    reservationId: "r1",
    holderType: "USER" as const,
    groupId: null,
    startsAt: "2026-10-16T15:00:00.000Z",
    endsAt: "2026-10-16T16:00:00.000Z",
    reason: null,
    wasActive: false,
  };

  it("describes the preempted window in Bogota, the active case and the reason", () => {
    expect(noticeFromPreemptedEvent(event)).toEqual({
      reservationId: "r1",
      message: "Tu reserva del ventilador (vie, 16 de oct · 10:00 – 11:00) fue desplazada por un docente o administrador.",
    });
    expect(noticeFromPreemptedEvent({ ...event, wasActive: true, reason: "Clase demostrativa" }).message).toBe(
      "Tu reserva en curso del ventilador (vie, 16 de oct · 10:00 – 11:00) fue desplazada por un docente o administrador. Motivo: Clase demostrativa",
    );
  });

  it("uses the backend body of a RESERVATION_PREEMPTED notification and ignores other notifications", () => {
    const notification = {
      type: "RESERVATION_PREEMPTED" as const,
      title: "Tu reserva del ventilador fue desplazada",
      body: "Tu reserva fue reemplazada por otra reserva.",
      data: { reservationId: "r1", replacedByReservationId: "r2" },
    };

    expect(noticeFromNotification(notification)).toEqual({ reservationId: "r1", message: "Tu reserva fue reemplazada por otra reserva." });
    expect(noticeFromNotification({ ...notification, type: "GRADE_PUBLISHED" })).toBeNull();
    expect(noticeFromNotification({ ...notification, data: null })).toBeNull();
  });
});
