/*
* Funcionalidad: Students directory mapper
* Descripción: Maps the students directory responses to the application model: a `GET /api/admin/students` row to a DirectoryRow (active groups, student code, progress bounded to 0–100, canView) and `GET /api/admin/statistics` to the four global cards (active students in 30 days, published modules, published lessons, lessons completed today in Bogotá). A statistic without a finite number is left out, so its card is hidden instead of showing invented data. Depends on the students directory DTOs and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { DirectoryRow, DirectoryStatisticCard, DirectoryStatisticKey } from "../../application/entities/students-directory.entity";
import type { AdminStudentListItemDTO, PlatformStatisticsDTO } from "../dtos/students-directory.dto";

export function toDirectoryRow(dto: AdminStudentListItemDTO): DirectoryRow {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    studentCode: dto.studentCode,
    progress: Math.min(100, Math.max(0, dto.overallProgress)),
    groups: dto.groups.map((group) => ({ id: group.id, name: group.name })),
    canView: dto.canView,
  };
}

const STATISTIC_KEYS: readonly DirectoryStatisticKey[] = ["activeStudents", "publishedModules", "totalLessons", "completionsToday"];

export function toDirectoryStatistics(dto: PlatformStatisticsDTO): DirectoryStatisticCard[] {
  return STATISTIC_KEYS.flatMap((key) => {
    const value: unknown = dto[key];

    return typeof value === "number" && Number.isFinite(value) ? [{ key, value }] : [];
  });
}
