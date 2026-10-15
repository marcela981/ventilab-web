/*
* Funcionalidad: Grading attempt mappers
* Descripción: Maps `GET /api/evaluation-grading/attempts/{attemptId}` and `GET .../feedback` to the grading attempt entities: questions sorted by order as the evaluations feature renders them (rich-text prompt, media, options sorted by order; the correct option ids and the plain-text explanation are kept apart for the staff view), each joined with its answer by questionId (automatic, manual and earned scores, pending flag, teacher comment) and the practical score of a SIMULATION answer. The OpenAPI schema types the rubric breakdown as opaque objects, so every row is read defensively: the criterion (or parameter) name, value, threshold, points, weighted points and justification, each null when absent or of another type. Depends on the evaluations barrel (toRichText and types) and the grading DTOs and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toRichText } from "@features/evaluations";
import type { AttemptAnswer, AttemptOption, AttemptQuestion, AttemptScenario, EvaluationMedia } from "@features/evaluations";
import type {
  GradeFeedbackDTO,
  GradeFeedbackItemDTO,
  GradingAnswerDTO,
  GradingAttemptDTO,
  GradingMediaDTO,
  GradingOptionDTO,
  GradingQuestionDTO,
  GradingScenarioDTO,
  PracticalScoreDTO,
} from "../dtos/grading.dto";
import type {
  FeedbackItem,
  GradingAttempt,
  GradingFeedback,
  GradingItem,
  PracticalScore,
  RubricBreakdownRow,
} from "../../application/entities/grading-attempt.entity";

const byOrder = (a: { order: number }, b: { order: number }): number => a.order - b.order;

function toMedia(dto: GradingMediaDTO): EvaluationMedia {
  return { mediaId: dto.mediaId, kind: dto.kind, mimeType: dto.mimeType, url: dto.url, expiresAt: dto.expiresAt };
}

function toOption(dto: GradingOptionDTO): AttemptOption {
  return { id: dto.id, order: dto.order, content: dto.content, media: dto.media ? toMedia(dto.media) : null };
}

function toAnswer(dto: GradingAnswerDTO | undefined): AttemptAnswer | null {
  // answerId is null when the student did not answer.
  return dto?.answerId
    ? { selectedOptionIds: dto.selectedOptionIds, textAnswer: dto.textAnswer, simulationSessionId: dto.simulationSessionId }
    : null;
}

function toQuestion(dto: GradingQuestionDTO, index: number, answer: AttemptAnswer | null): AttemptQuestion {
  return {
    id: dto.id,
    scenarioId: dto.scenarioId,
    position: index + 1,
    type: dto.type,
    prompt: toRichText(dto.prompt),
    media: dto.media.map(toMedia),
    points: dto.points,
    clinicalCaseId: dto.clinicalCaseId,
    options: [...dto.options].sort(byOrder).map(toOption),
    answer,
  };
}

const numberOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const textOrNull = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value : null);

export function toRubricBreakdownRow(raw: unknown): RubricBreakdownRow | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const criterion = textOrNull(row.criterion) ?? textOrNull(row.parameter) ?? textOrNull(row.label);

  if (!criterion) {
    return null;
  }

  return {
    criterion,
    value: numberOrNull(row.value),
    threshold: numberOrNull(row.threshold),
    points: numberOrNull(row.points),
    weightedPoints: numberOrNull(row.weightedPoints),
    justification: textOrNull(row.justification),
  };
}

export function toPracticalScore(dto: PracticalScoreDTO | null): PracticalScore | null {
  if (!dto) {
    return null;
  }

  return {
    available: dto.available,
    score: dto.score,
    breakdown: (dto.breakdown as unknown[]).map(toRubricBreakdownRow).filter((row): row is RubricBreakdownRow => row !== null),
    reason: dto.reason,
  };
}

function toItem(dto: GradingQuestionDTO, index: number, answer: GradingAnswerDTO | undefined): GradingItem {
  const studentAnswer = toAnswer(answer);

  return {
    question: toQuestion(dto, index, studentAnswer),
    answer: studentAnswer,
    correctOptionIds: [...dto.options].sort(byOrder).filter((option) => option.isCorrect).map((option) => option.id),
    explanation: dto.explanation?.trim() ? dto.explanation : null,
    autoScore: answer?.autoScore ?? null,
    manualScore: answer?.manualScore ?? null,
    earnedScore: answer?.earnedScore ?? null,
    pending: answer?.pending ?? false,
    teacherComment: answer?.teacherComment ?? null,
    practicalScore: toPracticalScore(answer?.practicalScore ?? null),
  };
}

function toScenario(dto: GradingScenarioDTO): AttemptScenario {
  return { id: dto.id, order: dto.order, content: toRichText(dto.content), media: dto.media.map(toMedia) };
}

export function toGradingAttempt(dto: GradingAttemptDTO): GradingAttempt {
  const answers = new Map(dto.answers.map((answer) => [answer.questionId, answer]));

  return {
    id: dto.id,
    attemptNumber: dto.attemptNumber,
    evaluationId: dto.evaluationId,
    evaluationTitle: dto.evaluationTitle,
    studentId: dto.userId,
    status: dto.status,
    submittedAt: dto.submittedAt,
    score: dto.score,
    maxScore: dto.maxScore,
    grade: dto.grade,
    passed: dto.passed,
    passingGrade: dto.passingGrade,
    publishedAt: dto.gradePublishedAt,
    legacy: dto.legacy,
    scenarios: [...dto.scenarios].sort(byOrder).map(toScenario),
    items: [...dto.questions].sort(byOrder).map((question, index) => toItem(question, index, answers.get(question.id))),
  };
}

function toFeedbackItem(dto: GradeFeedbackItemDTO): FeedbackItem {
  return {
    id: dto.id,
    questionId: dto.questionId,
    status: dto.status,
    source: dto.source,
    content: dto.content,
    provider: dto.provider,
    model: dto.model,
    updatedAt: dto.updatedAt,
  };
}

export function toGradingFeedback(dto: GradeFeedbackDTO): GradingFeedback {
  return { overall: dto.overall ? toFeedbackItem(dto.overall) : null, questions: dto.questions.map(toFeedbackItem) };
}
