/*
* Funcionalidad: Inicio selectors
* Descripción: Pure selectors of the Inicio tab of /learn (W8, Bloque 2; DISENO_BLOQUE2 §2.12). (1) mergeHomeActivity: "Actividad Reciente" merges the ledger facts of `GET /api/progress/activity/recent` (lesson and module completions, passed evaluations, unlocked achievements, with their server XP) with the summary notes, AI conversations, simulation sessions and published grades, newest first (unparseable dates last), capped at a limit; a passed-evaluation fact is dropped when the summary already lists a passed grade of the same evaluation (the grade carries the attempt link). Each item links to its page when the data allows it (a completed lesson has no module id, so it has no link). (2) homeCardVisibility: a card shows only when the backend has data for it (no synthetic placeholders): "Continuar donde quedaste" with continueLearning, "XP Hoy" with the gamification stats, "Actividad Reciente" with at least one merged item, evaluations with an active or upcoming one, notifications with an unread one. Depends on the gamification entity, the learning URLs and the student space entries (summary types, route builders).
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { StudentSummary } from "@features/student-space/summary.entry";
import {
  buildAttemptResultUrl,
  buildConversationUrl,
  buildEvaluationUrl,
  buildSimulationResultUrl,
  buildSimulationSessionUrl,
} from "@features/student-space/home.entry";
import type { GamificationStats, RecentActivity, RecentActivityKind } from "./gamification.entity";
import { buildLessonPageUrl, buildModuleUrl, LEARN_HOME_URL } from "./learning-urls";

export type HomeActivityKind = RecentActivityKind | "NOTE" | "CONVERSATION" | "SIMULATION" | "GRADE";

export type HomeActivityItem = {
  key: string
  kind: HomeActivityKind
  title: string | null
  occurredAt: string
  href: string | null
  // XP stored by the server for a ledger fact; null for summary items.
  xp: number | null
};

export type HomeActivitySources = {
  recent: readonly RecentActivity[]
  summary: Pick<StudentSummary, "latestNotes" | "latestConversations" | "latestSimulationSessions" | "grades"> | null
};

export const HOME_ACTIVITY_LIMIT = 8;

// Mi Progreso tab of /learn (achievements live there).
export const LEARN_PROGRESS_TAB_URL = `${LEARN_HOME_URL}?tab=progreso`;

function ledgerHref(item: RecentActivity): string | null {
  switch (item.kind) {
    case "MODULE_COMPLETED":
      return buildModuleUrl(item.refId);
    case "EVALUATION_PASSED":
      return buildEvaluationUrl(item.refId);
    case "ACHIEVEMENT_UNLOCKED":
      return LEARN_PROGRESS_TAB_URL;
    case "LESSON_COMPLETED":
      return null;
  }
}

function ledgerItems(recent: readonly RecentActivity[], passedEvaluations: ReadonlySet<string>): HomeActivityItem[] {
  return recent
    .filter((item) => !(item.kind === "EVALUATION_PASSED" && passedEvaluations.has(item.refId)))
    .map((item) => ({
      key: `ledger-${item.id}`,
      kind: item.kind,
      title: item.title,
      occurredAt: item.occurredAt,
      href: ledgerHref(item),
      xp: item.xp,
    }));
}

function summaryItems(summary: NonNullable<HomeActivitySources["summary"]>): HomeActivityItem[] {
  return [
    ...summary.latestNotes.map((note): HomeActivityItem => ({
      key: `note-${note.id}`,
      kind: "NOTE",
      title: note.lessonTitle,
      occurredAt: note.updatedAt,
      href: note.moduleId ? buildLessonPageUrl(note.moduleId, note.lessonId) : null,
      xp: null,
    })),
    ...summary.latestConversations.map((conversation): HomeActivityItem => ({
      key: `conversation-${conversation.id}`,
      kind: "CONVERSATION",
      title: conversation.title,
      occurredAt: conversation.updatedAt,
      href: buildConversationUrl(conversation.id),
      xp: null,
    })),
    ...summary.latestSimulationSessions.map((session): HomeActivityItem => ({
      key: `simulation-${session.id}`,
      kind: "SIMULATION",
      title: session.caseTitle,
      occurredAt: session.endedAt ?? session.startedAt,
      href: session.endedAt === null ? buildSimulationSessionUrl(session.id) : buildSimulationResultUrl(session.id),
      xp: null,
    })),
    ...summary.grades.map((grade): HomeActivityItem => ({
      key: `grade-${grade.attemptId}`,
      kind: "GRADE",
      title: grade.title,
      occurredAt: grade.publishedAt,
      href: buildAttemptResultUrl(grade.evaluationId, grade.attemptId),
      xp: null,
    })),
  ];
}

function timeOf(iso: string): number {
  const time = Date.parse(iso);

  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

export function mergeHomeActivity({ recent, summary }: HomeActivitySources, limit = HOME_ACTIVITY_LIMIT): HomeActivityItem[] {
  const passedEvaluations = new Set((summary?.grades ?? []).filter((grade) => grade.passed).map((grade) => grade.evaluationId));
  const items = [...ledgerItems(recent, passedEvaluations), ...(summary ? summaryItems(summary) : [])];

  // Array.prototype.sort is stable: equal instants keep the ledger-then-summary order.
  return items.sort((a, b) => timeOf(b.occurredAt) - timeOf(a.occurredAt)).slice(0, Math.max(0, limit));
}

export type HomeCardVisibility = {
  continueLearning: boolean
  xpToday: boolean
  activity: boolean
  evaluations: boolean
  notifications: boolean
};

export type HomeCardVisibilityInput = {
  summary: Pick<StudentSummary, "continueLearning" | "activeEvaluations" | "upcomingEvaluations" | "unreadNotifications"> | null
  stats: GamificationStats | null
  activity: readonly HomeActivityItem[]
};

export function homeCardVisibility({ summary, stats, activity }: HomeCardVisibilityInput): HomeCardVisibility {
  return {
    continueLearning: summary?.continueLearning != null,
    xpToday: stats !== null,
    activity: activity.length > 0,
    evaluations: summary !== null && summary.activeEvaluations.length + summary.upcomingEvaluations.length > 0,
    notifications: summary !== null && summary.unreadNotifications > 0,
  };
}

export function hasAnyHomeCard(visibility: HomeCardVisibility): boolean {
  return Object.values(visibility).some(Boolean);
}
