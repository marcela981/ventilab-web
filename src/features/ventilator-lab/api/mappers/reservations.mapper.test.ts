/*
* Funcionalidad: Reservations mapper tests
* Descripción: The mapper switches on `visibility`: the full projection keeps the holder and group exactly as the backend returns them, the limited one keeps only the window, status and occupancy label (Spanish text for the known keys, the backend label for the group key and unknown keys); the current reservation keeps the backend control flag. v1.1 (T4): the holder user, holder group and creator ids of a full reservation. Depends on vitest and the mapper. v1.2 (S8): fixtures carry the regenerated block 1 contract fields (party code, current reservation relation).
*   v1.3 (W7, Bloque 1): fixtures and expectations follow the W7 contract (current reservation relation, holder student code, immediate booking, created reservation id).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { detailDto, summaryDto } from "../../application/pages/lab-test-helpers";
import { toCurrentReservation, toLabReservation } from "./reservations.mapper";

describe("toLabReservation", () => {
  it("keeps the holder and group of a full reservation as returned", () => {
    const reservation = toLabReservation(detailDto("r1", {
      holderType: "GROUP",
      holder: null,
      group: { id: "g1", name: "Grupo A" },
      purpose: "Práctica",
    }));

    expect(reservation).toEqual({
      visibility: "full",
      id: "r1",
      startsAt: "2026-10-16T14:00:00.000Z",
      endsAt: "2026-10-16T15:00:00.000Z",
      status: "SCHEDULED",
      holderType: "GROUP",
      holderRole: "STUDENT",
      holderName: null,
      holderCode: null,
      groupName: "Grupo A",
      holderUserId: null,
      groupId: "g1",
      createdById: null,
      purpose: "Práctica",
      preemptedReason: null,
    });
  });

  it("uses the holder identifier only when the backend sends no name", () => {
    const named = toLabReservation(detailDto("r1"));
    const unnamed = toLabReservation(detailDto("r2", {
      holder: { id: "u2", code: null, name: null, identifier: "ana@ventylab.demo", role: "STUDENT" },
    }));

    expect(named.visibility === "full" && named.holderName).toBe("Ana Gómez");
    // W7: the student code only as the staff projection sends it.
    expect(named.visibility === "full" && named.holderCode).toBeNull();
    expect(toLabReservation(detailDto("r3", {
      holder: { id: "u3", code: "2024123456", name: "Luis", identifier: "luis@ventylab.demo", role: "STUDENT" },
    }))).toMatchObject({ holderCode: "2024123456" });
    expect(unnamed.visibility === "full" && unnamed.holderName).toBe("ana@ventylab.demo");
  });

  it("keeps the holder user, holder group and creator ids of a full reservation (cancel permission)", () => {
    const reservation = toLabReservation(detailDto("r4", {
      holderType: "GROUP",
      group: { id: "g7", name: "Grupo B" },
      createdBy: { id: "u9", code: null, name: "Luis", identifier: "luis@ventylab.demo", role: "STUDENT" },
    }));

    expect(reservation).toMatchObject({ holderUserId: "u1", groupId: "g7", createdById: "u9" });
  });

  it("maps the student and teacher label keys to Spanish and never reads names from a limited reservation", () => {
    expect(toLabReservation(summaryDto("r3", "reservations.labels.student", "Reserved by a student"))).toEqual({
      visibility: "limited",
      id: "r3",
      startsAt: "2026-10-16T16:00:00.000Z",
      endsAt: "2026-10-16T17:00:00.000Z",
      status: "SCHEDULED",
      occupancyLabel: "Reservado por un estudiante",
    });
    expect(toLabReservation(summaryDto("r4", "reservations.labels.teacher", "Reserved by a teacher"))).toMatchObject({
      occupancyLabel: "Reservado por un docente",
    });
  });

  it("shows the backend label for the group key (it carries the group name) and for unknown keys", () => {
    const group = toLabReservation(summaryDto("r5", "reservations.labels.group_student", "Reservado por un estudiante del grupo B"));
    const unknown = toLabReservation(summaryDto("r6", "reservations.labels.other", "Ocupado"));

    expect(group).toMatchObject({ occupancyLabel: "Reservado por un estudiante del grupo B" });
    expect(unknown).toMatchObject({ occupancyLabel: "Ocupado" });
  });
});

describe("toCurrentReservation", () => {
  it("maps the reservation by its projection and keeps the control flag", () => {
    expect(toCurrentReservation({ reservation: null, canControl: false, relation: "none" })).toEqual({ reservation: null, canControl: false, relation: "none" });
    expect(toCurrentReservation({
      reservation: summaryDto("r7", "reservations.labels.student", "x") as never,
      canControl: false,
      relation: "none",
    })).toMatchObject({ reservation: { visibility: "limited", id: "r7" }, canControl: false });
    expect(toCurrentReservation({ reservation: detailDto("r8"), canControl: true, relation: "holder" })).toMatchObject({
      reservation: { visibility: "full", id: "r8" },
      canControl: true,
      relation: "holder",
    });
    // W7: an unknown relation (older backend) never grants anything.
    expect(toCurrentReservation({ reservation: null, canControl: false, relation: "other" as never }).relation).toBe("none");
  });
});
