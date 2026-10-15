/*
* Funcionalidad: Evaluation student preview mapper
* Descripción: Maps the EvaluationDetailDTO of `GET /api/evaluations/{id}` (the authoring view, which carries the correct answers, explanations, rubrics and option feedback) to the StudentPreview rendered with the student components of @features/evaluations: scenarios and questions in the shape of an unpublished attempt (AttemptScenario, AttemptQuestion), sorted by order, numbered from 1, with no answer and WITHOUT isCorrect, option feedback, explanation, rubric or earned score, exactly what a student sees while answering. Depends on the authoring DTOs, the preview entity and the @features/evaluations barrel (entities and toRichText).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toRichText } from "@features/evaluations";
import type { AttemptOption, AttemptQuestion, AttemptScenario, EvaluationMedia } from "@features/evaluations";
import type { StudentPreview } from "../../application/entities/student-preview.entity";
import type {
  EvaluationDetailDTO,
  EvaluationMediaDTO,
  EvaluationOptionDTO,
  EvaluationQuestionDTO,
  EvaluationScenarioDTO,
} from "../dtos/evaluation-authoring.dto";

const byOrder = (a: { order: number }, b: { order: number }): number => a.order - b.order;

function toPreviewMedia(dto: EvaluationMediaDTO): EvaluationMedia {
  return { mediaId: dto.mediaId, kind: dto.kind, mimeType: dto.mimeType, url: dto.url, expiresAt: dto.expiresAt };
}

// Only the fields a student receives: never isCorrect or feedback.
function toPreviewOption(dto: EvaluationOptionDTO): AttemptOption {
  return { id: dto.id, order: dto.order, content: dto.content, media: dto.media ? toPreviewMedia(dto.media) : null };
}

// Never explanation, rubric or earnedScore: the student sees them only on a published result.
function toPreviewQuestion(dto: EvaluationQuestionDTO, index: number): AttemptQuestion {
  return {
    id: dto.id,
    scenarioId: dto.scenarioId,
    position: index + 1,
    type: dto.type,
    prompt: toRichText(dto.prompt),
    media: dto.media.map(toPreviewMedia),
    points: dto.points,
    clinicalCaseId: dto.clinicalCaseId,
    options: [...dto.options].sort(byOrder).map(toPreviewOption),
    answer: null,
  };
}

function toPreviewScenario(dto: EvaluationScenarioDTO): AttemptScenario {
  return { id: dto.id, order: dto.order, content: toRichText(dto.content), media: dto.media.map(toPreviewMedia) };
}

export function toStudentPreview(dto: EvaluationDetailDTO): StudentPreview {
  return {
    title: dto.title,
    description: toRichText(dto.description),
    scenarios: [...dto.scenarios].sort(byOrder).map(toPreviewScenario),
    questions: [...dto.questions].sort(byOrder).map(toPreviewQuestion),
  };
}
