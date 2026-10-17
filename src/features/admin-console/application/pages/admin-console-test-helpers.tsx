/*
* Funcionalidad: Admin console test helpers
* Descripción: Shared fixtures of the admin console tests: backend URL, envelope with pagination, error response with details, DTO builders typed against the generated schema (user, group, platform setting, system status with AI providers) and a renderer that wraps the UI in a fresh SWR cache, an authenticated ADMIN session (id admin-1) and the global ToastProvider. v1.1 (O4b): renderAdminConsole takes the session role (ADMIN by default, id admin-1), an optional fake socket (createFakeSocket, provided through RealtimeContext) and keepPreviousData to mirror the app SWR default. Depends on Testing Library, msw, SWR, the design-system toast, the session context and the admin console DTOs.
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
import type { Role } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { GroupDTO, PlatformSettingDTO, SystemStatusDTO, UserDTO } from "../../api/dtos/admin-console.dto";

export const SESSION_USER_ID = "admin-1";

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

export const errorResponse = (code: string, status: number, data: unknown = null) => HttpResponse.json(
  { success: false, message: code, data, code, timestamp: "", traceId: "t", pagination: null },
  { status },
);

export function userDto(id: string, name: string | null, overrides: Partial<UserDTO> = {}): UserDTO {
  return {
    createdAt: "2026-01-15T10:30:00.000Z",
    email: `${id}@ventylab.demo`,
    emailVerified: null,
    id,
    image: null,
    isActive: true,
    name,
    role: "STUDENT",
    updatedAt: "2026-01-15T10:30:00.000Z",
    ...overrides,
  };
}

export function groupDto(id: string, name: string, type: GroupDTO["type"] = "STUDENT"): GroupDTO {
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
    type,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

export function settingDto(key: string, category: PlatformSettingDTO["category"], value: unknown, overrides: Partial<Omit<PlatformSettingDTO, "value">> = {}): PlatformSettingDTO {
  return {
    category,
    defaultValue: value as PlatformSettingDTO["defaultValue"],
    description: `Description of ${key}`,
    key,
    limits: {},
    origin: "DEFAULT",
    updatedAt: null,
    updatedById: null,
    value: value as PlatformSettingDTO["value"],
    version: 0,
    ...overrides,
  } as PlatformSettingDTO;
}

export function statusDto(providers: { provider: string, configured: boolean }[]): SystemStatusDTO {
  return {
    checkedAt: "2026-10-16T12:00:00.000Z",
    state: "OK",
    components: {
      aiProviders: {
        state: "up",
        windowMinutes: 15,
        providers: providers.map(({ provider, configured }) => ({
          provider,
          configured,
          available: configured,
          breaker: "closed",
          calls: null,
          errorRate: null,
          lastErrorAt: null,
          lastErrorCode: null,
          lastSuccessAt: null,
          latencyP95Ms: null,
        })),
      },
    },
  } as unknown as SystemStatusDTO;
}

function sessionValue(role: Role): SessionContextValue {
  const id = role === "ADMIN" ? SESSION_USER_ID : `${role.toLowerCase()}-1`;
  const user = { id, email: `${role.toLowerCase()}@ventylab.demo`, name: "Usuaria", image: null, role };

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

type Listener = (payload: never) => void;

export type FakeSocket = {
  socket: RealtimeSocket
  dispatch: <E extends RealtimeEventName>(event: E, payload: RealtimeEventMap[E]) => void
};

/** In-memory socket: `dispatch` delivers a server event to the listeners registered through useSocketEvent. */
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

export type AdminConsoleRenderOptions = {
  role?: Role
  socket?: FakeSocket
  // Mirrors the app SWR default (API_SWR_CONFIG keeps previous data) for the pages that must opt out of it.
  keepPreviousData?: boolean
};

export function renderAdminConsole(ui: ReactElement, { role = "ADMIN", socket, keepPreviousData = false }: AdminConsoleRenderOptions = {}) {
  const session = sessionValue(role);
  const realtime = { socket: socket?.socket ?? null, status: socket ? "authenticated" as const : "idle" as const };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false, keepPreviousData }}>
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
