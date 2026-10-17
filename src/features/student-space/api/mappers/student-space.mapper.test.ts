/*
* Funcionalidad: Student space mapper tests
* Descripción: The summary mapper copies every API value as is (progress, grades, evaluations, notes, conversations, sessions, reservations) and normalises missing lists and invalid unread counts; the grades mapper keeps grade, points and `passed`; the notes mappers build the notes page from the envelope pagination (or the list length without it), the lesson info from the lesson read and the module analysis. Depends on vitest, the student space mappers and the test fixtures.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { gradeDto, lessonDetailDto, noteDto, summaryDto } from "../../application/pages/student-space-test-helpers";
import type { MySummaryDTO, NotesAnalysisDTO } from "../dtos/student-space.dto";
import { toMyGrade } from "./my-grades.mapper";
import { toModuleNotesAnalysis, toNoteLessonInfo, toNotesPage } from "./my-notes.mapper";
import { toStudentSummary } from "./student-summary.mapper";

describe("toStudentSummary", () => {
  it("copies the API values without computing anything", () => {
    const summary = toStudentSummary(summaryDto());

    expect(summary.overallProgress).toEqual({ id: null, percentage: 40, completedLessons: 4, totalLessons: 10, completed: false });
    expect(summary.sectionProgress.map((item) => [item.id, item.percentage])).toEqual([["s1", 75], ["s2", 17]]);
    expect(summary.activeEvaluations[0]).toEqual({
      assignmentId: "as-1",
      evaluationId: "ev-1",
      title: "Parcial de ventilación",
      type: "EXAM",
      startsAt: "2026-10-15T13:00:00.000Z",
      endsAt: "2026-10-20T13:00:00.000Z",
    });
    expect(summary.grades[1]).toEqual({
      evaluationId: "ev-4",
      title: "Quiz de volúmenes",
      type: "QUIZ",
      attemptNumber: 2,
      grade: 2.5,
      passed: false,
      publishedAt: "2026-10-13T15:00:00.000Z",
    });
    expect(summary.latestNotes[0]).toEqual({ id: "n1", lessonId: "l1", pageId: null, excerpt: "La PEEP mantiene los alvéolos abiertos", updatedAt: "2026-10-16T12:00:00.000Z" });
    expect(summary.latestConversations[0]).toEqual({ id: "c1", title: "Dudas sobre compliance", scope: "LESSON", updatedAt: "2026-10-15T14:00:00.000Z" });
    expect(summary.latestSimulationSessions[0]).toEqual({
      id: "ss-1",
      mode: "FREE",
      status: "ENDED",
      score: 82,
      startedAt: "2026-10-12T14:00:00.000Z",
      endedAt: "2026-10-12T14:30:00.000Z",
    });
    expect(summary.upcomingReservations[0]).toEqual({
      id: "r1",
      startsAt: "2026-10-17T14:00:00.000Z",
      endsAt: "2026-10-17T15:00:00.000Z",
      purpose: "Práctica de PEEP",
      heldByGroup: false,
    });
    expect(summary.unreadNotifications).toBe(3);
  });

  it("normalises missing lists and invalid unread counts", () => {
    const dto = { ...summaryDto(), grades: undefined, unreadNotifications: -2 } as unknown as MySummaryDTO;
    const summary = toStudentSummary(dto);

    expect(summary.grades).toEqual([]);
    expect(summary.unreadNotifications).toBe(0);
  });

  it("marks a reservation held by a group", () => {
    const dto = summaryDto({ upcomingReservations: [{ id: "r2", startsAt: "a", endsAt: "b", purpose: null, holderType: "GROUP", groupId: "g1" }] });

    expect(toStudentSummary(dto).upcomingReservations[0]?.heldByGroup).toBe(true);
  });
});

describe("toMyGrade", () => {
  it("keeps grade, points and the passed flag", () => {
    expect(toMyGrade(gradeDto("a1", { grade: 2.9, passed: false, score: 5.8, maxScore: 10 }))).toEqual({
      attemptId: "a1",
      attemptNumber: 1,
      evaluationId: "ev-a1",
      evaluationTitle: "Evaluación a1",
      evaluationType: "EXAM",
      grade: 2.9,
      passed: false,
      publishedAt: "2026-10-14T15:00:00.000Z",
      score: 5.8,
      maxScore: 10,
    });
  });
});

describe("notes mappers", () => {
  it("builds the notes page from the envelope pagination", () => {
    const page = toNotesPage([noteDto("n1", "l1", "Texto")], { total: 31, pages: 4, page: 2, limit: 10, next: null, previous: null } as never);

    expect(page.total).toBe(31);
    expect(page.pages).toBe(4);
    expect(page.page).toBe(2);
    expect(page.items[0]).toMatchObject({ id: "n1", lessonId: "l1", pageId: null });
  });

  it("falls back to the list length without pagination", () => {
    expect(toNotesPage([noteDto("n1", "l1", "a"), noteDto("n2", "l1", "b")], null)).toMatchObject({ total: 2, page: 1, pages: 1 });
  });

  it("places a lesson in its module", () => {
    expect(toNoteLessonInfo(lessonDetailDto("l1", 3, "m2", "Modos ventilatorios"))).toEqual({
      lessonId: "l1",
      lessonTitle: "Lección l1",
      lessonOrder: 3,
      moduleId: "m2",
      moduleTitle: "Modos ventilatorios",
    });
  });

  it("maps the module analysis", () => {
    const dto = {
      aiCallId: "call-1",
      summary: "Resumen",
      keyConcepts: ["PEEP"],
      gaps: [],
      suggestions: ["Repasa"],
      lessonId: null,
      moduleId: "m1",
      model: "m",
      notesAnalyzed: 4,
      scope: "MODULE",
    } as unknown as NotesAnalysisDTO;

    expect(toModuleNotesAnalysis(dto)).toEqual({
      aiCallId: "call-1",
      summary: "Resumen",
      keyConcepts: ["PEEP"],
      gaps: [],
      suggestions: ["Repasa"],
      notesAnalyzed: 4,
    });
  });
});
