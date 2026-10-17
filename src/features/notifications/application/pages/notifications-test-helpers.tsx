/*
* Funcionalidad: Notifications test helpers
* Descripción: Shared fixtures of the notifications tests: backend URL, envelope with pagination, error response, NotificationDTO builder, a fake socket that dispatches realtime events, and a renderer that wraps the UI in a fresh SWR cache, an authenticated session, the realtime context and the global ToastProvider. Depends on Testing Library, msw, SWR, the design-system toast, the realtime and session contexts and the notifications DTOs. v1.1 (B2 closure): the NotificationDTO builder takes a typed `variant` (type with its data) instead of casting the data.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, render } from "@testing-library/react";
import { HttpResponse } from "msw";
import { useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "@shared/design-system/components/toast-provider";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import type { RealtimeEventMap, RealtimeEventName, RealtimeSocket } from "@shared/realtime/realtime.entity";
import type { Role } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { NotificationDTO, NotificationTypeDTO } from "../../api/dtos/notifications.dto";

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

/** Type and data of one notification variant: the pair stays correlated when spread into a DTO. */
export type NotificationVariant = {
  [T in NotificationTypeDTO]: Pick<Extract<NotificationDTO, { type: T }>, "type" | "data">
}[NotificationTypeDTO];

type NotificationFields = Omit<Extract<NotificationDTO, { type: "GRADE_PUBLISHED" }>, "type" | "data">;

export type NotificationDtoOverrides = Partial<NotificationFields> & { variant?: NotificationVariant };

/** A GRADE_PUBLISHED notification by default; `variant` sets another type with its typed data. */
export function notificationDto(id: string, { variant, ...overrides }: NotificationDtoOverrides = {}): NotificationDTO {
  const pair: NotificationVariant = variant ?? { type: "GRADE_PUBLISHED", data: { evaluationId: "ev-1", attemptId: `at-${id}` } };

  return {
    id,
    title: `Calificación publicada ${id}`,
    body: "Ya puedes consultar tu calificación: 8 de 10 puntos (aprobada).",
    readAt: null,
    createdAt: "2026-10-16T13:00:00.000Z",
    ...overrides,
    ...pair,
  };
}

type Listener = (payload: never) => void;

export type FakeSocket = {
  socket: RealtimeSocket
  dispatch: <E extends RealtimeEventName>(event: E, payload: RealtimeEventMap[E]) => void
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
    emit: () => undefined,
  };

  return {
    socket: socket as unknown as RealtimeSocket,
    dispatch: (event, payload) => {
      act(() => {
        for (const listener of listeners.get(event) ?? []) {
          (listener as (value: typeof payload) => void)(payload);
        }
      });
    },
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

export type NotificationsRenderOptions = {
  role?: Role
  socket?: FakeSocket
};

export function renderNotifications(ui: ReactElement, { role = "STUDENT", socket }: NotificationsRenderOptions = {}) {
  const session = sessionValue(role);

  function Wrapper({ children }: { children: ReactNode }) {
    const realtime = useMemo(() => ({ socket: socket?.socket ?? null, status: socket ? "authenticated" as const : "idle" as const }), []);

    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
        <SessionContext.Provider value={session}>
          <RealtimeContext.Provider value={realtime}>
            <ToastProvider>{children}</ToastProvider>
          </RealtimeContext.Provider>
        </SessionContext.Provider>
      </SWRConfig>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
