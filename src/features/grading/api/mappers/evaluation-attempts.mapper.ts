/*
* Funcionalidad: Evaluation attempts mappers
* Descripción: Maps the page of `GET /api/evaluation-grading/attempts` (EvaluationAttemptsPageDTO plus the envelope pagination) to the EvaluationAttemptsPage of the unified grading screen: one row per attempt with the student flattened (blank names become null) and the counts per status (missing counts read as 0). The pagination falls back to the row count when the envelope has none. Depends on the grading DTOs and the evaluation attempts entities. v1.1 (ajustes C1): maps answersReleasedAt.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ApiPagination } from "@shared/api-client/api-types";
import type { AttemptStatusCounts, EvaluationAttemptRow, EvaluationAttemptsPage } from "../../application/entities/evaluation-attempts.entity";
import type { AttemptStatusCountsDTO, EvaluationAttemptsPageDTO, GradingAttemptListItemDTO } from "../dtos/grading.dto";

export function toEvaluationAttemptRow(dto: GradingAttemptListItemDTO): EvaluationAttemptRow {
  return {
    attemptId: dto.attemptId,
    evaluationId: dto.evaluationId,
    assignmentId: dto.assignmentId,
    groupId: dto.groupId,
    attemptNumber: dto.attemptNumber,
    studentId: dto.student.id,
    studentName: dto.student.name?.trim() || null,
    studentEmail: dto.student.email,
    status: dto.status,
    startedAt: dto.startedAt,
    submittedAt: dto.submittedAt,
    score: dto.score,
    maxScore: dto.maxScore,
    grade: dto.grade,
    gradePublishedAt: dto.gradePublishedAt,
    answersReleasedAt: dto.answersReleasedAt,
    isLate: dto.isLate,
  };
}

const count = (value: number | undefined): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export function toAttemptStatusCounts(dto: Partial<AttemptStatusCountsDTO> | null | undefined): AttemptStatusCounts {
  return {
    IN_PROGRESS: count(dto?.IN_PROGRESS),
    SUBMITTED: count(dto?.SUBMITTED),
    PENDING_REVIEW: count(dto?.PENDING_REVIEW),
    GRADED: count(dto?.GRADED),
    total: count(dto?.total),
  };
}

export function toEvaluationAttemptsPage(dto: EvaluationAttemptsPageDTO, pagination: ApiPagination | null): EvaluationAttemptsPage {
  return {
    items: dto.items.map(toEvaluationAttemptRow),
    counts: toAttemptStatusCounts(dto.counts),
    total: pagination?.total ?? dto.items.length,
    page: pagination?.page ?? 1,
    pages: pagination?.pages ?? 1,
  };
}
