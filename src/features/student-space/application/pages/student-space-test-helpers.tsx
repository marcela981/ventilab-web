/*
* Funcionalidad: Student space test helpers
* Descripción: Shared fixtures of the student space tests: backend URL, envelope with pagination, error response, DTO builders (summary, published grade, note, lesson detail, curriculum tree, lesson Page) and a renderer that wraps the UI in a fresh SWR cache, an authenticated STUDENT session and the global ToastProvider. Fixtures are typed against the generated schema; the learning tree and Page shapes are cast because the learning DTO aliases are internal to that feature. Depends on Testing Library, msw, SWR, the design-system toast, the session context and the student space DTOs. v1.1 (B1 closure): the fixtures carry the new contract fields (section titles, grade attemptId and module, note module and titles, session case title).
* Versión: 1.1
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
import type { LessonDetailDTO, MyEvaluationGradeDTO, MySummaryDTO, NoteDTO } from "../../api/dtos/student-space.dto";

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

const progress = (id: string | null, percentage: number, completedLessons: number, totalLessons: number, title: string | null = null) => ({
  id,
  title,
  percentage,
  completedLessons,
  totalLessons,
  completed: percentage >= 100,
});

export function summaryDto(overrides: Partial<MySummaryDTO> = {}): MySummaryDTO {
  return {
    progress: { overall: progress(null, 40, 4, 10), sections: [progress("s1", 75, 3, 4, "Fundamentos"), progress("s2", 17, 1, 6, null)] },
    activeEvaluations: [{
      assignmentId: "as-1",
      evaluationId: "ev-1",
      evaluationTitle: "Parcial de ventilación",
      evaluationType: "EXAM",
      startsAt: "2026-10-15T13:00:00.000Z",
      endsAt: "2026-10-20T13:00:00.000Z",
    }],
    upcomingEvaluations: [{
      assignmentId: "as-2",
      evaluationId: "ev-2",
      evaluationTitle: "Quiz de PEEP",
      evaluationType: "QUIZ",
      startsAt: "2026-10-22T13:00:00.000Z",
      endsAt: null,
    }],
    grades: [
      {
        attemptId: "at-3",
        evaluationId: "ev-3",
        evaluationTitle: "Taller de curvas",
        evaluationType: "WORKSHOP",
        attemptNumber: 1,
        grade: 4.2,
        passed: true,
        publishedAt: "2026-10-14T15:00:00.000Z",
        moduleId: "m1",
        moduleTitle: "Fisiología",
      },
      {
        attemptId: "at-4",
        evaluationId: "ev-4",
        evaluationTitle: "Quiz de volúmenes",
        evaluationType: "QUIZ",
        attemptNumber: 2,
        grade: 2.5,
        passed: false,
        publishedAt: "2026-10-13T15:00:00.000Z",
        moduleId: null,
        moduleTitle: null,
      },
    ],
    latestNotes: [{
      id: "n1",
      lessonId: "l1",
      pageId: null,
      moduleId: "m2",
      lessonTitle: "Presión positiva",
      pageTitle: null,
      excerpt: "La PEEP mantiene los alvéolos abiertos",
      updatedAt: "2026-10-16T12:00:00.000Z",
    }],
    latestConversations: [{ id: "c1", title: "Dudas sobre compliance", scope: "LESSON", refId: "l1", updatedAt: "2026-10-15T14:00:00.000Z" }],
    latestSimulationSessions: [
      { id: "ss-1", caseId: "case-1", caseTitle: "SDRA moderado", mode: "FREE", status: "ENDED", score: 82, startedAt: "2026-10-12T14:00:00.000Z", endedAt: "2026-10-12T14:30:00.000Z" },
      { id: "ss-2", caseId: "case-2", caseTitle: null, mode: "EXAM", status: "ACTIVE", score: null, startedAt: "2026-10-16T13:00:00.000Z", endedAt: null },
    ],
    upcomingReservations: [{ id: "r1", startsAt: "2026-10-17T14:00:00.000Z", endsAt: "2026-10-17T15:00:00.000Z", purpose: "Práctica de PEEP", holderType: "USER", groupId: null }],
    unreadNotifications: 3,
    ...overrides,
  };
}

export function gradeDto(attemptId: string, overrides: Partial<MyEvaluationGradeDTO> = {}): MyEvaluationGradeDTO {
  return {
    attemptId,
    attemptNumber: 1,
    evaluationId: `ev-${attemptId}`,
    evaluationTitle: `Evaluación ${attemptId}`,
    evaluationType: "EXAM",
    grade: 4.5,
    legacy: false,
    maxScore: 10,
    moduleId: null,
    moduleTitle: null,
    passed: true,
    publishedAt: "2026-10-14T15:00:00.000Z",
    score: 9,
    ...overrides,
  };
}

export function textDoc(text: string): NoteDTO["content"] {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

export function noteDto(id: string, lessonId: string, text: string, overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id,
    lessonId,
    pageId: null,
    moduleId: null,
    lessonTitle: null,
    pageTitle: null,
    content: textDoc(text),
    createdAt: "2026-10-15T12:00:00.000Z",
    updatedAt: "2026-10-15T12:00:00.000Z",
    ...overrides,
  };
}

export function lessonDetailDto(id: string, order: number, moduleId: string, moduleTitle: string): LessonDetailDTO {
  return {
    id,
    title: `Lección ${id}`,
    order,
    moduleId,
    module: { id: moduleId, title: moduleTitle, order: 1, difficulty: null, isActive: true, levelId: "lv1" },
  } as unknown as LessonDetailDTO;
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
  status: "PUBLISHED",
});

const treeLevel = (id: string, order: number, sectionId: string | null, modules: ReturnType<typeof treeModule>[]) => ({
  id,
  title: `Nivel ${id}`,
  description: null,
  order,
  sectionId,
  locked: false,
  completed: false,
  missingPrerequisites: [],
  modules,
  status: "PUBLISHED",
  track: "default",
});

// s1 "Fundamentos": m1 "Fisiología" then m2 "Modos ventilatorios"; s2 "Avanzado": m3 "Destete".
export function treeDto() {
  return {
    sections: [
      { id: "s1", title: "Fundamentos", description: null, order: 1, slug: "s1", status: "PUBLISHED", levels: [treeLevel("lv1", 1, "s1", [treeModule("m1", 1, "Fisiología"), treeModule("m2", 2, "Modos ventilatorios")])] },
      { id: "s2", title: "Avanzado", description: null, order: 2, slug: "s2", status: "PUBLISHED", levels: [treeLevel("lv2", 1, "s2", [treeModule("m3", 1, "Destete")])] },
    ],
    unsectionedLevels: [],
  };
}

export function pageSummaryDto(id: string, order: number, lessonId: string) {
  return {
    id,
    title: `Página ${id}`,
    order,
    difficulty: "BEGINNER",
    estimatedMinutes: null,
    hasRequiredQuiz: false,
    learningObjectives: [],
    legacyJsonId: null,
    legacyLessonId: null,
    lessonId,
    slug: id,
    status: "PUBLISHED",
    type: "LESSON",
  };
}

function sessionValue(role: Role): SessionContextValue {
  const user = { id: `${role.toLowerCase()}-1`, email: "user@ventylab.demo", name: "Usuario", image: null, role };

  return {
    status: "authenticated",
    user,
    role,
    permissions: [],
    error: null,
    hasRole: (...roles) => roles.includes(role),
    hasPermission: () => false,
    establishSession: () => Promise.resolve(user),
    signOut: () => Promise.resolve(),
    reloadSession: () => Promise.resolve(user),
    handleRoleChanged: () => Promise.resolve(false),
  };
}

export function renderStudentSpace(ui: ReactElement, role: Role = "STUDENT") {
  const session = sessionValue(role);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
        <SessionContext.Provider value={session}>
          <ToastProvider>{children}</ToastProvider>
        </SessionContext.Provider>
      </SWRConfig>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
