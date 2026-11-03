/*
* Funcionalidad: Student detail entity tests
* Descripción: Pure selectors of /teacher/students/[userId]: completed modules of the progress summary, passed evaluations over distinct evaluations (any passed published attempt counts), the XP percentage inside the level, the avatar initials, the back link (directory with ?from=directory, otherwise the dashboard) and the recording playback URL. Depends on vitest, the student detail entity and routes.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { buildRecordingPlaybackUrl, buildStudentDetailBackUrl } from "../config/student-detail.routes";
import { readStudentDetailOrigin } from "../config/teacher-dashboard.routes";
import type { LearningSummary } from "./curriculum-titles.entity";
import { completedModules, initialsOf, levelPercent, passedEvaluations } from "./student-detail.entity";
import type { StudentGrade } from "./teacher-dashboard.entity";

const values = { percentage: 0, completedLessons: 0, totalLessons: 1 };

function grade(evaluationId: string, passed: boolean): StudentGrade {
  return {
    attemptId: `${evaluationId}-${String(passed)}`,
    attemptNumber: 1,
    evaluationId,
    evaluationTitle: evaluationId,
    moduleTitle: null,
    grade: passed ? 4 : 2,
    passed,
    publishedAt: "2026-10-10T15:00:00.000Z",
  };
}

describe("student detail selectors", () => {
  it("counts the completed modules of the summary", () => {
    const summary: LearningSummary = {
      overall: { ...values, completed: false },
      sections: [],
      levels: [],
      modules: [
        { ...values, moduleId: "m1", levelId: null, completed: true },
        { ...values, moduleId: "m2", levelId: null, completed: false },
        { ...values, moduleId: "m3", levelId: null, completed: true },
      ],
    };

    expect(completedModules(summary)).toEqual({ completed: 2, total: 3 });
  });

  it("counts distinct evaluations, passed when any published attempt passed", () => {
    expect(passedEvaluations([grade("ev-1", false), grade("ev-1", true), grade("ev-2", false)])).toEqual({ passed: 1, total: 2 });
    expect(passedEvaluations([])).toEqual({ passed: 0, total: 0 });
  });

  it("computes the XP percentage inside the current level", () => {
    const stats = { xpTotal: 1255, xpToday: 0, level: 3, xpIntoLevel: 255, nextLevelXp: 1500, streakDays: 0, longestStreak: 0 };

    expect(levelPercent(stats)).toBe(51);
    expect(levelPercent({ ...stats, xpTotal: 0, xpIntoLevel: 0, nextLevelXp: 0 })).toBe(0);
  });

  it("builds the avatar initials from the name or the email", () => {
    expect(initialsOf("Ana María Gómez", "a@x.co")).toBe("AG");
    expect(initialsOf("Ana", "a@x.co")).toBe("AN");
    expect(initialsOf(null, "pedro@x.co")).toBe("PE");
  });
});

describe("student detail routes", () => {
  it("returns to the directory only when opened from it", () => {
    expect(buildStudentDetailBackUrl(readStudentDetailOrigin("directory"), "g1")).toBe("/teacher/students");
    expect(buildStudentDetailBackUrl(readStudentDetailOrigin(undefined), "g1")).toBe("/teacher?tab=grupo&groupId=g1");
    expect(buildStudentDetailBackUrl(readStudentDetailOrigin(["directory", "x"]), null)).toBe("/teacher");
  });

  it("links a recording to its playback", () => {
    expect(buildRecordingPlaybackUrl("res 1")).toBe("/lab/recordings/res%201");
  });
});
