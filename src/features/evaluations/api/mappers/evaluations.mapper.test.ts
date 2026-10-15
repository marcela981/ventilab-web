/*
* Funcionalidad: Evaluations mappers tests
* Descripción: Verifies the DTO → entity mapping of the student evaluations feature: items without an evaluation summary are dropped, attempts are sorted and carry a result only when published with a grade, descriptions become text or Tiptap doc RichText, the attempt start keeps the attempt id, and the attempt detail sorts scenarios, questions and options while copying correctness, explanation, rubric and earned score only when the backend sends them. Depends on vitest, the mappers and the test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { attemptDto, myEvaluationDto } from "../../application/pages/evaluations-test-helpers";
import type { StudentAttemptDetailDTO, StudentQuestionDTO } from "../dtos/evaluations.dto";
import { toAttemptDetail, toAttemptStart, toMyEvaluations, toMyGrade, toRichText } from "./evaluations.mapper";

const tiptapDoc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hola" }] }] };

describe("toRichText", () => {
  it("maps text, Tiptap documents and empty values", () => {
    expect(toRichText("Lee con atención")).toEqual({ kind: "text", text: "Lee con atención" });
    expect(toRichText(tiptapDoc)).toEqual({ kind: "doc", doc: tiptapDoc });
    expect(toRichText("  ")).toBeNull();
    expect(toRichText(null)).toBeNull();
    expect(toRichText(["x"])).toBeNull();
  });
});

describe("toMyEvaluations", () => {
  it("drops items without an evaluation and flattens the summary", () => {
    const result = toMyEvaluations([
      myEvaluationDto("as1", "e1", { evaluation: { type: "EXAM", description: "Instrucciones" } }),
      myEvaluationDto("as2", "e2", { evaluation: null }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      assignmentId: "as1",
      evaluationId: "e1",
      title: "Evaluación e1",
      type: "EXAM",
      description: { kind: "text", text: "Instrucciones" },
      durationMinutes: 30,
      maxAttempts: 2,
      questionCount: 5,
      state: "ACTIVE",
      canStart: true,
    });
  });

  it("sorts attempts and exposes the result only when published with a grade", () => {
    const [item] = toMyEvaluations([
      myEvaluationDto("as1", "e1", {
        attempts: [
          attemptDto("at2", 2, { status: "IN_PROGRESS", submittedAt: null }),
          attemptDto("at1", 1, { status: "GRADED", published: true, grade: 3.5, passed: true, score: 7, maxScore: 10 }),
        ],
      }),
      myEvaluationDto("as2", "e2", { attempts: [attemptDto("at3", 1, { status: "GRADED", published: false, grade: 4 })] }),
    ]);

    expect(item?.attempts.map((attempt) => attempt.id)).toEqual(["at1", "at2"]);
    expect(item?.attempts[0]?.result).toEqual({ grade: 3.5, passed: true, score: 7, maxScore: 10 });
    expect(item?.attempts[1]?.result).toBeNull();
  });

  it("keeps the result null for an unpublished attempt even if a grade is present", () => {
    const [, second] = toMyEvaluations([
      myEvaluationDto("as1", "e1"),
      myEvaluationDto("as2", "e2", { attempts: [attemptDto("at3", 1, { status: "GRADED", published: false, grade: 4, passed: true })] }),
    ]);

    expect(second?.attempts[0]?.result).toBeNull();
  });
});

describe("toMyGrade and toAttemptStart", () => {
  it("maps a published grade", () => {
    expect(toMyGrade({
      attemptId: "at1",
      attemptNumber: 1,
      evaluationId: "e1",
      evaluationTitle: "Quiz 1",
      evaluationType: "QUIZ",
      grade: 4.2,
      passed: true,
      score: 8,
      maxScore: 10,
      publishedAt: "2026-10-14T15:00:00.000Z",
      legacy: false,
    })).toEqual({
      attemptId: "at1",
      attemptNumber: 1,
      evaluationId: "e1",
      evaluationTitle: "Quiz 1",
      evaluationType: "QUIZ",
      grade: 4.2,
      passed: true,
      score: 8,
      maxScore: 10,
      publishedAt: "2026-10-14T15:00:00.000Z",
    });
  });

  it("maps the attempt start", () => {
    expect(toAttemptStart({
      id: "at9",
      evaluationId: "e1",
      assignmentId: "as1",
      attemptNumber: 1,
      status: "IN_PROGRESS",
      startedAt: "2026-10-14T15:00:00.000Z",
      deadlineAt: null,
      serverNow: "2026-10-14T15:00:00.000Z",
      created: false,
    })).toEqual({ attemptId: "at9", evaluationId: "e1", status: "IN_PROGRESS", created: false });
  });
});

function questionDto(id: string, position: number, overrides: Partial<StudentQuestionDTO> = {}): StudentQuestionDTO {
  return {
    id,
    position,
    scenarioId: null,
    type: "SINGLE_CHOICE",
    prompt: tiptapDoc as unknown as StudentQuestionDTO["prompt"],
    media: [],
    points: 2,
    clinicalCaseId: null,
    options: [
      { id: `${id}-b`, order: 2, content: "B", media: null },
      { id: `${id}-a`, order: 1, content: "A", media: null },
    ],
    answer: { selectedOptionIds: [`${id}-a`], textAnswer: null, simulationSessionId: null },
    ...overrides,
  };
}

function attemptDetailDto(overrides: Partial<StudentAttemptDetailDTO> = {}): StudentAttemptDetailDTO {
  return {
    id: "at1",
    assignmentId: "as1",
    attemptNumber: 1,
    status: "IN_PROGRESS",
    startedAt: "2026-10-14T15:00:00.000Z",
    submittedAt: null,
    deadlineAt: "2026-10-14T15:30:00.000Z",
    serverNow: "2026-10-14T15:01:00.000Z",
    published: false,
    evaluation: { id: "e1", title: "Quiz 1", type: "QUIZ", description: null },
    scenarios: [
      { id: "s2", order: 2, content: tiptapDoc as unknown as StudentAttemptDetailDTO["scenarios"][number]["content"], media: [] },
      { id: "s1", order: 1, content: tiptapDoc as unknown as StudentAttemptDetailDTO["scenarios"][number]["content"], media: [] },
    ],
    questions: [questionDto("q2", 2), questionDto("q1", 1)],
    ...overrides,
  };
}

describe("toAttemptDetail", () => {
  it("sorts scenarios, questions and options and hides published-only fields while unpublished", () => {
    const detail = toAttemptDetail(attemptDetailDto());

    expect(detail.scenarios.map((scenario) => scenario.id)).toEqual(["s1", "s2"]);
    expect(detail.questions.map((question) => question.id)).toEqual(["q1", "q2"]);
    expect(detail.questions[0]?.options.map((option) => option.id)).toEqual(["q1-a", "q1-b"]);
    expect(detail.questions[0]?.prompt).toEqual({ kind: "doc", doc: tiptapDoc });
    expect(detail.questions[0]?.answer).toEqual({ selectedOptionIds: ["q1-a"], textAnswer: null, simulationSessionId: null });
    expect(detail.questions[0]).not.toHaveProperty("explanation");
    expect(detail.questions[0]).not.toHaveProperty("earnedScore");
    expect(detail.questions[0]?.options[0]).not.toHaveProperty("isCorrect");
    expect(detail.result).toBeNull();
    expect(detail.serverNow).toBe("2026-10-14T15:01:00.000Z");
  });

  it("copies correctness, explanation, rubric, earned score and result once published", () => {
    const detail = toAttemptDetail(attemptDetailDto({
      status: "GRADED",
      published: true,
      grade: 2.5,
      passed: false,
      score: 1,
      maxScore: 4,
      questions: [questionDto("q1", 1, {
        explanation: "Porque sí",
        earnedScore: 0,
        rubric: null,
        options: [{ id: "q1-a", order: 1, content: "A", media: null, isCorrect: false, feedback: null }],
      })],
    }));

    expect(detail.result).toEqual({ grade: 2.5, passed: false, score: 1, maxScore: 4 });
    expect(detail.questions[0]).toMatchObject({ explanation: "Porque sí", earnedScore: 0, rubric: null });
    expect(detail.questions[0]?.options[0]).toMatchObject({ isCorrect: false, feedback: null });
  });
});
