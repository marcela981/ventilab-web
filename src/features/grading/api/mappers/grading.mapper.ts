/*
* Funcionalidad: Grading mappers
* Descripción: Maps the grading API DTOs to the grading entities: a queue item (student name and email, evaluation title and type, attempt number, submission date, auto score), a queue page with the envelope pagination (falling back to the row count when it is missing), and the evaluation and student group filter options (only active STUDENT groups). Depends on the grading DTOs and entities and the api-client pagination type.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ApiPagination } from "@shared/api-client/api-types";
import type { EvaluationSummaryDTO, GradingQueueItemDTO, GroupDTO } from "../dtos/grading.dto";
import type { FilterOption, GradingQueueItem, GradingQueuePage } from "../../application/entities/grading.entity";
import { sortOptions } from "../../application/entities/grading.entity";

export function toGradingQueueItem(dto: GradingQueueItemDTO): GradingQueueItem {
  return {
    attemptId: dto.attemptId,
    attemptNumber: dto.attemptNumber,
    evaluationId: dto.evaluationId,
    evaluationTitle: dto.evaluationTitle,
    evaluationType: dto.evaluationType,
    studentId: dto.student.id,
    studentName: dto.student.name?.trim() || null,
    studentEmail: dto.student.email,
    submittedAt: dto.submittedAt,
    score: dto.score,
    maxScore: dto.maxScore,
  };
}

export function toGradingQueuePage(items: readonly GradingQueueItemDTO[], pagination: ApiPagination | null): GradingQueuePage {
  return {
    items: items.map(toGradingQueueItem),
    total: pagination?.total ?? items.length,
    page: pagination?.page ?? 1,
    pages: pagination?.pages ?? 1,
  };
}

export function toEvaluationOptions(dtos: readonly EvaluationSummaryDTO[]): FilterOption[] {
  return sortOptions(dtos.map((dto) => ({ id: dto.id, label: dto.title })));
}

export function toGroupOptions(dtos: readonly GroupDTO[]): FilterOption[] {
  return sortOptions(
    dtos.filter((dto) => dto.type === "STUDENT" && dto.isActive).map((dto) => ({ id: dto.id, label: dto.name })),
  );
}
