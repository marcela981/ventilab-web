/*
* Funcionalidad: Admin console test helpers
* Descripción: Shared fixtures of the admin console tests: backend URL, envelope with pagination, error response with details, DTO builders typed against the generated schema (user, group, platform setting, system status with AI providers) and a renderer that wraps the UI in a fresh SWR cache, an authenticated ADMIN session (id admin-1) and the global ToastProvider. Depends on Testing Library, msw, SWR, the design-system toast, the session context and the admin console DTOs.
* Versión: 1.0
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

function sessionValue(): SessionContextValue {
  const user = { id: SESSION_USER_ID, email: "admin@ventylab.demo", name: "Administradora", image: null, role: "ADMIN" as const };

  return {
    status: "authenticated",
    user,
    role: "ADMIN",
    permissions: [],
    error: null,
    hasRole: (...roles) => roles.includes("ADMIN"),
    hasPermission: () => true,
    establishSession: () => Promise.resolve(user),
    signOut: () => Promise.resolve(),
    reloadSession: () => Promise.resolve(user),
    handleRoleChanged: () => Promise.resolve(false),
  };
}

export function renderAdminConsole(ui: ReactElement) {
  const session = sessionValue();

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
