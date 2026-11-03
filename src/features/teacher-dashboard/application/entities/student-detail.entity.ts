/*
* Funcionalidad: Student detail entity
* Descripción: View models and pure selectors of /teacher/students/[userId] (DISENO_BLOQUE4 §2.4): the tabs (?tab=modulos|evaluaciones|simulador|actividad|gamificacion, default modulos) and their labels, the student profile (name, email, avatar, last access), the directory facts of the header (student code and active groups), gamification stats and achievements (read-only), the real ventilator recordings, the completed modules of the progress summary and the passed evaluations of the published grades (distinct evaluations: passed when any published attempt passed). No value is invented: a missing datum gives null so its card is hidden. No dependencies besides the teacher dashboard entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { LearningSummary } from "./curriculum-titles.entity";
import type { StudentGrade } from "./teacher-dashboard.entity";

export const STUDENT_DETAIL_TABS = ["modulos", "evaluaciones", "simulador", "actividad", "gamificacion"] as const;
export type StudentDetailTab = (typeof STUDENT_DETAIL_TABS)[number];
export const DEFAULT_STUDENT_DETAIL_TAB: StudentDetailTab = "modulos";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STUDENT_DETAIL_TAB_LABELS: Record<StudentDetailTab, string> = {
  modulos: "Módulos",
  evaluaciones: "Evaluaciones",
  simulador: "Simulador",
  actividad: "Actividad",
  gamificacion: "Gamificación",
};

export type StudentProfile = {
  id: string
  name: string | null
  email: string
  image: string | null
  lastAccess: string | null
};

export type StudentGroupRef = {
  id: string
  name: string
};

/** Facts of the student only the directory carries; null when the directory row was not found. */
export type StudentDirectoryFacts = {
  studentCode: string | null
  groups: StudentGroupRef[]
};

export type StudentGamification = {
  xpTotal: number
  xpToday: number
  level: number
  xpIntoLevel: number
  nextLevelXp: number
  streakDays: number
  longestStreak: number
};

export type StudentAchievement = {
  id: string
  title: string
  description: string | null
  icon: string | null
  xpReward: number
  unlockedAt: string
};

export type RecordingStatus = "SCHEDULED" | "CANCELLED" | "PREEMPTED" | "COMPLETED";

export type TeamRecording = {
  reservationId: string
  holderType: "USER" | "GROUP"
  startsAt: string
  endsAt: string
  status: RecordingStatus
  chunkCount: number
};

export type CompletedModules = {
  completed: number
  total: number
};

export type PassedEvaluations = {
  passed: number
  total: number
};

export function completedModules(summary: LearningSummary): CompletedModules {
  return { completed: summary.modules.filter((item) => item.completed).length, total: summary.modules.length };
}

/** Distinct evaluations with a published grade; one counts as passed when any of its published attempts passed. */
export function passedEvaluations(grades: readonly StudentGrade[]): PassedEvaluations {
  const passedById = new Map<string, boolean>();

  for (const grade of grades) {
    passedById.set(grade.evaluationId, (passedById.get(grade.evaluationId) ?? false) || grade.passed);
  }

  return { passed: [...passedById.values()].filter(Boolean).length, total: passedById.size };
}

/** XP progress inside the current level (0–100); the level spans 500 XP on the API formula, nextLevelXp − its start. */
export function levelPercent(stats: StudentGamification): number {
  const levelStart = stats.xpTotal - stats.xpIntoLevel;
  const span = stats.nextLevelXp - levelStart;

  return span > 0 ? Math.min(100, Math.max(0, Math.round((stats.xpIntoLevel / span) * 100))) : 0;
}

/** Initials of the avatar placeholder: first and last word of the name, else the first two letters of the email. */
export function initialsOf(name: string | null, email: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  const last = words[words.length - 1];

  if (first && last && words.length > 1) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  }

  return (first ?? email).slice(0, 2).toUpperCase();
}
