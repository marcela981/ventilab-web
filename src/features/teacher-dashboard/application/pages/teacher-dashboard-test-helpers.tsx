/*
* Funcionalidad: Teacher dashboard test helpers
* Descripción: Shared fixtures of the teacher dashboard tests: backend URL, envelope with pagination, error response, DTO builders typed against the generated schema (group, dashboard row, evaluation stats, timeline entry, assignment, grading queue item, reservation, student, progress summary, curriculum tree) and a renderer that wraps the UI in a fresh SWR cache, an authenticated TEACHER session and the global ToastProvider. v1.1 (O3 review): the test SWR config keeps previous data like the app (API_SWR_CONFIG), so group switches are tested under the real default. v1.2 (closure B1): fixtures carry the new contract fields (progress item titles, row risk fields and last activity, stats groupId). Depends on Testing Library, msw, SWR, the design-system toast, the session context and the teacher dashboard DTOs.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render } from "@testing-library/react";
import { HttpResponse } from "msw";
import type { ReactElement, ReactNode } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "@shared/design-system/components/toast-provider";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import type { Role } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type {
  CurriculumTreeDTO,
  EvaluationAnalyticsDTO,
  EvaluationAssignmentDTO,
  GradingQueueItemDTO,
  GroupDashboardDTO,
  GroupDTO,
  LearningProgressSummaryDTO,
  ReservationDetailDTO,
  StudentDashboardRowDTO,
  StudentDTO,
  TimelineEntryDTO,
} from "../../api/dtos/teacher-dashboard.dto";

export const apiUrl = (path: string): string => `${BACKEND_ORIGIN}${path}`;

export type TestPagination = { total: number, pages: number, page: number, limit: number };

export const envelope = (data: unknown, pagination: TestPagination | null = null) => ({
  success: true,
  message: null,
  data,
  code: null,
  timestamp: "",
  traceId: "t",
  pagination: pagination ? { ...pagination, next: null, previous: null } : null,
});

export const errorResponse = (code: string, status: number) => HttpResponse.json(
  { success: false, message: code, data: null, code, timestamp: "", traceId: "t", pagination: null },
  { status },
);

export function groupDto(id: string, name: string, overrides: Partial<GroupDTO> = {}): GroupDTO {
  return {
    academicYear: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: "teacher-1",
    creator: null,
    depth: 0,
    description: null,
    enrollmentCode: null,
    id,
    isActive: true,
    leader: null,
    maxStudents: null,
    membersCount: 2,
    name,
    parentGroup: null,
    parentGroupId: null,
    semester: null,
    simulatorLeaderId: null,
    subGroups: [],
    subGroupsCount: 0,
    type: "STUDENT",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const item = (id: string | null, percentage: number, completedLessons = 1, totalLessons = 4) => ({
  id,
  percentage,
  completedLessons,
  totalLessons,
  completed: percentage >= 100,
  title: id ? `Título ${id}` : null,
});

export function rowDto(userId: string, name: string | null, overrides: Partial<StudentDashboardRowDTO> = {}): StudentDashboardRowDTO {
  return {
    userId,
    name,
    email: `${userId}@ventylab.demo`,
    progress: {
      overall: item(null, 40),
      sections: [item("s1", 60)],
      levels: [item("lv1", 60)],
      modules: [item("m1", 80), item("m2", 20)],
    },
    grades: { averageGrade: 4.1, evaluations: [{ evaluationId: "ev-1", evaluationTitle: "Parcial de PEEP", attemptNumber: 1, grade: 4.1, passed: true, publishedAt: "2026-10-10T15:00:00.000Z" }] },
    simulation: { sessionCount: 3, averageScore: 81.5, averageTimeToStabilizeSeconds: 42.3 },
    aiUsage: [{ useCase: "FREE_CHAT", calls: 7, helpfulPercentage: 66.7, inputTokens: 100, outputTokens: 200, ratings: 3 }],
    ventilatorHours: 1.5,
    atRisk: false,
    riskReasons: [],
    failedEvaluationIds: [],
    lastActivityAt: "2026-10-15T20:00:00.000Z",
    ...overrides,
  };
}

export function dashboardDto(students: StudentDashboardRowDTO[], overrides: Partial<GroupDashboardDTO> = {}): GroupDashboardDTO {
  return {
    generatedAt: "2026-10-16T12:00:00.000Z",
    groupId: "g1",
    groupName: "Grupo A",
    moduleSummary: [],
    passingGrade: 3,
    riskThresholds: { maxFailedEvaluations: 0, minProgressPct: 0, inactivityDays: 0 },
    students,
    ...overrides,
  };
}

export function statsDto(evaluationId: string, overrides: Partial<EvaluationAnalyticsDTO> = {}): EvaluationAnalyticsDTO {
  return {
    averageGrade: 3.6,
    evaluationId,
    gradedCount: 5,
    groupId: null,
    histogram: [{ from: 2.5, to: 3, count: 1 }, { from: 3, to: 3.5, count: 2 }, { from: 4, to: 4.5, count: 2 }],
    maxGrade: 4.4,
    medianGrade: 3.4,
    minGrade: 2.6,
    passRate: 0.8,
    passingGrade: 3,
    publishedCount: 5,
    questions: [],
    title: `Evaluación ${evaluationId}`,
    totalAttempts: 6,
    type: "EXAM",
    ...overrides,
  };
}

export function assignmentDto(id: string, title: string): EvaluationAssignmentDTO {
  return {
    assignedById: "teacher-1",
    attemptCounts: { graded: 1, inProgress: 2, pendingReview: 3, submitted: 0 },
    createdAt: "2026-10-01T00:00:00.000Z",
    endsAt: "2026-10-20T00:00:00.000Z",
    evaluationId: `ev-${id}`,
    evaluationStatus: "READY",
    evaluationTitle: title,
    evaluationType: "EXAM",
    groupId: "g1",
    groupName: "Grupo A",
    id,
    legacyIsActive: null,
    startsAt: "2026-10-10T00:00:00.000Z",
    state: "ACTIVE",
    updatedAt: "2026-10-10T00:00:00.000Z",
  };
}

export function queueItemDto(attemptId: string, studentId: string, title: string): GradingQueueItemDTO {
  return {
    assignmentId: "as-1",
    attemptId,
    attemptNumber: 1,
    evaluationId: "ev-2",
    evaluationTitle: title,
    evaluationType: "WORKSHOP",
    legacy: false,
    maxScore: 10,
    score: null,
    status: "PENDING_REVIEW",
    student: { id: studentId, name: null, email: `${studentId}@ventylab.demo` },
    submittedAt: "2026-10-15T12:00:00.000Z",
  };
}

export function reservationDto(id: string, groupId: string | null, purpose: string, status = "SCHEDULED"): ReservationDetailDTO {
  return {
    createdBy: null,
    endsAt: "2026-10-18T15:00:00.000Z",
    group: groupId ? { id: groupId, name: `Grupo ${groupId}` } : null,
    holder: null,
    holderRole: "STUDENT",
    holderType: groupId ? "GROUP" : "USER",
    id,
    purpose,
    startsAt: "2026-10-18T14:00:00.000Z",
    status,
    visibility: "PUBLIC",
  };
}

export function studentDto(id: string, name: string): StudentDTO {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    email: `${id}@ventylab.demo`,
    id,
    image: null,
    name,
    role: "STUDENT",
    stats: { completedLessons: 4, lastAccess: "2026-10-15T20:00:00.000Z", progressPercentage: 40, totalLessons: 10, totalTimeSpent: 120 },
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

export function summaryDto(): LearningProgressSummaryDTO {
  return {
    completed: false,
    completedLessons: 4,
    percentage: 40,
    totalLessons: 10,
    sections: [{ sectionId: "s1", percentage: 60, completedLessons: 3, totalLessons: 5, completed: false, completedLevels: 0, totalLevels: 1 }],
    levels: [{ levelId: "lv1", sectionId: "s1", percentage: 60, completedLessons: 3, totalLessons: 5, completed: false, completedModules: 1, totalModules: 2 }],
    modules: [
      { moduleId: "m2", levelId: "lv1", percentage: 20, completedLessons: 1, totalLessons: 2, completed: false },
      { moduleId: "m1", levelId: "lv1", percentage: 100, completedLessons: 2, totalLessons: 2, completed: true },
    ],
  };
}

export function timelineEntryDto(kind: TimelineEntryDTO["kind"], referenceId: string, overrides: Partial<TimelineEntryDTO> = {}): TimelineEntryDTO {
  return {
    endedAt: null,
    kind,
    occurredAt: "2026-10-14T15:00:00.000Z",
    referenceId,
    status: null,
    title: null,
    value: null,
    ...overrides,
  };
}

const treeModule = (id: string, order: number, title: string) => ({
  id,
  title,
  description: null,
  order,
  lessonCount: 2,
  locked: false,
  completed: false,
  missingPrerequisites: [],
  status: "PUBLISHED" as const,
});

// s1 "Fundamentos" → lv1 "Nivel básico" → m1 "Fisiología", m2 "Modos ventilatorios".
export function treeDto(): CurriculumTreeDTO {
  return {
    sections: [{
      id: "s1",
      title: "Fundamentos",
      order: 1,
      levels: [{ id: "lv1", title: "Nivel básico", order: 1, sectionId: "s1", modules: [treeModule("m1", 1, "Fisiología"), treeModule("m2", 2, "Modos ventilatorios")] }],
    }],
    unsectionedLevels: [],
  } as unknown as CurriculumTreeDTO;
}

function sessionValue(role: Role): SessionContextValue {
  const user = { id: `${role.toLowerCase()}-1`, email: "teacher@ventylab.demo", name: "Docente", image: null, role };

  return {
    status: "authenticated",
    user,
    role,
    permissions: [],
    error: null,
    hasRole: (...roles) => roles.includes(role),
    hasPermission: () => true,
    establishSession: () => Promise.resolve(user),
    signOut: () => Promise.resolve(),
    reloadSession: () => Promise.resolve(user),
    handleRoleChanged: () => Promise.resolve(false),
  };
}

export function renderTeacherDashboard(ui: ReactElement, role: Role = "TEACHER") {
  const session = sessionValue(role);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false, keepPreviousData: true }}>
        <SessionContext.Provider value={session}>
          <ToastProvider>{children}</ToastProvider>
        </SessionContext.Provider>
      </SWRConfig>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
