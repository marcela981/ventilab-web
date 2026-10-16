/*
* Funcionalidad: Ventilator lab test helpers
* Descripción: Shared fixtures of the ventilator lab tests: backend URL and envelopes, reservation DTO builders (full and limited projections), a platform setting builder, a fake socket that records emitted messages and dispatches server events inside act, and a render wrapper with an isolated SWR cache, a session of the given role and permissions and the realtime context. Test-only module; depends on Testing Library, msw, SWR and the session and realtime contexts.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, render, renderHook } from "@testing-library/react";
import { HttpResponse } from "msw";
import type { ReactElement, ReactNode } from "react";
import { SWRConfig } from "swr";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import type { RealtimeEventMap, RealtimeEventName, RealtimeSocket, RealtimeStatus } from "@shared/realtime/realtime.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { Permission, Role } from "@shared/session/session.entity";
import type { PlatformSettingDTO, ReservationDetailDTO, ReservationSummaryDTO } from "../../api/dtos/lab.dto";

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

export function detailDto(id: string, overrides: Partial<ReservationDetailDTO> = {}): ReservationDetailDTO {
  return {
    visibility: "full",
    id,
    holderType: "USER",
    startsAt: "2026-10-16T14:00:00.000Z",
    endsAt: "2026-10-16T15:00:00.000Z",
    status: "SCHEDULED",
    purpose: null,
    holderRole: "STUDENT",
    holder: { id: "u1", name: "Ana Gómez", identifier: "ana@ventylab.demo", role: "STUDENT" },
    group: null,
    createdBy: null,
    preemptedReason: null,
    ...overrides,
  };
}

export function summaryDto(id: string, labelKey: string, label: string): ReservationSummaryDTO {
  return {
    visibility: "limited",
    id,
    startsAt: "2026-10-16T16:00:00.000Z",
    endsAt: "2026-10-16T17:00:00.000Z",
    status: "SCHEDULED",
    label,
    labelKey,
  };
}

export function settingDto(key: string, value: unknown): PlatformSettingDTO {
  return {
    key,
    category: "reservations",
    description: key,
    value: value as number,
    defaultValue: value as number,
    origin: "OVERRIDE",
    limits: {},
    version: 1,
    updatedAt: null,
    updatedById: null,
  };
}

type Listener = (payload: never) => void;

export type FakeSocket = {
  socket: RealtimeSocket
  emitted: string[]
  dispatch: <E extends RealtimeEventName>(event: E, payload: RealtimeEventMap[E]) => void
  listenerCount: (event: RealtimeEventName) => number
};

export function createFakeSocket(): FakeSocket {
  const listeners = new Map<string, Set<Listener>>();
  const emitted: string[] = [];
  const socket = {
    on: (event: string, listener: Listener) => {
      const set = listeners.get(event) ?? new Set<Listener>();

      set.add(listener);
      listeners.set(event, set);
    },
    off: (event: string, listener: Listener) => {
      listeners.get(event)?.delete(listener);
    },
    emit: (event: string) => {
      emitted.push(event);
    },
  };

  return {
    socket: socket as unknown as RealtimeSocket,
    emitted,
    dispatch: (event, payload) => {
      act(() => {
        for (const listener of listeners.get(event) ?? []) {
          (listener as (value: typeof payload) => void)(payload);
        }
      });
    },
    listenerCount: (event) => listeners.get(event)?.size ?? 0,
  };
}

export type LabRenderOptions = {
  role?: Role
  permissions?: readonly Permission[]
  socket?: FakeSocket
  realtimeStatus?: RealtimeStatus
};

function sessionValue(role: Role, permissions: readonly Permission[]): SessionContextValue {
  const user = { id: `${role.toLowerCase()}-1`, email: "user@ventylab.demo", name: "Usuario", image: null, role };

  return {
    status: "authenticated",
    user,
    role,
    permissions,
    error: null,
    hasRole: (...roles) => roles.includes(role),
    hasPermission: (permission) => permissions.includes(permission),
    establishSession: () => Promise.resolve(user),
    signOut: () => Promise.resolve(),
    reloadSession: () => Promise.resolve(user),
    handleRoleChanged: () => Promise.resolve(false),
  };
}

function createWrapper({ role = "STUDENT", permissions = [], socket, realtimeStatus }: LabRenderOptions) {
  const session = sessionValue(role, permissions);
  const realtime = {
    socket: socket?.socket ?? null,
    status: realtimeStatus ?? (socket ? "authenticated" as const : "idle" as const),
  };

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
        <SessionContext.Provider value={session}>
          <RealtimeContext.Provider value={realtime}>{children}</RealtimeContext.Provider>
        </SessionContext.Provider>
      </SWRConfig>
    );
  };
}

export function renderLab(ui: ReactElement, options: LabRenderOptions = {}) {
  return render(ui, { wrapper: createWrapper(options) });
}

export function renderLabHook<T>(hook: () => T, options: LabRenderOptions = {}) {
  return renderHook(hook, { wrapper: createWrapper(options) });
}
