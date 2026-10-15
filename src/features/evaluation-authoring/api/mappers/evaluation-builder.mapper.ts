/*
* Funcionalidad: Evaluation builder mapper
* Descripción: Maps the EvaluationDetailDTO of `GET /api/evaluations/{id}` to the BuilderEvaluation of the builder: scenarios and questions sorted by order, options sorted by order, media normalized, the description kept as text or Tiptap document (blank text becomes null), prompts and scenario contents kept as Tiptap documents (a non-object falls back to an empty document) and the readiness issues with their details. Also maps the metadata create body and update changes to their request DTOs (the generated schema types a Tiptap description as an empty record, so the document is passed through as the backend accepts it). Depends on the authoring DTOs and the builder entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { emptyDoc, isRichDoc } from "../../application/entities/builder-rich-text";
import type { RichDoc, RichTextValue } from "../../application/entities/builder-rich-text";
import type {
  BuilderEvaluation,
  BuilderMedia,
  BuilderOption,
  BuilderQuestion,
  BuilderScenario,
  CreateEvaluationBody,
  UpdateEvaluationChanges,
} from "../../application/entities/evaluation-builder.entity";
import type {
  CreateEvaluationDTO,
  EvaluationDetailDTO,
  EvaluationMediaDTO,
  EvaluationOptionDTO,
  EvaluationQuestionDTO,
  EvaluationScenarioDTO,
  UpdateEvaluationDTO,
} from "../dtos/evaluation-authoring.dto";

const byOrder = (a: { order: number }, b: { order: number }): number => a.order - b.order;

function toDoc(value: unknown): RichDoc {
  return isRichDoc(value) ? value : emptyDoc();
}

function toDescription(value: unknown): RichTextValue | null {
  if (typeof value === "string") {
    return value.trim() === "" ? null : value;
  }

  return isRichDoc(value) ? value : null;
}

export function toBuilderMedia(dto: EvaluationMediaDTO): BuilderMedia {
  return { mediaId: dto.mediaId, url: dto.url, mimeType: dto.mimeType, kind: dto.kind };
}

function toOption(dto: EvaluationOptionDTO): BuilderOption {
  return {
    id: dto.id,
    order: dto.order,
    content: dto.content,
    isCorrect: dto.isCorrect,
    mediaId: dto.mediaId,
    media: dto.media ? toBuilderMedia(dto.media) : null,
  };
}

function toQuestion(dto: EvaluationQuestionDTO): BuilderQuestion {
  return {
    id: dto.id,
    scenarioId: dto.scenarioId,
    order: dto.order,
    type: dto.type,
    prompt: toDoc(dto.prompt),
    points: dto.points,
    explanation: dto.explanation,
    mediaIds: dto.mediaIds,
    media: dto.media.map(toBuilderMedia),
    clinicalCaseId: dto.clinicalCaseId,
    rubric: dto.rubric ?? null,
    options: [...dto.options].sort(byOrder).map(toOption),
  };
}

function toScenario(dto: EvaluationScenarioDTO): BuilderScenario {
  return {
    id: dto.id,
    order: dto.order,
    content: toDoc(dto.content),
    mediaIds: dto.mediaIds,
    media: dto.media.map(toBuilderMedia),
  };
}

export function toBuilderEvaluation(dto: EvaluationDetailDTO): BuilderEvaluation {
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    description: toDescription(dto.description),
    status: dto.status,
    moduleId: dto.moduleId,
    levelId: dto.levelId,
    durationMinutes: dto.durationMinutes,
    maxAttempts: dto.maxAttempts,
    shuffleQuestions: dto.shuffleQuestions,
    showResultsImmediately: dto.showResultsImmediately,
    structureLocked: dto.structureLocked,
    canManage: dto.canManage,
    usage: {
      attempts: dto.usage.attempts,
      submittedAttempts: dto.usage.submittedAttempts,
      assignments: dto.usage.assignments,
    },
    scenarios: [...dto.scenarios].sort(byOrder).map(toScenario),
    questions: [...dto.questions].sort(byOrder).map(toQuestion),
    readinessIssues: dto.readinessIssues.map((issue) => ({
      code: issue.code,
      questionId: issue.questionId,
      details: issue.details,
    })),
  };
}

type DescriptionDTO = NonNullable<CreateEvaluationDTO["description"]>;

// openapi-typescript renders `oneOf [string, object]` as `string | Record<string, never>`; the backend takes any Tiptap document.
const toDescriptionDTO = (value: RichTextValue): DescriptionDTO => value as DescriptionDTO;

export function toCreateEvaluationDTO(body: CreateEvaluationBody): CreateEvaluationDTO {
  const { description, ...rest } = body;

  return description === undefined ? rest : { ...rest, description: toDescriptionDTO(description) };
}

export function toUpdateEvaluationDTO(changes: UpdateEvaluationChanges): UpdateEvaluationDTO {
  const { description, ...rest } = changes;

  if (description === undefined) {
    return rest;
  }

  return { ...rest, description: description === null ? null : toDescriptionDTO(description) };
}
