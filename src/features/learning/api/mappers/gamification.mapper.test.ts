/*
* Funcionalidad: Gamification mapper tests
* Descripción: The gamification mapper copies the server stats as sent (no XP computed) and keeps only the milestone kinds of the recent activity (a page view is dropped), preserving the server order, XP and nullable title. Depends on vitest and the gamification mapper.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { toGamificationStats, toRecentActivity } from "./gamification.mapper";

describe("gamification mapper", () => {
  it("copies the server stats", () => {
    const dto = { xpTotal: 505, level: 2, xpIntoLevel: 5, nextLevelXp: 1000, streakDays: 3, longestStreak: 9, xpToday: 55 };

    expect(toGamificationStats(dto)).toEqual(dto);
  });

  it("keeps the milestone kinds in server order and drops page views", () => {
    const items = toRecentActivity([
      { id: "1", kind: "ACHIEVEMENT_UNLOCKED", refId: "first_lesson", xp: 50, occurredAt: "2026-10-28T10:00:00.000Z", title: "Primer Paso" },
      { id: "2", kind: "PAGE_VIEWED", refId: "p1", xp: 5, occurredAt: "2026-10-28T09:00:00.000Z", title: null },
      { id: "3", kind: "LESSON_COMPLETED", refId: "l1", xp: 50, occurredAt: "2026-10-28T08:00:00.000Z", title: null },
    ]);

    expect(items.map((item) => item.id)).toEqual(["1", "3"]);
    expect(items[1]).toEqual({ id: "3", kind: "LESSON_COMPLETED", refId: "l1", xp: 50, occurredAt: "2026-10-28T08:00:00.000Z", title: null });
  });
});
