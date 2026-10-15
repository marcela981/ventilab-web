/*
* Funcionalidad: Evaluation student preview mapper tests
* Descripción: Verifies that the authoring detail maps to the student attempt shape: scenarios and questions sorted by order and numbered from 1, options sorted, rich text normalized, no answer, and none of the authoring-only fields (isCorrect, option feedback, explanation, rubric, earned score) reach the preview. Also covers the assignment and group mappers (sorting, active student groups only). Depends on vitest, the mappers and the authoring test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  evaluationDetailDto,
  optionDto,
  paragraphDoc,
  questionDto,
  scenarioDto,
} from "../../application/pages/authoring-test-helpers";
import type { EvaluationAssignmentDTO, GroupDTO } from "../dtos/evaluation-authoring.dto";
import { toEvaluationAssignments, toGroupChoices } from "./evaluation-assignment.mapper";
import { toStudentPreview } from "./evaluation-preview.mapper";

describe("toStudentPreview", () => {
  const dto = evaluationDetailDto("e1", {
    description: "Lee con atención.",
    scenarios: [scenarioDto("s2", 2), scenarioDto("s1", 1)],
    questions: [
      questionDto("q2", 2, { type: "OPEN_TEXT", explanation: "Porque sí", scenarioId: "s1" }),
      questionDto("q1", 1, {
        type: "SINGLE_CHOICE",
        explanation: "La PEEP mejora la oxigenación",
        options: [
          optionDto("o2", 2, { isCorrect: true, feedback: "Correcto" }),
          optionDto("o1", 1, { isCorrect: false, feedback: "Incorrecto" }),
        ],
      }),
      questionDto("q3", 3, { type: "SIMULATION", clinicalCaseId: "case-1", rubric: { criteria: [] } }),
    ],
  });

  it("sorts scenarios, questions and options and numbers the questions from 1", () => {
    const preview = toStudentPreview(dto);

    expect(preview.title).toBe("Parcial de ventilación");
    expect(preview.description).toEqual({ kind: "text", text: "Lee con atención." });
    expect(preview.scenarios.map((scenario) => scenario.id)).toEqual(["s1", "s2"]);
    expect(preview.scenarios[0]?.content).toEqual({ kind: "doc", doc: paragraphDoc("Escenario s1") });
    expect(preview.questions.map((question) => [question.id, question.position])).toEqual([["q1", 1], ["q2", 2], ["q3", 3]]);
    expect(preview.questions[0]?.options.map((option) => option.id)).toEqual(["o1", "o2"]);
    expect(preview.questions[1]?.scenarioId).toBe("s1");
    expect(preview.questions[2]?.clinicalCaseId).toBe("case-1");
  });

  it("never carries correct answers, feedback, explanation, rubric or an answer", () => {
    const preview = toStudentPreview(dto);

    for (const question of preview.questions) {
      expect(question.answer).toBeNull();
      expect("explanation" in question).toBe(false);
      expect("rubric" in question).toBe(false);
      expect("earnedScore" in question).toBe(false);

      for (const option of question.options) {
        expect("isCorrect" in option).toBe(false);
        expect("feedback" in option).toBe(false);
      }
    }
  });
});

function assignmentDto(id: string, overrides: Partial<EvaluationAssignmentDTO> = {}): EvaluationAssignmentDTO {
  return {
    id,
    evaluationId: "e1",
    evaluationTitle: "Parcial",
    evaluationType: "EXAM",
    evaluationStatus: "READY",
    groupId: `g-${id}`,
    groupName: `Grupo ${id}`,
    startsAt: "2026-10-10T13:00:00.000Z",
    endsAt: "2026-10-12T13:00:00.000Z",
    state: "ACTIVE",
    assignedById: "teacher-1",
    legacyIsActive: null,
    attemptCounts: { inProgress: 1, submitted: 0, pendingReview: 2, graded: 3 },
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("assignment mappers", () => {
  it("maps assignments sorted by start, most recent first", () => {
    const result = toEvaluationAssignments([
      assignmentDto("a1"),
      assignmentDto("a2", { startsAt: "2026-10-20T13:00:00.000Z", state: "UPCOMING" }),
    ]);

    expect(result.map((item) => item.id)).toEqual(["a2", "a1"]);
    expect(result[1]).toEqual({
      id: "a1",
      groupId: "g-a1",
      groupName: "Grupo a1",
      startsAt: "2026-10-10T13:00:00.000Z",
      endsAt: "2026-10-12T13:00:00.000Z",
      state: "ACTIVE",
      attemptCounts: { inProgress: 1, submitted: 0, pendingReview: 2, graded: 3 },
    });
  });

  it("keeps only active student groups, sorted by name", () => {
    const group = (id: string, name: string, overrides: Partial<GroupDTO> = {}) =>
      ({ id, name, type: "STUDENT", isActive: true, membersCount: 4, ...overrides }) as GroupDTO;

    expect(toGroupChoices([
      group("g1", "UCI B"),
      group("g2", "Docentes", { type: "TEACHER" }),
      group("g3", "Inactivo", { isActive: false }),
      group("g4", "Anestesia"),
    ])).toEqual([
      { id: "g4", name: "Anestesia", membersCount: 4 },
      { id: "g1", name: "UCI B", membersCount: 4 },
    ]);
  });
});
