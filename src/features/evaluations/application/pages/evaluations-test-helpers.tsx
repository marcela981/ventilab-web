/*
* Funcionalidad: Evaluations test helpers
* Descripción: Shared fixtures of the evaluations tests: backend envelope and error bodies, factories of MyEvaluationDTO and MyEvaluationAttemptDTO, a fake socket that records listeners and lets a test emit server events, and a render helper that mounts a page inside an isolated SWR cache, a session context with the given role and a realtime context with the fake socket (no AuthProvider, no network for the session or the socket). Test-only code. Depends on Testing Library, msw, SWR, the session and realtime contexts and the evaluations DTOs. v1.1 (E2): the render helper also mounts the global ToastProvider (as pages/_app.js does), plus factories of the student attempt detail, question, option and scenario DTOs (without isCorrect, explanation, rubric or earnedScore, as the backend sends them before publication).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, render } from "@testing-library/react";
import { HttpResponse } from "msw";
import type { ReactElement, ReactNode } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "@shared/design-system/components/toast-provider";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import type { RealtimeEventMap, RealtimeEventName, RealtimeSocket } from "@shared/realtime/realtime.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { Role } from "@shared/session/session.entity";
import type {
  MyEvaluationAttemptDTO,
  MyEvaluationDTO,
  StudentAttemptDetailDTO,
  StudentOptionDTO,
  StudentQuestionDTO,
  StudentScenarioDTO,
} from "../../api/dtos/evaluations.dto";

export const apiUrl = (path: string): string => `${BACKEND_ORIGIN}${path}`;

export const envelope = (data: unknown) => ({
  success: true,
  message: null,
  data,
  code: null,
  timestamp: "",
  traceId: "t",
  pagination: null,
});

export const errorResponse = (code: string, status: number) => HttpResponse.json(
  { success: false, message: code, data: null, code, timestamp: "", traceId: "t", pagination: null },
  { status },
);

export function attemptDto(id: string, attemptNumber: number, overrides: Partial<MyEvaluationAttemptDTO> = {}): MyEvaluationAttemptDTO {
  return {
    id,
    attemptNumber,
    status: "SUBMITTED",
    startedAt: "2026-10-14T14:00:00.000Z",
    submittedAt: "2026-10-14T14:20:00.000Z",
    deadlineAt: "2026-10-14T14:30:00.000Z",
    published: false,
    ...overrides,
  };
}

export function myEvaluationDto(
  assignmentId: string,
  evaluationId: string,
  overrides: Partial<Omit<MyEvaluationDTO, "evaluation">> & { evaluation?: Partial<NonNullable<MyEvaluationDTO["evaluation"]>> | null } = {},
): MyEvaluationDTO {
  const { evaluation, ...rest } = overrides;

  return {
    assignmentId,
    state: "ACTIVE",
    startsAt: "2026-10-14T13:00:00.000Z",
    endsAt: "2026-10-20T23:00:00.000Z",
    attempts: [],
    canStart: true,
    ...rest,
    evaluation: evaluation === null ? null : {
      id: evaluationId,
      title: `Evaluación ${evaluationId}`,
      type: "QUIZ",
      description: null,
      durationMinutes: 30,
      maxAttempts: 2,
      questionCount: 5,
      ...evaluation,
    },
  };
}

// Backend payloads type rich text as an empty object; tests send plain strings or Tiptap documents.
const richText = (value: unknown) => value as Record<string, never>;

export function optionDto(id: string, order: number, content: string, overrides: Partial<StudentOptionDTO> = {}): StudentOptionDTO {
  return { id, order, content, media: null, ...overrides };
}

export function questionDto(
  id: string,
  position: number,
  type: StudentQuestionDTO["type"],
  overrides: Partial<Omit<StudentQuestionDTO, "prompt">> & { prompt?: unknown } = {},
): StudentQuestionDTO {
  const { prompt, ...rest } = overrides;

  return {
    id,
    position,
    type,
    scenarioId: null,
    prompt: richText(prompt ?? `Enunciado ${id}`),
    media: [],
    points: 1,
    clinicalCaseId: null,
    options: [],
    answer: null,
    ...rest,
  };
}

export function scenarioDto(id: string, order: number, content: unknown): StudentScenarioDTO {
  return { id, order, content: richText(content), media: [] };
}

export function attemptDetailDto(id: string, overrides: Partial<StudentAttemptDetailDTO> = {}): StudentAttemptDetailDTO {
  return {
    id,
    assignmentId: "as1",
    attemptNumber: 1,
    status: "IN_PROGRESS",
    startedAt: "2026-10-14T15:00:00.000Z",
    submittedAt: null,
    deadlineAt: null,
    serverNow: "2026-10-14T15:00:00.000Z",
    published: false,
    evaluation: { id: "e1", title: "Quiz de PEEP", type: "QUIZ", description: null },
    scenarios: [],
    questions: [],
    ...overrides,
  };
}

type Listener = (payload: never) => void;

export type FakeSocket = {
  socket: RealtimeSocket
  emit: <E extends RealtimeEventName>(event: E, payload: RealtimeEventMap[E]) => void
  listenerCount: (event: RealtimeEventName) => number
};

export function createFakeSocket(): FakeSocket {
  const listeners = new Map<string, Set<Listener>>();
  const socket = {
    on: (event: string, listener: Listener) => {
      const set = listeners.get(event) ?? new Set<Listener>();

      set.add(listener);
      listeners.set(event, set);
    },
    off: (event: string, listener: Listener) => {
      listeners.get(event)?.delete(listener);
    },
  };

  return {
    socket: socket as unknown as RealtimeSocket,
    emit: (event, payload) => {
      act(() => {
        for (const listener of listeners.get(event) ?? []) {
          (listener as (value: typeof payload) => void)(payload);
        }
      });
    },
    listenerCount: (event) => listeners.get(event)?.size ?? 0,
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

type WrapperProps = { role: Role, socket: RealtimeSocket | null, children: ReactNode };

function Wrapper({ role, socket, children }: WrapperProps) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <SessionContext.Provider value={sessionValue(role)}>
        <RealtimeContext.Provider value={{ socket, status: socket ? "authenticated" : "idle" }}>
          <ToastProvider>{children}</ToastProvider>
        </RealtimeContext.Provider>
      </SessionContext.Provider>
    </SWRConfig>
  );
}

export function renderWithSession(ui: ReactElement, options: { role?: Role, socket?: FakeSocket } = {}) {
  return render(<Wrapper role={options.role ?? "STUDENT"} socket={options.socket?.socket ?? null}>{ui}</Wrapper>);
}
