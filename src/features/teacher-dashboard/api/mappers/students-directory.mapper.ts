/*
* Funcionalidad: Students directory mapper
* Descripción: Maps the students directory responses to the application model: a `GET /api/admin/students` row to a DirectoryRow (active groups, student code, progress bounded to 0–100, canView) (the statistics cards are mapped once, by toPlatformStatCards). v1.2: tolerates rows of an older server contract (only `groupName`, without `groups`, `studentCode` or `canView`): a missing or non-array `groups` becomes [], a missing `studentCode` becomes null, a missing `canView` becomes false and a non-finite progress becomes 0, so the UI never receives an undefined collection. Depends on the students directory DTOs and entity.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { DirectoryRow } from "../../application/entities/students-directory.entity";
import type { AdminStudentListItemDTO } from "../dtos/students-directory.dto";

/**
 * An older server sent rows with `groupName` only (no `groups`, `studentCode` or `canView`).
 * The generated type promises those fields, so they are normalized here, at the API boundary.
 */
type LegacyTolerantRow = Omit<AdminStudentListItemDTO, "groups" | "studentCode" | "canView"> & {
  groups?: unknown,
  studentCode?: string | null,
  canView?: boolean,
};

function toGroups(groups: unknown): DirectoryRow["groups"] {
  return Array.isArray(groups)
    ? groups.map((group: { id: string, name: string }) => ({ id: group.id, name: group.name }))
    : [];
}

function toProgress(value: unknown): number {
  const progress = typeof value === "number" && Number.isFinite(value) ? value : 0;

  return Math.min(100, Math.max(0, progress));
}

export function toDirectoryRow(dto: AdminStudentListItemDTO): DirectoryRow {
  const row: LegacyTolerantRow = dto;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    studentCode: row.studentCode ?? null,
    progress: toProgress(row.overallProgress),
    groups: toGroups(row.groups),
    canView: row.canView === true,
  };
}
