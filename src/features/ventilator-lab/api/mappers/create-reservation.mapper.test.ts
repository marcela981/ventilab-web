/*
* Funcionalidad: Create reservation mapper tests
* Descripción: The request body (caller, group and user holders, end from the duration, trimmed purpose omitted when empty, confirmPreempt only when set), the parsing of the 409 conflict details (malformed payloads yield null, missing fields become null) and the holder options built from the groups and users endpoints (a student only gets the active student groups they lead; names as returned, the email when a user has no name). Depends on vitest and the mapper.
*   v1.1 (W7, Bloque 1): fixtures and expectations follow the W7 contract (current reservation relation, holder student code, immediate booking, created reservation id).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { SELF_HOLDER } from "../../application/entities/create-reservation.entity";
import { groupDto, myGroupsDto, userDto } from "../../application/pages/lab-test-helpers";
import {
  ledGroupOptions,
  managedGroupOptions,
  toCreateReservationBody,
  toReservationConflict,
  userHolderOption,
} from "./create-reservation.mapper";

const startsAt = new Date("2026-10-16T15:00:00.000Z");

describe("toCreateReservationBody", () => {
  it("books for the caller without a user id and omits an empty purpose", () => {
    expect(toCreateReservationBody({ holder: SELF_HOLDER, startsAt, durationMinutes: 45, purpose: "   " })).toEqual({
      holderType: "USER",
      startsAt: "2026-10-16T15:00:00.000Z",
      endsAt: "2026-10-16T15:45:00.000Z",
    });
  });

  it("sends the group or user holder, the trimmed purpose and confirmPreempt when set", () => {
    const group = { kind: "group" as const, key: "g1", holderType: "GROUP" as const, userId: null, groupId: "g1", label: "Grupo A" };
    const user = { kind: "user" as const, key: "u9", holderType: "USER" as const, userId: "u9", groupId: null, label: "Luis" };

    expect(toCreateReservationBody({ holder: group, startsAt, durationMinutes: 15, purpose: " Práctica " })).toEqual({
      holderType: "GROUP",
      groupId: "g1",
      startsAt: "2026-10-16T15:00:00.000Z",
      endsAt: "2026-10-16T15:15:00.000Z",
      purpose: "Práctica",
    });
    expect(toCreateReservationBody({ holder: user, startsAt, durationMinutes: 15, purpose: "", confirmPreempt: true }))
      .toMatchObject({ holderType: "USER", userId: "u9", confirmPreempt: true });
  });

  it("W7: books an immediate reservation with the duration and no window", () => {
    const group = { kind: "group" as const, key: "g1", holderType: "GROUP" as const, userId: null, groupId: "g1", label: "Grupo A" };

    expect(toCreateReservationBody({ holder: SELF_HOLDER, startsAt: null, durationMinutes: 30, purpose: "" })).toEqual({
      holderType: "USER",
      durationMinutes: 30,
    });
    expect(toCreateReservationBody({ holder: group, startsAt: null, durationMinutes: 60, purpose: " Repaso ", confirmPreempt: true })).toEqual({
      holderType: "GROUP",
      groupId: "g1",
      durationMinutes: 60,
      purpose: "Repaso",
      confirmPreempt: true,
    });
  });

  it("W7: rejects an immediate duration the backend does not accept", () => {
    expect(() => toCreateReservationBody({ holder: SELF_HOLDER, startsAt: null, durationMinutes: 20, purpose: "" })).toThrow(RangeError);
  });
});

describe("toReservationConflict", () => {
  it("parses the conflict details of a 409", () => {
    expect(toReservationConflict({
      preemptable: true,
      conflicts: [
        { reservationId: "r1", holderType: "USER", holderRole: "STUDENT", holderName: "Ana", startsAt: "a", endsAt: "b" },
        { startsAt: "c", endsAt: "d" },
      ],
    })).toEqual({
      preemptable: true,
      conflicts: [
        {
          reservationId: "r1",
          holderType: "USER",
          holderRole: "STUDENT",
          holderName: "Ana",
          holderIdentifier: null,
          groupName: null,
          startsAt: "a",
          endsAt: "b",
        },
        {
          reservationId: null,
          holderType: null,
          holderRole: null,
          holderName: null,
          holderIdentifier: null,
          groupName: null,
          startsAt: "c",
          endsAt: "d",
        },
      ],
    });
  });

  it("returns null for missing or malformed details", () => {
    expect(toReservationConflict(null)).toBeNull();
    expect(toReservationConflict({ conflicts: [] })).toBeNull();
    expect(toReservationConflict({ preemptable: false, conflicts: "x" })).toBeNull();
    expect(toReservationConflict({ preemptable: false, conflicts: [{ startsAt: 1 }] })).toEqual({ preemptable: false, conflicts: [] });
  });
});

describe("holder options", () => {
  it("offers a student only the active student groups they lead", () => {
    const options = ledGroupOptions(myGroupsDto([
      { groupId: "g1", groupName: "Grupo A", groupType: "STUDENT", isActive: true, memberRole: "LEADER" },
      { groupId: "g2", groupName: "Grupo B", groupType: "STUDENT", isActive: true, memberRole: "MEMBER" },
      { groupId: "g3", groupName: "Grupo C", groupType: "STUDENT", isActive: false, memberRole: "LEADER" },
      { groupId: "t1", groupName: "Docentes", groupType: "TEACHER", isActive: true, memberRole: "LEADER" },
    ]));

    expect(options).toEqual([{ kind: "group", key: "g1", holderType: "GROUP", userId: null, groupId: "g1", label: "Grupo A" }]);
  });

  it("maps the managed groups list keeping only active groups", () => {
    expect(managedGroupOptions([groupDto("g1", "Grupo A"), groupDto("g2", "Grupo B", { isActive: false })]).map(({ key }) => key))
      .toEqual(["g1"]);
  });

  it("labels a user by the name returned, or the email when the name is empty", () => {
    expect(userHolderOption(userDto("u1", "Luis Pérez")).label).toBe("Luis Pérez");
    expect(userHolderOption(userDto("u2", null))).toEqual({
      kind: "user",
      key: "u2",
      holderType: "USER",
      userId: "u2",
      groupId: null,
      label: "u2@ventylab.demo",
    });
  });
});
