/*
* Funcionalidad: Teacher dashboard mappers
* Descripción: DTO → view model mappers of the teacher dashboard: groups (STUDENT groups as returned), group dashboard rows (progress items, published grades, simulation, AI usage per use case, ventilator hours copied as the API sends them), evaluation stats (title, passingGrade, histogram buckets), active assignments (pending review count of the assignment), reservations calendar rows (only detail rows carry a group), grading queue rows, student header, learning progress summary and the curriculum tree reduced to titles and curriculum order. No value is computed. Depends on the teacher dashboard DTOs and entities. v1.1 (closure B2): the group relation, the row risk fields and last activity, the dashboard passingGrade, riskThresholds and moduleSummary, a student's published grades and simulation sessions are copied as the API sends them.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { CurriculumEntry, CurriculumTitles, LearningSummary } from "../../application/entities/curriculum-titles.entity";
import type { StudentTimeline } from "../../application/entities/student-timeline.entity";
import type {
  ActiveAssignment,
  EvaluationStats,
  GroupDashboard,
  GroupOption,
  GroupReservation,
  ModuleSummary,
  PendingAttempt,
  ProgressItem,
  StudentGrade,
  StudentRow,
  StudentSession,
} from "../../application/entities/teacher-dashboard.entity";
import type {
  AnalyticsProgressItemDTO,
  CurriculumTreeDTO,
  EvaluationAnalyticsDTO,
  EvaluationAssignmentDTO,
  GradingQueueItemDTO,
  GroupDashboardDTO,
  GroupDTO,
  GroupModuleSummaryDTO,
  LearningProgressSummaryDTO,
  ReservationDetailDTO,
  ReservationSummaryDTO,
  SimulationSessionDTO,
  StudentDashboardRowDTO,
  StudentDTO,
  StudentGradeDTO,
  StudentTimelineDTO,
} from "../dtos/teacher-dashboard.dto";

export type StudentHeader = {
  id: string
  name: string | null
  email: string
  lastAccess: string | null
};

export function toGroupOptions(groups: readonly GroupDTO[]): GroupOption[] {
  return groups
    .filter((group) => group.type === "STUDENT")
    .map((group) => ({ id: group.id, name: group.name, membersCount: group.membersCount, relation: group.relation ?? null }));
}

function toProgressItem(item: AnalyticsProgressItemDTO): ProgressItem {
  return {
    id: item.id,
    percentage: item.percentage,
    completedLessons: item.completedLessons,
    totalLessons: item.totalLessons,
    completed: item.completed,
  };
}

export function toStudentRow(row: StudentDashboardRowDTO): StudentRow {
  return {
    userId: row.userId,
    name: row.name,
    email: row.email,
    progress: {
      overall: toProgressItem(row.progress.overall),
      sections: row.progress.sections.map(toProgressItem),
      levels: row.progress.levels.map(toProgressItem),
      modules: row.progress.modules.map(toProgressItem),
    },
    averageGrade: row.grades.averageGrade,
    evaluations: row.grades.evaluations.map((grade) => ({
      evaluationId: grade.evaluationId,
      evaluationTitle: grade.evaluationTitle,
      attemptNumber: grade.attemptNumber,
      grade: grade.grade,
      passed: grade.passed,
      publishedAt: grade.publishedAt,
    })),
    simulation: {
      sessionCount: row.simulation.sessionCount,
      averageScore: row.simulation.averageScore,
      averageTimeToStabilizeSeconds: row.simulation.averageTimeToStabilizeSeconds,
    },
    aiUsage: row.aiUsage.map((usage) => ({
      useCase: usage.useCase,
      calls: usage.calls,
      ratings: usage.ratings,
      helpfulPercentage: usage.helpfulPercentage,
    })),
    ventilatorHours: row.ventilatorHours,
    atRisk: row.atRisk,
    riskReasons: [...row.riskReasons],
    failedEvaluationIds: [...row.failedEvaluationIds],
    lastActivityAt: row.lastActivityAt,
  };
}

function toModuleSummary(item: GroupModuleSummaryDTO): ModuleSummary {
  return {
    moduleId: item.moduleId,
    moduleTitle: item.moduleTitle,
    averageProgressPct: item.averageProgressPct,
    completedCount: item.completedCount,
    studentCount: item.studentCount,
  };
}

export function toGroupDashboard(dashboard: GroupDashboardDTO): GroupDashboard {
  return {
    groupId: dashboard.groupId,
    groupName: dashboard.groupName,
    generatedAt: dashboard.generatedAt,
    passingGrade: dashboard.passingGrade,
    riskThresholds: {
      maxFailedEvaluations: dashboard.riskThresholds.maxFailedEvaluations,
      minProgressPct: dashboard.riskThresholds.minProgressPct,
      inactivityDays: dashboard.riskThresholds.inactivityDays,
    },
    moduleSummary: dashboard.moduleSummary.map(toModuleSummary),
    students: dashboard.students.map(toStudentRow),
  };
}

export function toStudentGrades(grades: readonly StudentGradeDTO[]): StudentGrade[] {
  return grades.map((grade) => ({
    attemptId: grade.attemptId,
    attemptNumber: grade.attemptNumber,
    evaluationId: grade.evaluationId,
    evaluationTitle: grade.evaluationTitle,
    moduleTitle: grade.moduleTitle,
    grade: grade.grade,
    passed: grade.passed,
    publishedAt: grade.publishedAt,
  }));
}

export function toStudentSessions(sessions: readonly SimulationSessionDTO[]): StudentSession[] {
  return sessions.map((session) => ({
    id: session.id,
    caseTitle: session.caseTitle,
    mode: session.mode,
    status: session.status,
    score: session.score,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  }));
}

export function toEvaluationStats(stats: EvaluationAnalyticsDTO): EvaluationStats {
  return {
    evaluationId: stats.evaluationId,
    title: stats.title,
    passingGrade: stats.passingGrade,
    gradedCount: stats.gradedCount,
    histogram: stats.histogram.map((bucket) => ({ from: bucket.from, to: bucket.to, count: bucket.count })),
  };
}

export function toActiveAssignments(assignments: readonly EvaluationAssignmentDTO[]): ActiveAssignment[] {
  return assignments.map((assignment) => ({
    id: assignment.id,
    evaluationId: assignment.evaluationId,
    evaluationTitle: assignment.evaluationTitle,
    startsAt: assignment.startsAt,
    endsAt: assignment.endsAt,
    pendingReview: assignment.attemptCounts.pendingReview,
  }));
}

function isDetail(row: ReservationDetailDTO | ReservationSummaryDTO): row is ReservationDetailDTO {
  return "holderType" in row;
}

/** Calendar rows of staff are detail rows; summary rows (other people's slots seen by students) carry no group. */
export function toGroupReservations(rows: ReadonlyArray<ReservationDetailDTO | ReservationSummaryDTO>): GroupReservation[] {
  return rows.filter(isDetail).map((row) => ({
    id: row.id,
    groupId: row.group?.id ?? null,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    purpose: row.purpose,
  }));
}

export function toPendingAttempts(items: readonly GradingQueueItemDTO[]): PendingAttempt[] {
  return items.map((item) => ({
    attemptId: item.attemptId,
    attemptNumber: item.attemptNumber,
    evaluationId: item.evaluationId,
    evaluationTitle: item.evaluationTitle,
    studentId: item.student.id,
    submittedAt: item.submittedAt,
  }));
}

export function toStudentHeader(student: StudentDTO): StudentHeader {
  return { id: student.id, name: student.name, email: student.email, lastAccess: student.stats.lastAccess };
}

export function toLearningSummary(summary: LearningProgressSummaryDTO): LearningSummary {
  return {
    overall: {
      percentage: summary.percentage,
      completedLessons: summary.completedLessons,
      totalLessons: summary.totalLessons,
      completed: summary.completed,
    },
    sections: summary.sections.map((section) => ({
      sectionId: section.sectionId,
      percentage: section.percentage,
      completedLessons: section.completedLessons,
      totalLessons: section.totalLessons,
      completed: section.completed,
    })),
    levels: summary.levels.map((level) => ({
      levelId: level.levelId,
      sectionId: level.sectionId,
      percentage: level.percentage,
      completedLessons: level.completedLessons,
      totalLessons: level.totalLessons,
      completed: level.completed,
    })),
    modules: summary.modules.map((item) => ({
      moduleId: item.moduleId,
      levelId: item.levelId,
      percentage: item.percentage,
      completedLessons: item.completedLessons,
      totalLessons: item.totalLessons,
      completed: item.completed,
    })),
  };
}

export function toStudentTimeline(timeline: StudentTimelineDTO): StudentTimeline {
  return {
    from: timeline.from,
    to: timeline.to,
    truncated: timeline.truncated,
    entries: timeline.entries.map((entry) => ({
      kind: entry.kind,
      occurredAt: entry.occurredAt,
      endedAt: entry.endedAt,
      referenceId: entry.referenceId,
      status: entry.status,
      title: entry.title,
      value: entry.value,
    })),
  };
}

/** Titles and curriculum order (sections first, then unsectioned levels) of the tree; progress flags are ignored. */
export function toCurriculumTitles(tree: CurriculumTreeDTO): CurriculumTitles {
  const sections = new Map<string, CurriculumEntry>();
  const levels = new Map<string, CurriculumEntry>();
  const modules = new Map<string, CurriculumEntry>();
  const orderedLevels = [
    ...[...tree.sections].sort((a, b) => a.order - b.order).flatMap((section) => {
      sections.set(section.id, { title: section.title, rank: sections.size });

      return [...section.levels].sort((a, b) => a.order - b.order);
    }),
    ...[...tree.unsectionedLevels].sort((a, b) => a.order - b.order),
  ];

  for (const level of orderedLevels) {
    levels.set(level.id, { title: level.title, rank: levels.size });

    for (const item of [...level.modules].sort((a, b) => a.order - b.order)) {
      modules.set(item.id, { title: item.title, rank: modules.size });
    }
  }

  return { sections, levels, modules };
}
