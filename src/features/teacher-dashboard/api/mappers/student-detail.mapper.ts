/*
* Funcionalidad: Student detail mappers
* Descripción: DTO → view model mappers of /teacher/students/[userId]: the profile of `GET /api/users/students/{id}` (name, email, avatar, last access), the directory facts of the student (student code and active groups of the `GET /api/admin/students?search` row whose id is the student; null when the page holds no such row), gamification stats, unlocked achievements and the real ventilator recordings, copied as the API sends them. Depends on the teacher dashboard and student detail DTOs and the student detail entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type {
  StudentAchievement,
  StudentDirectoryFacts,
  StudentGamification,
  StudentProfile,
  TeamRecording,
} from "../../application/entities/student-detail.entity";
import type {
  AchievementsDTO,
  DirectoryStudentDTO,
  GamificationStatsDTO,
  TelemetryRecordingSummaryDTO,
} from "../dtos/student-detail.dto";
import type { StudentDTO } from "../dtos/teacher-dashboard.dto";

export function toStudentProfile(student: StudentDTO): StudentProfile {
  return { id: student.id, name: student.name, email: student.email, image: student.image, lastAccess: student.stats.lastAccess };
}

export function toStudentDirectoryFacts(rows: readonly DirectoryStudentDTO[], userId: string): StudentDirectoryFacts | null {
  const row = rows.find((item) => item.id === userId);

  return row ? { studentCode: row.studentCode, groups: row.groups.map((group) => ({ id: group.id, name: group.name })) } : null;
}

export function toStudentGamification(stats: GamificationStatsDTO): StudentGamification {
  return {
    xpTotal: stats.xpTotal,
    xpToday: stats.xpToday,
    level: stats.level,
    xpIntoLevel: stats.xpIntoLevel,
    nextLevelXp: stats.nextLevelXp,
    streakDays: stats.streakDays,
    longestStreak: stats.longestStreak,
  };
}

export function toStudentAchievements(dto: AchievementsDTO): StudentAchievement[] {
  return dto.achievements.map((achievement) => ({
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    icon: achievement.icon,
    xpReward: achievement.xpReward,
    unlockedAt: achievement.unlockedAt,
  }));
}

export function toTeamRecordings(recordings: readonly TelemetryRecordingSummaryDTO[]): TeamRecording[] {
  return recordings.map((recording) => ({
    reservationId: recording.reservationId,
    holderType: recording.holderType,
    startsAt: recording.startsAt,
    endsAt: recording.endsAt,
    status: recording.status,
    chunkCount: recording.chunkCount,
  }));
}
