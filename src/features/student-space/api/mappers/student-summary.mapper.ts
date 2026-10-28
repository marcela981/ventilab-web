/*
* Funcionalidad: Student summary mapper
* Descripción: Maps `GET /api/me/summary` (MySummaryDTO) to the StudentSummary entity. Values are copied as the API returns them (no client-side metric); only defensive normalisations apply: missing lists become empty and an invalid unread count becomes 0. Depends on the student space DTOs and entities. v1.1 (B2 closure): copies the section titles, grade attemptId and module, note module and titles, and session case title. v1.2 (W8, Bloque 2): copies continueLearning (null when the API has no lesson to resume).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type {
  ContinueLearning,
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
  MyContinueLearningDTO,
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
    title: dto.title,
    percentage: dto.percentage,
    completedLessons: dto.completedLessons,
    totalLessons: dto.totalLessons,
    completed: dto.completed,
  };
}

function toContinueLearning(dto: MyContinueLearningDTO | null | undefined): ContinueLearning | null {
  if (!dto) {
    return null;
  }

  return {
    moduleId: dto.moduleId,
    moduleTitle: dto.moduleTitle,
    lessonId: dto.lessonId,
    lessonTitle: dto.lessonTitle,
    percent: dto.percent,
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
    attemptId: dto.attemptId,
    evaluationId: dto.evaluationId,
    moduleId: dto.moduleId,
    moduleTitle: dto.moduleTitle,
    title: dto.evaluationTitle,
    type: dto.evaluationType,
    attemptNumber: dto.attemptNumber,
    grade: dto.grade,
    passed: dto.passed,
    publishedAt: dto.publishedAt,
  };
}

function toNote(dto: MyNoteDTO): SummaryNote {
  return {
    id: dto.id,
    lessonId: dto.lessonId,
    pageId: dto.pageId,
    moduleId: dto.moduleId,
    lessonTitle: dto.lessonTitle,
    pageTitle: dto.pageTitle,
    excerpt: dto.excerpt,
    updatedAt: dto.updatedAt,
  };
}

function toConversation(dto: MyConversationDTO): SummaryConversation {
  return { id: dto.id, title: dto.title, scope: dto.scope, updatedAt: dto.updatedAt };
}

function toSession(dto: MySimulationSessionDTO): SummarySimulationSession {
  return {
    id: dto.id,
    caseTitle: dto.caseTitle,
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
    continueLearning: toContinueLearning(dto.continueLearning),
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
