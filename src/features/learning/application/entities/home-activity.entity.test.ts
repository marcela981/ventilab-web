/*
* Funcionalidad: Inicio selectors tests
* Descripción: mergeHomeActivity (W8, Bloque 2): ledger facts and summary notes, conversations, sessions and grades merged newest first, capped at the limit, unparseable dates last, a passed-evaluation fact dropped when a passed grade of the same evaluation is listed, and the link of each kind (no link for a completed lesson or a note without module). homeCardVisibility: each card shows only with backend data (continueLearning, gamification stats, merged activity, active or upcoming evaluations, unread notifications) and hasAnyHomeCard. Depends on vitest and the Inicio selectors.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { StudentSummary } from "@features/student-space/summary.entry";
import type { GamificationStats, RecentActivity } from "./gamification.entity";
import { hasAnyHomeCard, homeCardVisibility, mergeHomeActivity } from "./home-activity.entity";
import type { HomeActivitySources } from "./home-activity.entity";

type ActivitySummary = NonNullable<HomeActivitySources["summary"]>;

const ledger = (id: string, kind: RecentActivity["kind"], occurredAt: string, overrides: Partial<RecentActivity> = {}): RecentActivity => ({
  id,
  kind,
  refId: `ref-${id}`,
  xp: 50,
  occurredAt,
  title: `Título ${id}`,
  ...overrides,
});

const emptySummary = (): ActivitySummary => ({ latestNotes: [], latestConversations: [], latestSimulationSessions: [], grades: [] });

function fullSummary(): ActivitySummary {
  return {
    latestNotes: [
      { id: "n1", lessonId: "l1", pageId: null, moduleId: "m1", lessonTitle: "PEEP", pageTitle: null, excerpt: "x", updatedAt: "2026-10-20T10:00:00.000Z" },
      { id: "n2", lessonId: "l2", pageId: null, moduleId: null, lessonTitle: null, pageTitle: null, excerpt: "y", updatedAt: "2026-10-10T10:00:00.000Z" },
    ],
    latestConversations: [{ id: "c1", title: "Dudas", scope: "LESSON", updatedAt: "2026-10-22T10:00:00.000Z" }],
    latestSimulationSessions: [
      { id: "s1", caseTitle: "SDRA", mode: "FREE", status: "ENDED", score: 80, startedAt: "2026-10-18T10:00:00.000Z", endedAt: "2026-10-18T11:00:00.000Z" },
      { id: "s2", caseTitle: null, mode: "EXAM", status: "ACTIVE", score: null, startedAt: "2026-10-19T10:00:00.000Z", endedAt: null },
    ],
    grades: [
      { attemptId: "a1", evaluationId: "ev1", moduleId: null, moduleTitle: null, title: "Parcial", type: "EXAM", attemptNumber: 1, grade: 4, passed: true, publishedAt: "2026-10-21T10:00:00.000Z" },
    ],
  };
}

describe("mergeHomeActivity", () => {
  it("merges ledger facts and summary items newest first with the link of each kind", () => {
    const recent = [
      ledger("e1", "MODULE_COMPLETED", "2026-10-23T10:00:00.000Z", { refId: "m7" }),
      ledger("e2", "LESSON_COMPLETED", "2026-10-17T10:00:00.000Z"),
      ledger("e3", "ACHIEVEMENT_UNLOCKED", "2026-10-16T10:00:00.000Z", { xp: 25 }),
    ];

    const items = mergeHomeActivity({ recent, summary: fullSummary() }, 20);

    expect(items.map((item) => item.key)).toEqual([
      "ledger-e1",
      "conversation-c1",
      "grade-a1",
      "note-n1",
      "simulation-s2",
      "simulation-s1",
      "ledger-e2",
      "ledger-e3",
      "note-n2",
    ]);
    const byKey = new Map(items.map((item) => [item.key, item]));

    expect(byKey.get("ledger-e1")).toMatchObject({ kind: "MODULE_COMPLETED", href: "/learn/modules/m7", xp: 50 });
    expect(byKey.get("ledger-e2")?.href).toBeNull();
    expect(byKey.get("ledger-e3")?.href).toBe("/learn?tab=progreso");
    expect(byKey.get("conversation-c1")).toMatchObject({ href: "/assistant/c1", xp: null });
    expect(byKey.get("grade-a1")?.href).toBe("/evaluations/ev1/attempts/a1/result");
    expect(byKey.get("note-n1")?.href).toBe("/learn/modules/m1/lessons/l1/1");
    expect(byKey.get("note-n2")?.href).toBeNull();
    expect(byKey.get("simulation-s1")).toMatchObject({ occurredAt: "2026-10-18T11:00:00.000Z", href: "/simulator/sessions/s1/result" });
    expect(byKey.get("simulation-s2")?.href).toBe("/simulator/sessions/s2");
  });

  it("caps the list at the limit (8 by default)", () => {
    const recent = Array.from({ length: 12 }, (_, index) => ledger(`e${index}`, "LESSON_COMPLETED", `2026-10-${String(10 + index).padStart(2, "0")}T10:00:00.000Z`));

    expect(mergeHomeActivity({ recent, summary: null })).toHaveLength(8);
    expect(mergeHomeActivity({ recent, summary: null }, 3).map((item) => item.key)).toEqual(["ledger-e11", "ledger-e10", "ledger-e9"]);
  });

  it("drops a passed-evaluation fact already listed as a passed grade, keeps the others", () => {
    const summary = fullSummary();
    const recent = [
      ledger("p1", "EVALUATION_PASSED", "2026-10-21T10:00:00.000Z", { refId: "ev1" }),
      ledger("p2", "EVALUATION_PASSED", "2026-10-21T09:00:00.000Z", { refId: "ev9" }),
    ];

    const keys = mergeHomeActivity({ recent, summary }, 20).map((item) => item.key);

    expect(keys).not.toContain("ledger-p1");
    expect(keys).toContain("ledger-p2");
    expect(keys).toContain("grade-a1");
  });

  it("puts unparseable dates last and handles an absent summary", () => {
    const recent = [
      ledger("bad", "LESSON_COMPLETED", "not-a-date"),
      ledger("ok", "LESSON_COMPLETED", "2026-10-01T10:00:00.000Z"),
    ];

    expect(mergeHomeActivity({ recent, summary: null }).map((item) => item.key)).toEqual(["ledger-ok", "ledger-bad"]);
    expect(mergeHomeActivity({ recent: [], summary: emptySummary() })).toEqual([]);
  });
});

const stats: GamificationStats = { xpTotal: 120, level: 1, xpIntoLevel: 120, nextLevelXp: 500, streakDays: 2, longestStreak: 3, xpToday: 0 };

type VisibilitySummary = Pick<StudentSummary, "continueLearning" | "activeEvaluations" | "upcomingEvaluations" | "unreadNotifications">;

const visibilitySummary = (overrides: Partial<VisibilitySummary> = {}): VisibilitySummary => ({
  continueLearning: null,
  activeEvaluations: [],
  upcomingEvaluations: [],
  unreadNotifications: 0,
  ...overrides,
});

describe("homeCardVisibility", () => {
  it("hides every card without backend data", () => {
    const visible = homeCardVisibility({ summary: null, stats: null, activity: [] });

    expect(visible).toEqual({ continueLearning: false, xpToday: false, activity: false, evaluations: false, notifications: false });
    expect(hasAnyHomeCard(visible)).toBe(false);
    expect(hasAnyHomeCard(homeCardVisibility({ summary: visibilitySummary(), stats: null, activity: [] }))).toBe(false);
  });

  it("shows each card only with its data (XP Hoy with stats, even at 0 XP today)", () => {
    const visible = homeCardVisibility({
      summary: visibilitySummary({
        continueLearning: { moduleId: "m1", moduleTitle: "M", lessonId: "l1", lessonTitle: "L", percent: 40 },
        upcomingEvaluations: [{ assignmentId: "a", evaluationId: "e", title: "Quiz", type: "QUIZ", startsAt: "2026-10-22T13:00:00.000Z", endsAt: null }],
        unreadNotifications: 2,
      }),
      stats,
      activity: mergeHomeActivity({ recent: [ledger("e1", "LESSON_COMPLETED", "2026-10-01T10:00:00.000Z")], summary: null }),
    });

    expect(visible).toEqual({ continueLearning: true, xpToday: true, activity: true, evaluations: true, notifications: true });
  });
});
