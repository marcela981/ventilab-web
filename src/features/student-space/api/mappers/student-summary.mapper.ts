/*
* Funcionalidad: Student summary mapper
* Descripción: Maps `GET /api/me/summary` (MySummaryDTO) to the StudentSummary entity. Values are copied as the API returns them (no client-side metric); only defensive normalisations apply: missing lists become empty and an invalid unread count becomes 0. Depends on the student space DTOs and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type {
  ProgressItem,
  StudentSummary,
  SummaryConversation,
  SummaryEvaluation,
  SummaryGrade,
  SummaryNote,
  SummaryReservation,
  SummarySimulationSession,
} from "../../application/entities/student-summary.entity";
import type {
  MyConversationDTO,
  MyGradeDTO,
  MyNoteDTO,
  MyReservationDTO,
  MySimulationSessionDTO,
  MySummaryDTO,
  ProgressItemDTO,
  SummaryEvaluationDTO,
} from "../dtos/student-space.dto";

export function toProgressItem(dto: ProgressItemDTO): ProgressItem {
  return {
    id: dto.id,
    percentage: dto.percentage,
    completedLessons: dto.completedLessons,
    totalLessons: dto.totalLessons,
    completed: dto.completed,
  };
}

function toEvaluation(dto: SummaryEvaluationDTO): SummaryEvaluation {
  return {
    assignmentId: dto.assignmentId,
    evaluationId: dto.evaluationId,
    title: dto.evaluationTitle,
    type: dto.evaluationType,
    startsAt: dto.startsAt,
    endsAt: dto.endsAt,
  };
}

function toGrade(dto: MyGradeDTO): SummaryGrade {
  return {
    evaluationId: dto.evaluationId,
    title: dto.evaluationTitle,
    type: dto.evaluationType,
    attemptNumber: dto.attemptNumber,
    grade: dto.grade,
    passed: dto.passed,
    publishedAt: dto.publishedAt,
  };
}

function toNote(dto: MyNoteDTO): SummaryNote {
  return { id: dto.id, lessonId: dto.lessonId, pageId: dto.pageId, excerpt: dto.excerpt, updatedAt: dto.updatedAt };
}

function toConversation(dto: MyConversationDTO): SummaryConversation {
  return { id: dto.id, title: dto.title, scope: dto.scope, updatedAt: dto.updatedAt };
}

function toSession(dto: MySimulationSessionDTO): SummarySimulationSession {
  return {
    id: dto.id,
    mode: dto.mode,
    status: dto.status,
    score: dto.score,
    startedAt: dto.startedAt,
    endedAt: dto.endedAt,
  };
}

function toReservation(dto: MyReservationDTO): SummaryReservation {
  return {
    id: dto.id,
    startsAt: dto.startsAt,
    endsAt: dto.endsAt,
    purpose: dto.purpose,
    heldByGroup: dto.holderType === "GROUP",
  };
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function list<T, R>(items: readonly T[] | null | undefined, map: (item: T) => R): R[] {
  return (items ?? []).map(map);
}

export function toStudentSummary(dto: MySummaryDTO): StudentSummary {
  return {
    overallProgress: toProgressItem(dto.progress.overall),
    sectionProgress: list(dto.progress.sections, toProgressItem),
    activeEvaluations: list(dto.activeEvaluations, toEvaluation),
    upcomingEvaluations: list(dto.upcomingEvaluations, toEvaluation),
    grades: list(dto.grades, toGrade),
    latestNotes: list(dto.latestNotes, toNote),
    latestConversations: list(dto.latestConversations, toConversation),
    latestSimulationSessions: list(dto.latestSimulationSessions, toSession),
    upcomingReservations: list(dto.upcomingReservations, toReservation),
    unreadNotifications: toCount(dto.unreadNotifications),
  };
}
