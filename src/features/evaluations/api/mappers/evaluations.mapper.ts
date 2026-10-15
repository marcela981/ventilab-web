/*
* Funcionalidad: Evaluations mappers
* Descripción: Pure DTO → entity mappers of the student evaluations feature: my evaluations (items without an evaluation summary are dropped, attempts sorted by number, the result only when the attempt is published and the API sent its grade), my grades, the attempt start and the attempt detail (scenarios by order, questions by position, options by order; isCorrect, feedback, explanation, rubric and earnedScore are copied only when the backend sends them, that is, once published). Descriptions, prompts and scenario contents become RichText: a non-empty string is text, a Tiptap document object is a doc. Depends on the evaluations DTOs and entities. v1.1 (E2): toSaveAnswerBody, the PUT body of one answer by question type (choices send selectedOptionIds, OPEN_TEXT sends textAnswer, SIMULATION sends simulationSessionId when there is one).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type {
  AttemptAnswer,
  AttemptDetail,
  AttemptOption,
  AttemptQuestion,
  AttemptResult,
  AttemptScenario,
  AttemptStart,
  AttemptSummary,
  EvaluationMedia,
  MyEvaluation,
  MyGrade,
  QuestionType,
  RichText,
} from "../../application/entities/evaluation.entity";
import type {
  EvaluationMediaDTO,
  MyEvaluationAttemptDTO,
  MyEvaluationDTO,
  MyEvaluationGradeDTO,
  SaveEvaluationAnswerDTO,
  StudentAnswerDTO,
  StudentAttemptDetailDTO,
  StudentAttemptStartDTO,
  StudentOptionDTO,
  StudentQuestionDTO,
  StudentScenarioDTO,
} from "../dtos/evaluations.dto";

export function toRichText(value: unknown): RichText | null {
  if (typeof value === "string") {
    return value.trim() === "" ? null : { kind: "text", text: value };
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return { kind: "doc", doc: value as Record<string, unknown> };
  }

  return null;
}

type ResultFields = {
  published: boolean
  score?: number | null | undefined
  maxScore?: number | null | undefined
  grade?: number | undefined
  passed?: boolean | undefined
};

export function toAttemptResult(fields: ResultFields): AttemptResult | null {
  const { published, score, maxScore, grade, passed } = fields;

  if (!published || typeof grade !== "number" || typeof passed !== "boolean") {
    return null;
  }

  return { grade, passed, score: score ?? 0, maxScore: maxScore ?? 0 };
}

export function toAttemptSummary(dto: MyEvaluationAttemptDTO): AttemptSummary {
  return {
    id: dto.id,
    attemptNumber: dto.attemptNumber,
    status: dto.status,
    startedAt: dto.startedAt,
    submittedAt: dto.submittedAt,
    deadlineAt: dto.deadlineAt,
    published: dto.published,
    result: toAttemptResult(dto),
  };
}

export function toMyEvaluation(dto: MyEvaluationDTO): MyEvaluation | null {
  const { evaluation } = dto;

  if (!evaluation) {
    return null;
  }

  return {
    assignmentId: dto.assignmentId,
    evaluationId: evaluation.id,
    title: evaluation.title,
    type: evaluation.type,
    description: toRichText(evaluation.description),
    durationMinutes: evaluation.durationMinutes,
    maxAttempts: evaluation.maxAttempts,
    questionCount: evaluation.questionCount,
    state: dto.state,
    startsAt: dto.startsAt,
    endsAt: dto.endsAt,
    canStart: dto.canStart,
    attempts: dto.attempts.map(toAttemptSummary).sort((a, b) => a.attemptNumber - b.attemptNumber),
  };
}

export function toMyEvaluations(dtos: readonly MyEvaluationDTO[]): MyEvaluation[] {
  return dtos.flatMap((dto) => {
    const item = toMyEvaluation(dto);

    return item ? [item] : [];
  });
}

export function toMyGrade(dto: MyEvaluationGradeDTO): MyGrade {
  return {
    attemptId: dto.attemptId,
    evaluationId: dto.evaluationId,
    evaluationTitle: dto.evaluationTitle,
    evaluationType: dto.evaluationType,
    attemptNumber: dto.attemptNumber,
    grade: dto.grade,
    passed: dto.passed,
    score: dto.score,
    maxScore: dto.maxScore,
    publishedAt: dto.publishedAt,
  };
}

export function toAttemptStart(dto: StudentAttemptStartDTO): AttemptStart {
  return {
    attemptId: dto.id,
    evaluationId: dto.evaluationId,
    status: dto.status,
    created: dto.created,
  };
}

function toMedia(dto: EvaluationMediaDTO): EvaluationMedia {
  return { mediaId: dto.mediaId, kind: dto.kind, mimeType: dto.mimeType, url: dto.url, expiresAt: dto.expiresAt };
}

function toOption(dto: StudentOptionDTO): AttemptOption {
  const option: AttemptOption = {
    id: dto.id,
    order: dto.order,
    content: dto.content,
    media: dto.media ? toMedia(dto.media) : null,
  };

  if (dto.isCorrect !== undefined) {
    option.isCorrect = dto.isCorrect;
  }

  if (dto.feedback !== undefined) {
    option.feedback = dto.feedback;
  }

  return option;
}

function toAnswer(dto: StudentAnswerDTO | null): AttemptAnswer | null {
  if (!dto) {
    return null;
  }

  return {
    selectedOptionIds: [...dto.selectedOptionIds],
    textAnswer: dto.textAnswer,
    simulationSessionId: dto.simulationSessionId,
  };
}

function toQuestion(dto: StudentQuestionDTO): AttemptQuestion {
  const question: AttemptQuestion = {
    id: dto.id,
    scenarioId: dto.scenarioId,
    position: dto.position,
    type: dto.type,
    prompt: toRichText(dto.prompt),
    media: dto.media.map(toMedia),
    points: dto.points,
    clinicalCaseId: dto.clinicalCaseId,
    options: dto.options.map(toOption).sort((a, b) => a.order - b.order),
    answer: toAnswer(dto.answer),
  };

  if (dto.earnedScore !== undefined) {
    question.earnedScore = dto.earnedScore;
  }

  if (dto.explanation !== undefined) {
    question.explanation = dto.explanation;
  }

  if (dto.rubric !== undefined) {
    question.rubric = dto.rubric as Record<string, unknown> | null;
  }

  return question;
}

function toScenario(dto: StudentScenarioDTO): AttemptScenario {
  return { id: dto.id, order: dto.order, content: toRichText(dto.content), media: dto.media.map(toMedia) };
}

export function toAttemptDetail(dto: StudentAttemptDetailDTO): AttemptDetail {
  return {
    id: dto.id,
    assignmentId: dto.assignmentId,
    attemptNumber: dto.attemptNumber,
    status: dto.status,
    startedAt: dto.startedAt,
    submittedAt: dto.submittedAt,
    deadlineAt: dto.deadlineAt,
    serverNow: dto.serverNow,
    published: dto.published,
    evaluation: {
      id: dto.evaluation.id,
      title: dto.evaluation.title,
      type: dto.evaluation.type,
      description: toRichText(dto.evaluation.description),
    },
    scenarios: dto.scenarios.map(toScenario).sort((a, b) => a.order - b.order),
    questions: dto.questions.map(toQuestion).sort((a, b) => a.position - b.position),
    result: toAttemptResult(dto),
  };
}

export function toSaveAnswerBody(type: QuestionType, answer: AttemptAnswer): SaveEvaluationAnswerDTO {
  if (type === "OPEN_TEXT") {
    return { textAnswer: answer.textAnswer ?? "" };
  }

  if (type === "SIMULATION") {
    return answer.simulationSessionId ? { simulationSessionId: answer.simulationSessionId } : {};
  }

  return { selectedOptionIds: [...answer.selectedOptionIds] };
}
