/*
* Funcionalidad: Groups mapper tests
* Descripción: Verifies the mapping of the backend group DTOs (GroupDTO, GroupDetailDTO, MyGroupsDTO, GroupSupervisionDTO, UserDTO) to the groups entities, and the create/update request bodies built from a group draft (trimmed values, omitted empty optionals on create, only changed fields with null to clear on update). Depends on vitest and the groups mappers. v1.2 (closure B1): UserDTO fixture carries isSuperadmin and studentCode.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { Group, GroupDraft } from "../../application/entities/group.entity";
import type { GroupDetailDTO, GroupDTO } from "../dtos/groups.dto";
import {
  toCreateGroupRequest,
  toGroup,
  toGroupDetail,
  toGroupSupervision,
  toMyGroups,
  toUpdateGroupRequest,
  toUserOption,
} from "./groups.mapper";

const groupDto: GroupDTO = {
  id: "g1",
  name: "UCI Mañana",
  description: "Rotación de la mañana",
  type: "STUDENT",
  parentGroupId: "g0",
  depth: 1,
  simulatorLeaderId: "s1",
  isActive: true,
  maxStudents: 12,
  enrollmentCode: "ABC123",
  semester: "2026-2",
  academicYear: "2026",
  createdBy: "t1",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
  leader: { id: "s1", name: "Luis Gómez", email: "luis@ventylab.demo" },
  creator: { id: "t1", name: "Ana Torres", email: "ana@ventylab.demo" },
  parentGroup: { id: "g0", name: "Medicina 2026", depth: 0 },
  subGroups: [],
  membersCount: 5,
  subGroupsCount: 0,
};

const group: Group = {
  id: "g1",
  name: "UCI Mañana",
  description: "Rotación de la mañana",
  type: "STUDENT",
  depth: 1,
  parentGroupId: "g0",
  parentGroupName: "Medicina 2026",
  isActive: true,
  maxStudents: 12,
  semester: "2026-2",
  academicYear: "2026",
  leader: { id: "s1", name: "Luis Gómez", email: "luis@ventylab.demo" },
  creator: { id: "t1", name: "Ana Torres", email: "ana@ventylab.demo" },
  membersCount: 5,
  subGroupsCount: 0,
};

const draft: GroupDraft = {
  name: "  UCI Mañana ",
  description: "",
  semester: " 2026-2 ",
  academicYear: "",
  maxStudents: "12",
  type: "STUDENT",
};

describe("toGroup", () => {
  it("keeps the fields the pages show and flattens the parent name", () => {
    expect(toGroup(groupDto)).toEqual(group);
  });

  it("maps a root group without parent, leader or creator", () => {
    expect(toGroup({ ...groupDto, parentGroupId: null, parentGroup: null, leader: null, creator: null })).toMatchObject({
      parentGroupId: null,
      parentGroupName: null,
      leader: null,
      creator: null,
    });
  });
});

describe("toGroupDetail", () => {
  it("adds the members with their user data", () => {
    const detail: GroupDetailDTO = {
      ...groupDto,
      members: [{
        id: "m1",
        groupId: "g1",
        userId: "s1",
        role: "STUDENT",
        memberRole: "LEADER",
        joinedAt: "2026-08-03T00:00:00.000Z",
        user: { id: "s1", name: "Luis Gómez", email: "luis@ventylab.demo", role: "STUDENT", image: null, createdAt: null },
      }],
    };

    expect(toGroupDetail(detail).members).toEqual([{
      userId: "s1",
      name: "Luis Gómez",
      email: "luis@ventylab.demo",
      image: null,
      platformRole: "STUDENT",
      memberRole: "LEADER",
      joinedAt: "2026-08-03T00:00:00.000Z",
    }]);
  });
});

describe("toMyGroups", () => {
  it("maps the student group with leader, members and supervising groups", () => {
    const result = toMyGroups({
      studentGroup: {
        id: "g1",
        name: "UCI Mañana",
        leader: { id: "s1", name: "Luis Gómez" },
        members: [{ userId: "s1", name: "Luis Gómez", memberRole: "LEADER" }],
        supervisingGroups: [{ id: "tg1", name: "Docentes UCI" }],
      },
      memberships: [{ groupId: "g1", groupName: "UCI Mañana", groupType: "STUDENT", isActive: true, memberRole: "LEADER" }],
    });

    expect(result.studentGroup).toEqual({
      id: "g1",
      name: "UCI Mañana",
      leader: { id: "s1", name: "Luis Gómez" },
      members: [{ userId: "s1", name: "Luis Gómez", memberRole: "LEADER" }],
      supervisingGroups: [{ id: "tg1", name: "Docentes UCI" }],
    });
    expect(result.memberships).toHaveLength(1);
  });

  it("keeps a missing student group as null", () => {
    expect(toMyGroups({ studentGroup: null, memberships: [] })).toEqual({ studentGroup: null, memberships: [] });
  });
});

describe("toGroupSupervision and toUserOption", () => {
  it("maps a supervision link", () => {
    expect(toGroupSupervision({
      teacherGroupId: "tg1",
      createdAt: "2026-08-01T00:00:00.000Z",
      studentGroup: { id: "g1", name: "UCI Mañana", isActive: false },
    })).toEqual({ teacherGroupId: "tg1", studentGroup: { id: "g1", name: "UCI Mañana", isActive: false } });
  });

  it("maps a user to a member option", () => {
    expect(toUserOption({
      id: "s2",
      email: "est02@ventylab.demo",
      name: null,
      image: null,
      role: "STUDENT",
      isActive: true,
      isSuperadmin: false,
      studentCode: "EST-02",
      emailVerified: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })).toEqual({ id: "s2", name: null, email: "est02@ventylab.demo", role: "STUDENT" });
  });
});

describe("toCreateGroupRequest", () => {
  it("trims values, omits empty optionals and parses the student limit", () => {
    expect(toCreateGroupRequest(draft)).toEqual({ name: "UCI Mañana", semester: "2026-2", maxStudents: 12, type: "STUDENT" });
  });

  it("adds the parent group of a subgroup", () => {
    expect(toCreateGroupRequest({ ...draft, maxStudents: "" }, "g0")).toEqual({
      name: "UCI Mañana",
      semester: "2026-2",
      type: "STUDENT",
      parentGroupId: "g0",
    });
  });
});

describe("toUpdateGroupRequest", () => {
  it("sends only the changed fields", () => {
    expect(toUpdateGroupRequest({
      ...draft,
      name: " UCI Tarde ",
      description: "Rotación de la mañana",
      academicYear: "2026",
    }, group)).toEqual({ name: "UCI Tarde" });
  });

  it("clears emptied optionals with null and removes the limit", () => {
    expect(toUpdateGroupRequest({ ...draft, name: "UCI Mañana", maxStudents: " " }, group)).toEqual({
      description: null,
      academicYear: null,
      maxStudents: null,
    });
  });
});

describe("student limit parsing (T11b review fix)", () => {
  it.each(["abc", "12.5", "0", "-3"])("never sends an invalid limit %j when creating", (maxStudents) => {
    expect(toCreateGroupRequest({ ...draft, maxStudents })).not.toHaveProperty("maxStudents");
  });

  it.each(["abc", "12.5", "0", "-3"])("never sends an invalid limit %j when updating", (maxStudents) => {
    expect(toUpdateGroupRequest({ ...draft, name: "UCI Mañana", description: "Rotación de la mañana", academicYear: "2026", maxStudents }, group))
      .toEqual({});
  });

  it("does not send an unchanged limit and sends a changed one", () => {
    const unchanged = { ...draft, name: "UCI Mañana", description: "Rotación de la mañana", academicYear: "2026" };

    expect(toUpdateGroupRequest({ ...unchanged, maxStudents: " 12 " }, group)).toEqual({});
    expect(toUpdateGroupRequest({ ...unchanged, maxStudents: "20" }, group)).toEqual({ maxStudents: 20 });
  });
});
