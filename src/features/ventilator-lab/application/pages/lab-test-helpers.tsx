/*
* Funcionalidad: Ventilator lab test helpers
* Descripción: Shared fixtures of the ventilator lab tests: backend URL and envelopes, reservation DTO builders (full and limited projections), a platform setting builder, a fake socket that records emitted messages and dispatches server events inside act, and a render wrapper with an isolated SWR cache, a session of the given role and permissions and the realtime context. v1.1 (T2): group, caller groups and user DTO builders for the reservation holders. v1.2 (T3): the wrapper provides the design-system toasts (a given ToastApi spy or the real ToastProvider) and a realtime status control to change the socket status after render. v1.3 (T2 review fix / T4): renderLabHook accepts initialProps (rerender with new hook props) and the session user id can be read through sessionUserId. v1.4 (B1 closure): the setting and user builders carry the new contract fields (setting label, type, unit and keySchema; user isSuperadmin and studentCode). Test-only module; depends on Testing Library, msw, SWR and the session and realtime contexts. v1.5 (S8): fixtures carry the regenerated block 1 contract fields (party code null).
* Versión: 1.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, render, renderHook } from "@testing-library/react";
import { HttpResponse } from "msw";
import { useMemo, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "@shared/design-system/components/toast-provider";
import { ToastContext } from "@shared/design-system/components/use-toast";
import type { ToastApi } from "@shared/design-system/components/use-toast";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { RealtimeContext } from "@shared/realtime/realtime-context";
import type { RealtimeEventMap, RealtimeEventName, RealtimeSocket, RealtimeStatus } from "@shared/realtime/realtime.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { Permission, Role } from "@shared/session/session.entity";
import type {
  GroupDTO,
  GroupMembershipDTO,
  MyGroupsDTO,
  PlatformSettingDTO,
  ReservationDetailDTO,
  ReservationSummaryDTO,
  UserDTO,
} from "../../api/dtos/lab.dto";

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
    holder: { id: "u1", code: null, name: "Ana Gómez", identifier: "ana@ventylab.demo", role: "STUDENT" },
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
    label: key,
    type: "integer",
    unit: null,
    keySchema: null,
    value: value as number,
    defaultValue: value as number,
    origin: "OVERRIDE",
    limits: {},
    version: 1,
    updatedAt: null,
    updatedById: null,
  };
}

export function myGroupsDto(memberships: GroupMembershipDTO[]): MyGroupsDTO {
  return { studentGroup: null, memberships };
}

export function groupDto(id: string, name: string, overrides: Partial<GroupDTO> = {}): GroupDTO {
  return {
    id,
    name,
    description: null,
    type: "STUDENT",
    parentGroupId: null,
    depth: 0,
    simulatorLeaderId: null,
    isActive: true,
    maxStudents: null,
    enrollmentCode: null,
    semester: null,
    academicYear: null,
    createdBy: null,
    createdAt: "2026-02-01T10:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
    leader: null,
    creator: null,
    parentGroup: null,
    subGroups: [],
    membersCount: 0,
    subGroupsCount: 0,
    ...overrides,
  };
}

export function userDto(id: string, name: string | null, overrides: Partial<UserDTO> = {}): UserDTO {
  return {
    id,
    email: `${id}@ventylab.demo`,
    name,
    role: "STUDENT",
    image: null,
    isActive: true,
    isSuperadmin: false,
    studentCode: null,
    emailVerified: null,
    createdAt: "2026-02-01T10:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
    ...overrides,
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

export type RealtimeStatusControl = {
  get: () => RealtimeStatus
  subscribe: (listener: () => void) => () => void
  /** Changes the socket status of the rendered tree (inside act). */
  set: (status: RealtimeStatus) => void
};

export function createRealtimeStatusControl(initial: RealtimeStatus): RealtimeStatusControl {
  let status = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => status,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    set: (next) => {
      act(() => {
        status = next;
        listeners.forEach((listener) => listener());
      });
    },
  };
}

export type LabRenderOptions = {
  role?: Role
  permissions?: readonly Permission[]
  socket?: FakeSocket
  realtimeStatus?: RealtimeStatus
  /** Overrides realtimeStatus with a status that can change after render. */
  realtimeControl?: RealtimeStatusControl
  /** Spy toasts; the real ToastProvider otherwise. */
  toast?: ToastApi
};

function sessionValue(role: Role, permissions: readonly Permission[]): SessionContextValue {
  const user = { id: sessionUserId(role), email: "user@ventylab.demo", name: "Usuario", image: null, role };

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

function createWrapper({ role = "STUDENT", permissions = [], socket, realtimeStatus, realtimeControl, toast }: LabRenderOptions) {
  const session = sessionValue(role, permissions);
  const control = realtimeControl ?? createRealtimeStatusControl(realtimeStatus ?? (socket ? "authenticated" : "idle"));

  function Toasts({ children }: { children: ReactNode }) {
    return toast
      ? <ToastContext.Provider value={toast}>{children}</ToastContext.Provider>
      : <ToastProvider>{children}</ToastProvider>;
  }

  return function Wrapper({ children }: { children: ReactNode }) {
    const status = useSyncExternalStore(control.subscribe, control.get, control.get);
    const realtime = useMemo(() => ({ socket: socket?.socket ?? null, status }), [status]);

    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
        <SessionContext.Provider value={session}>
          <RealtimeContext.Provider value={realtime}>
            <Toasts>{children}</Toasts>
          </RealtimeContext.Provider>
        </SessionContext.Provider>
      </SWRConfig>
    );
  };
}

export function renderLab(ui: ReactElement, options: LabRenderOptions = {}) {
  return render(ui, { wrapper: createWrapper(options) });
}

export function renderLabHook<T, P = undefined>(
  hook: (props: P) => T,
  { initialProps, ...options }: LabRenderOptions & { initialProps?: P } = {},
) {
  return renderHook(hook, { wrapper: createWrapper(options), initialProps: initialProps as P });
}

/** Id of the session user the wrapper creates for a role ("student-1", "teacher-1", "admin-1"). */
export const sessionUserId = (role: Role): string => `${role.toLowerCase()}-1`;
