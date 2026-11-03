/*
* Funcionalidad: Teacher general tab mapper
* Descripción: Maps the General tab DTOs to its entities. toPlatformStatCards turns `GET /api/admin/statistics` into the four julio cards in order (Estudiantes activos → /teacher/students, Módulos publicados → /content, Lecciones totales → /content, Completados hoy → /teacher/students) and drops every card whose value is missing or not a finite number (no synthetic data). toRecentStudents keeps id, display name (name, else email), progress clamped to 0–100 and canView of `GET /api/admin/students` rows. Depends on the students directory DTOs, the teacher general entities and the teacher dashboard routes.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { TEACHER_STUDENTS_URL } from "../../application/config/teacher-dashboard.routes";
import { CONTENT_URL } from "../../application/entities/teacher-general.entity";
import type { PlatformStatCard, PlatformStatKey, RecentStudent } from "../../application/entities/teacher-general.entity";
import type { AdminStudentListItemDTO, PlatformStatisticsDTO } from "../dtos/students-directory.dto";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
const STAT_CARDS: readonly { key: PlatformStatKey, title: string, href: string }[] = [
  { key: "activeStudents", title: "Estudiantes activos", href: TEACHER_STUDENTS_URL },
  { key: "publishedModules", title: "Módulos publicados", href: CONTENT_URL },
  { key: "totalLessons", title: "Lecciones totales", href: CONTENT_URL },
  { key: "completionsToday", title: "Completados hoy", href: TEACHER_STUDENTS_URL },
];

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function toPlatformStatCards(dto: Partial<PlatformStatisticsDTO>): PlatformStatCard[] {
  return STAT_CARDS.flatMap((card) => {
    const value = finiteNumber(dto[card.key]);

    return value === null ? [] : [{ ...card, value }];
  });
}

export function toRecentStudents(rows: readonly AdminStudentListItemDTO[]): RecentStudent[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name?.trim() || row.email,
    progress: Math.min(100, Math.max(0, finiteNumber(row.overallProgress) ?? 0)),
    canView: row.canView,
  }));
}
