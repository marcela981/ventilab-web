/*
* Funcionalidad: Evaluation readiness (builder)
* Descripción: Client-side READY validation of the evaluation builder, mirroring the backend rule (ventylab-server src/features/evaluation/domain/services/evaluation-readiness.ts): at least one question, positive points, choice questions with at least one correct option (exactly one in SINGLE_CHOICE and TRUE_FALSE, and TRUE_FALSE with exactly two options, checked first) and a valid rubric (validateSimulationRubric) in SIMULATION questions; returns every issue found, with the same codes as the backend. Adds one client-only rule the backend does not enforce: a SIMULATION question needs a clinical case (code clinical_case_required). readinessQuestionsFrom builds the input from the loaded evaluation with the unsaved drafts applied, so the check runs on what the teacher sees. Depends on the builder entities and the simulation rubric entity. v1.1 (A3 review W2): the client-only clinical_case_required rule is removed (the backend does not enforce it, so it no longer blocks READY nor is listed after a 422); the missing clinical case is only a non-blocking hint on the SIMULATION card.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { BuilderEvaluation, QuestionType, ReadinessIssue } from "./evaluation-builder.entity";
import { rubricIssueMessage, toRubricValue, validateSimulationRubric } from "./simulation-rubric.entity";
import type { RubricDraft } from "./simulation-rubric.entity";

export type ReadinessQuestion = {
  id: string
  type: QuestionType
  points: number
  options: ReadonlyArray<{ isCorrect: boolean }>
  rubric: unknown
  clinicalCaseId: string | null
};

const TRUE_FALSE_OPTION_COUNT = 2;

function issue(code: string, questionId: string | null, details: string[] = []): ReadinessIssue {
  return { code, questionId, details };
}

function choiceIssues(question: ReadinessQuestion): ReadinessIssue[] {
  if (question.type === "TRUE_FALSE" && question.options.length !== TRUE_FALSE_OPTION_COUNT) {
    return [issue("true_false_two_options_required", question.id)];
  }

  const correctCount = question.options.filter((option) => option.isCorrect).length;

  if (correctCount === 0) {
    return [issue("correct_option_required", question.id)];
  }

  return correctCount > 1 && question.type !== "MULTIPLE_CHOICE" ? [issue("single_correct_option_required", question.id)] : [];
}

function questionIssues(question: ReadinessQuestion): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];

  if (!(Number.isFinite(question.points) && question.points > 0)) {
    issues.push(issue("points_not_positive", question.id));
  }

  if (question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
    issues.push(...choiceIssues(question));
  }

  if (question.type === "SIMULATION") {
    const validation = validateSimulationRubric(question.rubric);

    if (!validation.valid) {
      issues.push(issue("invalid_rubric", question.id, validation.issues.map(rubricIssueMessage)));
    }
  }

  return issues;
}

export function validateEvaluationReadiness(questions: readonly ReadinessQuestion[]): ReadinessIssue[] {
  if (questions.length === 0) {
    return [issue("no_questions", null)];
  }

  return questions.flatMap(questionIssues);
}

// The parts of an unsaved question draft that affect readiness.
export type ReadinessDraft = {
  points: string
  options: ReadonlyArray<{ isCorrect: boolean }>
  clinicalCaseId: string | null
  rubric: RubricDraft
};

function parsePoints(value: string): number {
  const trimmed = value.trim().replace(",", ".");

  return trimmed === "" ? Number.NaN : Number(trimmed);
}

export function readinessQuestionsFrom(evaluation: BuilderEvaluation, drafts: Readonly<Record<string, ReadinessDraft>>): ReadinessQuestion[] {
  return evaluation.questions.map((question) => {
    const draft = drafts[question.id];

    if (!draft) {
      return {
        id: question.id,
        type: question.type,
        points: question.points,
        options: question.options,
        rubric: question.rubric,
        clinicalCaseId: question.clinicalCaseId,
      };
    }

    return {
      id: question.id,
      type: question.type,
      points: parsePoints(draft.points),
      options: draft.options,
      rubric: toRubricValue(draft.rubric),
      clinicalCaseId: draft.clinicalCaseId,
    };
  });
}
