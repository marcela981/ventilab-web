/*
* Funcionalidad: Evaluation authoring test helpers
* Descripción: Shared fixtures of the evaluation authoring tests: backend envelope (with optional pagination) and error bodies, a factory of EvaluationSummaryDTO and a render helper that mounts a page inside an isolated SWR cache and the global ToastProvider (as pages/_app.js does). Test-only code. Depends on Testing Library, msw, SWR, the design-system toast provider and the authoring DTOs. v1.1 (A2): factories of the builder detail (EvaluationDetailDTO, questions, options, scenarios) and a Tiptap paragraph document.
* Versión: 1.1
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
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { Role } from "@shared/session/session.entity";
import type {
  EvaluationDetailDTO,
  EvaluationOptionDTO,
  EvaluationQuestionDTO,
  EvaluationScenarioDTO,
  EvaluationSummaryDTO,
} from "../../api/dtos/evaluation-authoring.dto";

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

export function evaluationSummaryDto(id: string, overrides: Partial<EvaluationSummaryDTO> = {}): EvaluationSummaryDTO {
  return {
    id,
    type: "QUIZ",
    title: `Evaluación ${id}`,
    status: "DRAFT",
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
    assignmentCount: 0,
    canManage: true,
    createdAt: "2026-10-01T15:00:00.000Z",
    updatedAt: "2026-10-02T15:30:00.000Z",
    ...overrides,
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

export function renderWithProviders(ui: ReactElement, role: Role = "TEACHER") {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <SessionContext.Provider value={sessionValue(role)}>
        <ToastProvider>{ui}</ToastProvider>
      </SessionContext.Provider>
    </SWRConfig>,
  );
}

export const paragraphDoc = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

export function optionDto(id: string, order: number, overrides: Partial<EvaluationOptionDTO> = {}): EvaluationOptionDTO {
  return { id, order, content: `Opción ${id}`, isCorrect: false, mediaId: null, media: null, feedback: null, ...overrides };
}

export function questionDto(id: string, order: number, overrides: Partial<EvaluationQuestionDTO> = {}): EvaluationQuestionDTO {
  return {
    id,
    scenarioId: null,
    order,
    type: "OPEN_TEXT",
    prompt: paragraphDoc(`Enunciado ${id}`),
    mediaIds: [],
    media: [],
    points: 1,
    explanation: null,
    clinicalCaseId: null,
    rubric: null,
    options: [],
    ...overrides,
  };
}

export function scenarioDto(id: string, order: number, overrides: Partial<EvaluationScenarioDTO> = {}): EvaluationScenarioDTO {
  return { id, order, content: paragraphDoc(`Escenario ${id}`), mediaIds: [], media: [], ...overrides };
}

export function evaluationDetailDto(id: string, overrides: Partial<EvaluationDetailDTO> = {}): EvaluationDetailDTO {
  return {
    id,
    type: "EXAM",
    title: "Parcial de ventilación",
    description: null,
    status: "DRAFT",
    moduleId: null,
    levelId: null,
    lessonId: null,
    durationMinutes: 45,
    maxAttempts: 1,
    shuffleQuestions: false,
    showResultsImmediately: false,
    order: 0,
    createdById: "teacher-1",
    legacySource: null,
    legacyType: null,
    scenarios: [],
    questions: [],
    usage: { attempts: 0, submittedAttempts: 0, assignments: 0 },
    structureLocked: false,
    readinessIssues: [],
    canManage: true,
    createdAt: "2026-10-01T15:00:00.000Z",
    updatedAt: "2026-10-02T15:30:00.000Z",
    ...overrides,
  };
}
