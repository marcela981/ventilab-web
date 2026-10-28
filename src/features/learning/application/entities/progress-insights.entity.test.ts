/*
* Funcionalidad: Mi Progreso selectors tests
* Descripción: levelBar (span from the documented formula, percentage of xpIntoLevel, bounded); the America/Bogota day (fixed UTC−05:00 across midnight); the 12-week range starting on a Monday; the calendar weeks (omitted days without activity, future days marked, intensity levels) and their totals; milestones (published levels with lessons, achieved when complete, drafts and levels without progress left out) and the skill tree (the three Currículo branches in July order, level states and lesson-weighted branch completion), derived from the curriculum tree and the progress summary. Depends on vitest, the learning mappers, test helpers, the activity calendar selectors and the Mi Progreso selectors.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { toCurriculumTree } from "../../api/mappers/curriculum.mapper";
import { toProgressSummary } from "../../api/mappers/progress.mapper";
import { progressItem, progressSummaryDto, seededTreeDto } from "../pages/learning-test-helpers";
import { activityLevel, bogotaDate, buildCalendarWeeks, calendarRange, calendarTotals } from "./activity-calendar.entity";
import { deriveMilestones, deriveSkillTree, levelBar } from "./progress-insights.entity";

const stats = (overrides: Partial<Parameters<typeof levelBar>[0]> = {}) => ({
  xpTotal: 1250,
  level: 3,
  xpIntoLevel: 250,
  nextLevelXp: 1500,
  streakDays: 0,
  longestStreak: 0,
  xpToday: 0,
  ...overrides,
});

describe("levelBar", () => {
  it("takes the level span from the documented formula and the server xpIntoLevel", () => {
    expect(levelBar(stats())).toEqual({ level: 3, nextLevel: 4, xpIntoLevel: 250, span: 500, percent: 50 });
    expect(levelBar(stats({ xpTotal: 0, level: 1, xpIntoLevel: 0, nextLevelXp: 500 })).percent).toBe(0);
    expect(levelBar(stats({ xpTotal: 499, level: 1, xpIntoLevel: 499, nextLevelXp: 500 })).percent).toBe(100);
  });

  it("never divides by an empty span nor leaves 0–100", () => {
    expect(levelBar(stats({ level: 3, nextLevelXp: 1000 })).percent).toBe(0);
    expect(levelBar(stats({ xpIntoLevel: 900 })).percent).toBe(100);
  });
});

describe("activity calendar", () => {
  it("uses the America/Bogota day (UTC−05:00) across midnight", () => {
    expect(bogotaDate(new Date("2026-10-28T04:59:00.000Z"))).toBe("2026-10-27");
    expect(bogotaDate(new Date("2026-10-28T05:00:00.000Z"))).toBe("2026-10-28");
  });

  it("covers the last 12 weeks starting on a Monday", () => {
    // 2026-10-28 is a Wednesday; its Monday is 2026-10-26.
    expect(calendarRange("2026-10-28")).toEqual({ from: "2026-08-10", to: "2026-10-28" });
    expect(calendarRange("2026-10-26", 1)).toEqual({ from: "2026-10-26", to: "2026-10-26" });
    expect(calendarRange("2026-11-01", 2)).toEqual({ from: "2026-10-19", to: "2026-11-01" });
  });

  it("builds week columns with the API days, no activity for omitted days and future days marked", () => {
    const range = calendarRange("2026-10-28", 2);
    const weeks = buildCalendarWeeks(range, [
      { date: "2026-10-20", count: 1, xp: 5 },
      { date: "2026-10-27", count: 12, xp: 300 },
      { date: "2026-10-30", count: 4, xp: 20 },
    ]);

    expect(weeks).toHaveLength(2);
    expect(weeks.map((week) => week.map((cell) => cell.date))).toEqual([
      ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"],
      ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"],
    ]);
    expect(weeks[0]?.[1]).toEqual({ date: "2026-10-20", count: 1, xp: 5, level: 1, future: false });
    expect(weeks[0]?.[2]).toMatchObject({ count: 0, level: 0, future: false });
    expect(weeks[1]?.[1]).toMatchObject({ count: 12, level: 4 });
    expect(weeks[1]?.[4]).toEqual({ date: "2026-10-30", count: 0, xp: 0, level: 0, future: true });
    expect(calendarTotals(weeks)).toEqual({ activeDays: 2, events: 13 });
  });

  it("maps event counts to five intensity levels", () => {
    expect([0, 1, 2, 3, 5, 6, 9, 10, 40].map(activityLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

function levelProgress(levelId: string, percentage: number, completedLessons: number, totalLessons: number) {
  return { levelId, sectionId: null, completedModules: 0, totalModules: 0, ...progressItem(percentage, completedLessons, totalLessons) };
}

// Seeded tree: VentyLab (principiante, a draft level), Mecánica (prerequisitos, beginner, intermedio locked).
function fixtures() {
  const tree = toCurriculumTree(seededTreeDto());
  const progress = toProgressSummary(progressSummaryDto([
    levelProgress("ventylab-principiante", 0, 0, 2),
    levelProgress("level-prerequisitos", 100, 2, 2),
    levelProgress("level-beginner", 50, 3, 6),
    levelProgress("level-intermedio", 0, 0, 4),
    levelProgress("ventylab-borrador", 0, 0, 3),
  ]));

  return { tree, progress };
}

describe("deriveMilestones", () => {
  it("lists the published levels with lessons in branch order, achieved when complete", () => {
    const { tree, progress } = fixtures();

    expect(deriveMilestones(tree, progress)).toEqual([
      { id: "ventylab-principiante", title: "Principiante", percentage: 0, completedLessons: 0, totalLessons: 2, achieved: false },
      { id: "level-prerequisitos", title: "Prerequisitos", percentage: 100, completedLessons: 2, totalLessons: 2, achieved: true },
      { id: "level-beginner", title: "Nivel Principiante", percentage: 50, completedLessons: 3, totalLessons: 6, achieved: false },
      { id: "level-intermedio", title: "Nivel Intermedio", percentage: 0, completedLessons: 0, totalLessons: 4, achieved: false },
    ]);
  });

  it("gives no milestone without progress data", () => {
    const { tree } = fixtures();

    expect(deriveMilestones(tree, null)).toEqual([]);
  });
});

describe("deriveSkillTree", () => {
  it("groups the published levels into the July branches with states and lesson-weighted completion", () => {
    const { tree, progress } = fixtures();

    expect(deriveSkillTree(tree, progress)).toEqual([
      { key: "ventylab", percentage: 0, levels: [{ id: "ventylab-principiante", title: "Principiante", percentage: 0, state: "not-started" }] },
      { key: "prerrequisitos", percentage: 100, levels: [{ id: "level-prerequisitos", title: "Prerequisitos", percentage: 100, state: "completed" }] },
      {
        key: "mecanica",
        percentage: 30,
        levels: [
          { id: "level-beginner", title: "Nivel Principiante", percentage: 50, state: "in-progress" },
          { id: "level-intermedio", title: "Nivel Intermedio", percentage: 0, state: "locked" },
        ],
      },
    ]);
  });

  it("leaves out empty branches and keeps the levels without progress at 0", () => {
    const tree = toCurriculumTree({ sections: [], unsectionedLevels: [] });

    expect(deriveSkillTree(tree, null)).toEqual([]);
    expect(deriveSkillTree(fixtures().tree, null).map((branch) => branch.percentage)).toEqual([0, 0, 0]);
  });
});
