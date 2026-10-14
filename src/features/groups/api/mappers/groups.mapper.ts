/*
* Funcionalidad: Groups mappers
* Descripción: Maps the backend group DTOs to the groups entities (Group with the parent name flattened, GroupDetail with members, the student's own group, supervisions, member options from UserDTO) and builds the request bodies of the group form: create (trimmed values, empty optionals omitted, student limit parsed, optional parent group) and update (only the changed fields; an emptied optional or limit is sent as null, which the contract uses to clear it). Depends on the groups DTOs and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type {
  Group,
  GroupDetail,
  GroupDraft,
  GroupMember,
  GroupPerson,
  GroupSupervision,
  MyGroups,
  UserOption,
} from "../../application/entities/group.entity";
import type {
  CreateGroupRequestDTO,
  GroupDetailDTO,
  GroupDTO,
  GroupMemberDTO,
  GroupPersonDTO,
  GroupSupervisionDTO,
  MyGroupsDTO,
  UpdateGroupRequestDTO,
  UserDTO,
} from "../dtos/groups.dto";

function toPerson(person: GroupPersonDTO | null): GroupPerson | null {
  return person ? { id: person.id, name: person.name, email: person.email } : null;
}

export function toGroup(group: GroupDTO): Group {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    type: group.type,
    depth: group.depth,
    parentGroupId: group.parentGroupId,
    parentGroupName: group.parentGroup?.name ?? null,
    isActive: group.isActive,
    maxStudents: group.maxStudents,
    semester: group.semester,
    academicYear: group.academicYear,
    leader: toPerson(group.leader),
    creator: toPerson(group.creator),
    membersCount: group.membersCount,
    subGroupsCount: group.subGroupsCount,
  };
}

function toGroupMember(member: GroupMemberDTO): GroupMember {
  return {
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    image: member.user.image,
    platformRole: member.role,
    memberRole: member.memberRole,
    joinedAt: member.joinedAt,
  };
}

export function toGroupDetail(detail: GroupDetailDTO): GroupDetail {
  return { ...toGroup(detail), members: detail.members.map(toGroupMember) };
}

export function toMyGroups(mine: MyGroupsDTO): MyGroups {
  const group = mine.studentGroup;

  return {
    studentGroup: group
      ? {
          id: group.id,
          name: group.name,
          leader: group.leader ? { id: group.leader.id, name: group.leader.name } : null,
          members: group.members.map(({ userId, name, memberRole }) => ({ userId, name, memberRole })),
          supervisingGroups: group.supervisingGroups.map(({ id, name }) => ({ id, name })),
        }
      : null,
    memberships: mine.memberships.map(({ groupId, groupName, groupType, isActive, memberRole }) => ({
      groupId,
      groupName,
      groupType,
      isActive,
      memberRole,
    })),
  };
}

export function toGroupSupervision(supervision: GroupSupervisionDTO): GroupSupervision {
  const { id, name, isActive } = supervision.studentGroup;

  return { teacherGroupId: supervision.teacherGroupId, studentGroup: { id, name, isActive } };
}

export function toUserOption(user: UserDTO): UserOption {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function parseLimit(value: string): number | null {
  const trimmed = value.trim();

  return trimmed === "" ? null : Number(trimmed);
}

export function toCreateGroupRequest(draft: GroupDraft, parentGroupId?: string): CreateGroupRequestDTO {
  const request: CreateGroupRequestDTO = { name: draft.name.trim(), type: draft.type };
  const optionalText = { description: draft.description, semester: draft.semester, academicYear: draft.academicYear };

  for (const [field, value] of Object.entries(optionalText) as Array<[keyof typeof optionalText, string]>) {
    if (value.trim() !== "") {
      request[field] = value.trim();
    }
  }

  const maxStudents = parseLimit(draft.maxStudents);

  if (maxStudents !== null) {
    request.maxStudents = maxStudents;
  }

  if (parentGroupId) {
    request.parentGroupId = parentGroupId;
  }

  return request;
}

export function toUpdateGroupRequest(draft: GroupDraft, group: Group): UpdateGroupRequestDTO {
  const request: UpdateGroupRequestDTO = {};
  const name = draft.name.trim();

  if (name !== group.name) {
    request.name = name;
  }

  const optionalText = { description: draft.description, semester: draft.semester, academicYear: draft.academicYear };

  for (const [field, value] of Object.entries(optionalText) as Array<[keyof typeof optionalText, string]>) {
    const next = value.trim() === "" ? null : value.trim();

    if (next !== group[field]) {
      request[field] = next;
    }
  }

  const maxStudents = parseLimit(draft.maxStudents);

  if (maxStudents !== group.maxStudents) {
    request.maxStudents = maxStudents;
  }

  return request;
}
