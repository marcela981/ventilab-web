/*
* Funcionalidad: Gamification entity
* Descripción: Domain shape of the server-side gamification (Bloque 2): stats (total XP, level, XP into the level, total XP where the next level starts, current and longest streak in America/Bogota days, XP today) and the recent activity of the ledger (lesson and module completions, passed evaluations and unlocked achievements, newest first, with the XP stored by the server and the referenced title or null). Values are the server's; nothing is computed on the client. No dependencies. v0.2 (W9): activity days (America/Bogota date, event count and XP of the day) and unlocked achievements (stable code, title, description, icon, unlock instant and XP reward).
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type GamificationStats = {
  xpTotal: number
  level: number
  xpIntoLevel: number
  // Total XP where the next level starts (not the XP left).
  nextLevelXp: number
  streakDays: number
  longestStreak: number
  xpToday: number
};

export type ActivityDay = {
  // America/Bogota calendar day, YYYY-MM-DD.
  date: string
  count: number
  xp: number
};

export type Achievement = {
  id: string
  code: string
  title: string
  description: string | null
  icon: string | null
  unlockedAt: string
  xpReward: number
};

export type RecentActivityKind = "LESSON_COMPLETED" | "MODULE_COMPLETED" | "EVALUATION_PASSED" | "ACHIEVEMENT_UNLOCKED";

export type RecentActivity = {
  id: string
  kind: RecentActivityKind
  // Lesson, module or evaluation id, or the achievement code.
  refId: string
  xp: number
  occurredAt: string
  title: string | null
};
