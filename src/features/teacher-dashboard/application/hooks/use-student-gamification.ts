/*
* Funcionalidad: useStudentGamification
* Descripción: Read-only gamification of one student for staff (Gamificación tab of /teacher/students/[userId]): stats (`GET /api/progress/users/{userId}/gamification`: XP, level, XP inside the level, streaks, today's XP) and unlocked achievements (`GET /api/progress/users/{userId}/achievements`, newest first), requested in parallel through useApiQuery, each with its own state (403 outside the caller's groups). Depends on React, @shared/api-client and the student detail mapper, service and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toStudentAchievements, toStudentGamification } from "../../api/mappers/student-detail.mapper";
import { STUDENT_ACHIEVEMENTS_PATH, STUDENT_GAMIFICATION_PATH } from "../../api/services/student-detail.service";
import type { StudentAchievement, StudentGamification } from "../entities/student-detail.entity";

export type UseStudentGamificationResult = {
  stats: StudentGamification | null
  statsLoading: boolean
  statsError: ApiError | null
  achievements: StudentAchievement[] | null
  achievementsLoading: boolean
  achievementsError: ApiError | null
  reload: () => Promise<void>
};

export function useStudentGamification(userId: string): UseStudentGamificationResult {
  const statsQuery = useApiQuery(STUDENT_GAMIFICATION_PATH, { params: { userId } });
  const achievementsQuery = useApiQuery(STUDENT_ACHIEVEMENTS_PATH, { params: { userId } });
  const stats = useMemo(() => (statsQuery.data ? toStudentGamification(statsQuery.data.data) : null), [statsQuery.data]);
  const achievements = useMemo(
    () => (achievementsQuery.data ? toStudentAchievements(achievementsQuery.data.data) : null),
    [achievementsQuery.data],
  );
  const mutateStats = statsQuery.mutate;
  const mutateAchievements = achievementsQuery.mutate;

  const reload = useCallback(async() => {
    await Promise.all([mutateStats(), mutateAchievements()]);
  }, [mutateStats, mutateAchievements]);

  return {
    stats,
    statsLoading: statsQuery.isLoading,
    statsError: statsQuery.error ?? null,
    achievements,
    achievementsLoading: achievementsQuery.isLoading,
    achievementsError: achievementsQuery.error ?? null,
    reload,
  };
}
