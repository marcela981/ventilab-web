/*
* Funcionalidad: Admin users mapper
* Descripción: Maps the users list (UserDTO → AdminUserRow, an unknown role kept out by the generated enum) and the groups of the filter (GroupDTO → GroupFilterOption, sorted by name). Depends on the admin console DTOs and the admin users entity. v1.1 (closure B2): the row keeps the student code and the superadmin flag of the API. v1.2 (B4): the teachers of the Profesores tab (AdminTeacherDTO → AdminTeacherRow: name, email, role, active groups and distinct students).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AdminTeacherRow } from "../../application/entities/admin-teachers.entity";
import type { AdminUserRow, GroupFilterOption } from "../../application/entities/admin-users.entity";
import type { AdminTeacherDTO, GroupDTO, UserDTO } from "../dtos/admin-console.dto";

export function toAdminUserRow(user: UserDTO): AdminUserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    studentCode: user.studentCode,
    isSuperadmin: user.isSuperadmin,
  };
}

export function toAdminTeacherRow(teacher: AdminTeacherDTO): AdminTeacherRow {
  return {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    role: teacher.role,
    groups: teacher.groups.map((group) => ({ id: group.id, name: group.name })),
    studentCount: teacher.studentCount,
  };
}

export function toGroupFilterOptions(groups: readonly GroupDTO[]): GroupFilterOption[] {
  return groups
    .map((group) => ({ id: group.id, name: group.name, type: group.type }))
    .sort((left, right) => left.name.localeCompare(right.name, "es"));
}
