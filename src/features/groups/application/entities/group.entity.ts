/*
* Funcionalidad: Group entities
* Descripción: Domain types of the groups feature (Group with its type STUDENT/TEACHER, leader and creator, GroupDetail with members, the student's own group with leader, members and supervising teacher groups, memberships, supervisions, member options for the user search and the create/edit draft), the Spanish labels of types and member roles, and the pure helpers of the group list: client-side filters (text ignoring case and accents, type, active state; `GET /api/groups` has no text search or pagination, decision 7), page slicing and the display name of a person. v1.1 (T11b): student limit parsing (integer >= 1, backend `@IsInt @Min(1)`), validation of the create/edit draft, the draft of an existing group, the management rule the UI mirrors (admins every group, teachers student groups; the backend scope still decides and a 403 is always handled) and the exclusion of current members from the user search. No dependencies.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type GroupType = "STUDENT" | "TEACHER";

export type GroupMemberRole = "LEADER" | "MEMBER";

export type GroupPerson = {
  id: string
  name: string | null
  email: string
};

export type Group = {
  id: string
  name: string
  description: string | null
  type: GroupType
  depth: number
  parentGroupId: string | null
  parentGroupName: string | null
  isActive: boolean
  maxStudents: number | null
  semester: string | null
  academicYear: string | null
  leader: GroupPerson | null
  creator: GroupPerson | null
  membersCount: number
  subGroupsCount: number
};

export type GroupMember = {
  userId: string
  name: string | null
  email: string
  image: string | null
  platformRole: "STUDENT" | "TEACHER"
  memberRole: GroupMemberRole
  joinedAt: string
};

export type GroupDetail = Group & {
  members: GroupMember[]
};

export type MyStudentGroup = {
  id: string
  name: string
  leader: { id: string, name: string | null } | null
  members: Array<{ userId: string, name: string | null, memberRole: GroupMemberRole }>
  supervisingGroups: Array<{ id: string, name: string }>
};

export type GroupMembership = {
  groupId: string
  groupName: string
  groupType: GroupType
  isActive: boolean
  memberRole: GroupMemberRole
};

export type MyGroups = {
  studentGroup: MyStudentGroup | null
  memberships: GroupMembership[]
};

export type GroupSupervision = {
  teacherGroupId: string
  studentGroup: { id: string, name: string, isActive: boolean }
};

export type UserOption = {
  id: string
  name: string | null
  email: string
  role: "STUDENT" | "TEACHER" | "ADMIN"
};

// Form values of the create/edit group form (slice B): text inputs, so the student limit is a string.
export type GroupDraft = {
  name: string
  description: string
  semester: string
  academicYear: string
  maxStudents: string
  type: GroupType
};

// TODO(i18n): move to a groups namespace in src/i18n.
export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  STUDENT: "Estudiantes",
  TEACHER: "Docentes",
};

export const MEMBER_ROLE_LABELS: Record<GroupMemberRole, string> = {
  LEADER: "Líder",
  MEMBER: "Integrante",
};

export const UNNAMED_PERSON = "Sin nombre";

export type GroupTypeFilter = "all" | GroupType;

export type GroupStatusFilter = "all" | "active" | "inactive";

export type GroupFilters = {
  text: string
  type: GroupTypeFilter
  status: GroupStatusFilter
};

export const EMPTY_GROUP_FILTERS: GroupFilters = { text: "", type: "all", status: "all" };

export function personName(person: { name: string | null, email?: string }): string {
  return person.name?.trim() || person.email || UNNAMED_PERSON;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function searchableText(group: Group): string {
  const people = [group.leader, group.creator].flatMap((person) => (person ? [person.name ?? "", person.email] : []));

  return normalize([
    group.name,
    group.description ?? "",
    group.semester ?? "",
    group.academicYear ?? "",
    group.parentGroupName ?? "",
    ...people,
  ].join(" "));
}

function matchesStatus(group: Group, status: GroupStatusFilter): boolean {
  return status === "all" || group.isActive === (status === "active");
}

export function filterGroups(groups: readonly Group[], filters: GroupFilters): Group[] {
  const text = normalize(filters.text);

  return groups.filter((group) => (filters.type === "all" || group.type === filters.type)
    && matchesStatus(group, filters.status)
    && (text === "" || searchableText(group).includes(text)));
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): T[] {
  return items.slice(page * pageSize, (page + 1) * pageSize);
}

export const EMPTY_GROUP_DRAFT: GroupDraft = {
  name: "",
  description: "",
  semester: "",
  academicYear: "",
  maxStudents: "",
  type: "STUDENT",
};

export type GroupDraftField = "name" | "maxStudents";

export type GroupDraftErrors = Partial<Record<GroupDraftField, string>>;

// TODO(i18n): move to a groups namespace in src/i18n.
export const GROUP_DRAFT_MESSAGES: Record<GroupDraftField, string> = {
  name: "Escribe el nombre del grupo.",
  maxStudents: "El límite de estudiantes debe ser un número entero mayor que 0.",
};

export type StudentLimit = { valid: true, value: number | null } | { valid: false };

// Empty means "no limit"; otherwise only plain positive integers (the backend uses @IsInt @Min(1)).
export function parseStudentLimit(value: string): StudentLimit {
  const trimmed = value.trim();

  if (trimmed === "") {
    return { valid: true, value: null };
  }

  if (!/^\d+$/.test(trimmed) || Number(trimmed) < 1) {
    return { valid: false };
  }

  return { valid: true, value: Number(trimmed) };
}

export function validateGroupDraft(draft: GroupDraft): GroupDraftErrors {
  const errors: GroupDraftErrors = {};

  if (draft.name.trim() === "") {
    errors.name = GROUP_DRAFT_MESSAGES.name;
  }

  if (!parseStudentLimit(draft.maxStudents).valid) {
    errors.maxStudents = GROUP_DRAFT_MESSAGES.maxStudents;
  }

  return errors;
}

export function toGroupDraft(group: Group): GroupDraft {
  return {
    name: group.name,
    description: group.description ?? "",
    semester: group.semester ?? "",
    academicYear: group.academicYear ?? "",
    maxStudents: group.maxStudents === null ? "" : String(group.maxStudents),
    type: group.type,
  };
}

// UI mirror of the backend rule: admins manage every group, teachers the student groups the
// backend lists for them (created or supervised). Teacher groups are read-only for teachers.
export function canManageGroup(group: Pick<Group, "type">, role: UserOption["role"] | null): boolean {
  return role === "ADMIN" || (role === "TEACHER" && group.type === "STUDENT");
}

export function excludeMembers<T extends { id: string }>(users: readonly T[], members: ReadonlyArray<{ userId: string }>): T[] {
  const memberIds = new Set(members.map((member) => member.userId));

  return users.filter((user) => !memberIds.has(user.id));
}
