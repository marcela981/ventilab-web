/*
* Funcionalidad: Grading test helpers
* Descripción: Shared fixtures of the grading tests: backend envelope (with optional pagination) and error bodies, factories of GradingQueueItemDTO, EvaluationSummaryDTO and GroupDTO, and a render helper that mounts a tree inside an isolated SWR cache. Test-only code. Depends on Testing Library, msw, SWR and the grading DTOs. v1.1 (G2): factories of the grading attempt (questions, options, answers, practical score) and the staff feedback DTOs, a fake socket that lets a test emit server events, and renderGradingPage, which mounts a page with an isolated SWR cache, a TEACHER session, the realtime context with the fake socket and the global ToastProvider. v1.2 (B3.10): the unused createFakeSocket factory is removed (no grading test emits server events); renderGradingPage keeps the optional FakeSocket shape.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render } from "@testing-library/react";
import { HttpResponse } from "msw";
import type { ReactElement } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "@shared/design-system/components/toast-provider";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import type { RealtimeEventMap, RealtimeEventName, RealtimeSocket } from "@shared/realtime/realtime.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type {
  EvaluationSummaryDTO,
  GradeFeedbackDTO,
  GradeFeedbackItemDTO,
  GradingAnswerDTO,
  GradingAttemptDTO,
  GradingOptionDTO,
  GradingQuestionDTO,
  GradingQueueItemDTO,
  GroupDTO,
} from "../../api/dtos/grading.dto";

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

export function queueItemDto(attemptId: string, overrides: Partial<GradingQueueItemDTO> = {}): GradingQueueItemDTO {
  return {
    attemptId,
    assignmentId: "as-1",
    attemptNumber: 1,
    evaluationId: "ev-1",
    evaluationTitle: "Parcial de ventilación",
    evaluationType: "EXAM",
    legacy: false,
    maxScore: 10,
    score: 6,
    status: "PENDING_REVIEW",
    student: { id: `st-${attemptId}`, name: "Ana Gómez", email: "ana@ventylab.demo" },
    submittedAt: "2026-10-11T11:00:00.000Z",
    ...overrides,
  };
}

export function evaluationSummaryDto(id: string, title: string): EvaluationSummaryDTO {
  return {
    id,
    type: "QUIZ",
    title,
    status: "READY",
    moduleId: null,
    levelId: null,
    lessonId: null,
    durationMinutes: 30,
    maxAttempts: 1,
    showResultsImmediately: true,
    createdById: "teacher-1",
    createdByName: "Laura Gómez",
    legacySource: null,
    questionCount: 5,
    scenarioCount: 0,
    assignmentCount: 1,
    canManage: true,
    createdAt: "2026-10-01T15:00:00.000Z",
    updatedAt: "2026-10-02T15:30:00.000Z",
  };
}

export function groupDto(id: string, name: string, overrides: Partial<GroupDTO> = {}): GroupDTO {
  return {
    id,
    name,
    type: "STUDENT",
    isActive: true,
    membersCount: 12,
    ...overrides,
  } as GroupDTO;
}

export function renderWithSwr(ui: ReactElement) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{ui}</SWRConfig>,
  );
}

const paragraphDoc = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

export function gradingOptionDto(id: string, order: number, overrides: Partial<GradingOptionDTO> = {}): GradingOptionDTO {
  return { id, order, content: `Opción ${id}`, isCorrect: false, mediaId: null, media: null, feedback: null, ...overrides };
}

export function gradingQuestionDto(id: string, order: number, overrides: Partial<GradingQuestionDTO> = {}): GradingQuestionDTO {
  return {
    id,
    scenarioId: null,
    order,
    type: "OPEN_TEXT",
    prompt: paragraphDoc(`Enunciado ${id}`),
    mediaIds: [],
    media: [],
    points: 2,
    explanation: null,
    clinicalCaseId: null,
    rubric: null,
    options: [],
    ...overrides,
  } as GradingQuestionDTO;
}

export function gradingAnswerDto(questionId: string, overrides: Partial<GradingAnswerDTO> = {}): GradingAnswerDTO {
  return {
    answerId: `ans-${questionId}`,
    questionId,
    selectedOptionIds: [],
    textAnswer: null,
    simulationSessionId: null,
    autoScore: null,
    manualScore: null,
    earnedScore: null,
    pending: false,
    gradedById: null,
    teacherComment: null,
    practicalScore: null,
    ...overrides,
  };
}

export function gradingAttemptDto(id: string, overrides: Partial<GradingAttemptDTO> = {}): GradingAttemptDTO {
  return {
    id,
    assignmentId: "as-1",
    attemptNumber: 2,
    evaluationId: "ev-1",
    evaluationTitle: "Parcial de ventilación",
    evaluationType: "EXAM",
    userId: "st-1",
    legacy: false,
    status: "PENDING_REVIEW",
    startedAt: "2026-10-11T10:00:00.000Z",
    submittedAt: "2026-10-11T11:00:00.000Z",
    score: null,
    maxScore: 4,
    grade: null,
    passed: null,
    passingGrade: 3,
    gradePublishedAt: null,
    showResultsImmediately: false,
    questions: [],
    scenarios: [],
    answers: [],
    ...overrides,
  };
}

export function feedbackItemDto(id: string, overrides: Partial<GradeFeedbackItemDTO> = {}): GradeFeedbackItemDTO {
  return {
    id,
    questionId: null,
    status: "READY",
    source: "LLM",
    content: "Buen manejo de la PEEP.",
    provider: "gemini",
    model: "gemini-2.0-flash",
    updatedAt: "2026-10-12T15:00:00.000Z",
    ...overrides,
  };
}

export function feedbackDto(attemptId: string, overrides: Partial<GradeFeedbackDTO> = {}): GradeFeedbackDTO {
  return { attemptId, overall: null, questions: [], ...overrides };
}

export type FakeSocket = {
  socket: RealtimeSocket
  emit: <E extends RealtimeEventName>(event: E, payload: RealtimeEventMap[E]) => void
};

function teacherSession(): SessionContextValue {
  const user = { id: "teacher-1", email: "laura@ventylab.demo", name: "Laura", image: null, role: "TEACHER" as const };

  return {
    status: "authenticated",
    user,
    role: "TEACHER",
    permissions: [],
    error: null,
    hasRole: (...roles) => roles.includes("TEACHER"),
    hasPermission: () => false,
    establishSession: () => Promise.resolve(user),
    signOut: () => Promise.resolve(),
    reloadSession: () => Promise.resolve(user),
    handleRoleChanged: () => Promise.resolve(false),
  };
}

export function renderGradingPage(ui: ReactElement, socket: FakeSocket | null = null) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <SessionContext.Provider value={teacherSession()}>
        <RealtimeContext.Provider value={{ socket: socket?.socket ?? null, status: socket ? "authenticated" : "idle" }}>
          <ToastProvider>{ui}</ToastProvider>
        </RealtimeContext.Provider>
      </SessionContext.Provider>
    </SWRConfig>,
  );
}
