/*
* Funcionalidad: Live session entity tests
* Descripción: Access to /lab/live from the backend current reservation (console for whoever the backend lets control it, the occupancy label for anyone else, nothing reserved), the Spanish text of the join rejections and the reservation countdown format. v1.1 (T9 review fix B1): the remaining time exists only on a synchronised server clock (pending / unsynced → null, never the browser clock). Depends on vitest, the reservations mapper, the lab test fixtures and the live session entity.
*   v1.2 (W7, Bloque 1): fixtures and expectations follow the W7 contract (current reservation relation, holder student code, immediate booking, created reservation id).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { toLabReservation } from "../../api/mappers/reservations.mapper";
import { detailDto, summaryDto } from "../pages/lab-test-helpers";
import { formatReservationCountdown, joinRejectedMessage, resolveLiveAccess, sessionRemainingMs } from "./live-session.entity";

const full = toLabReservation(detailDto("r1"));
const limited = toLabReservation(summaryDto("r2", "reservations.labels.group_student", "Reservado por un estudiante del grupo B"));

describe("resolveLiveAccess", () => {
  it("opens the console for whoever the backend lets control the active reservation", () => {
    expect(resolveLiveAccess({ reservation: full, canControl: true, relation: "none" })).toEqual({ kind: "console", reservation: full });
  });

  it("shows only the backend occupancy label to anyone else", () => {
    expect(resolveLiveAccess({ reservation: limited, canControl: false, relation: "none" })).toEqual({
      kind: "busy",
      label: "Reservado por un estudiante del grupo B",
    });
  });

  it("reports nothing reserved", () => {
    expect(resolveLiveAccess({ reservation: null, canControl: false, relation: "none" })).toEqual({ kind: "none" });
    // Staff get canControl true even without a reservation: there is still no session to show.
    expect(resolveLiveAccess({ reservation: null, canControl: true, relation: "none" })).toEqual({ kind: "none" });
  });
});

describe("joinRejectedMessage", () => {
  it("translates the backend reasons and keeps a generic text for unknown ones", () => {
    expect(joinRejectedMessage("no_active_reservation")).toBe("No hay una reserva activa del ventilador en este momento.");
    expect(joinRejectedMessage("not_reservation_holder")).toBe("La reserva activa no es tuya ni de tu grupo.");
    expect(joinRejectedMessage("other")).toBe("El servidor no permitió entrar a la sala del ventilador.");
  });
});

describe("formatReservationCountdown", () => {
  it("shows mm:ss under one hour and h:mm:ss above, never negative", () => {
    expect(formatReservationCountdown(65_000)).toBe("01:05");
    expect(formatReservationCountdown(3_725_000)).toBe("1:02:05");
    expect(formatReservationCountdown(400)).toBe("00:01");
    expect(formatReservationCountdown(-5)).toBe("00:00");
  });
});

describe("sessionRemainingMs (T9 review fix B1)", () => {
  const endsAt = "2026-10-16T15:00:00.000Z";
  const now = Date.parse("2026-10-16T15:00:10.000Z");

  it("is null while the server clock is pending or unsynced, even when the browser clock is past the end", () => {
    expect(sessionRemainingMs(endsAt, now, { status: "pending", offsetMs: null })).toBeNull();
    expect(sessionRemainingMs(endsAt, now, { status: "unsynced", offsetMs: null })).toBeNull();
  });

  it("counts down on the synchronised server clock", () => {
    expect(sessionRemainingMs(endsAt, now, { status: "synced", offsetMs: -20_000 })).toBe(10_000);
    expect(sessionRemainingMs(endsAt, now, { status: "synced", offsetMs: 0 })).toBe(0);
  });
});
