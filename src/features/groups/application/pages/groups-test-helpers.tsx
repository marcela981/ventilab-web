/*
* Funcionalidad: Groups page test helpers
* Descripción: Shared fixtures of the groups page tests: backend envelope and error bodies, a GroupDTO / GroupDetailDTO / UserDTO / GroupSupervisionDTO factory (v1.1, T11c: platform role of members and users, supervisions) and a render helper that mounts a page inside an isolated SWR cache and a session context with the given role (no AuthProvider, no network for the session). Test-only code. Depends on Testing Library, SWR and the session context.
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
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { Role } from "@shared/session/session.entity";

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

export function groupDto(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `g${index}`,
    name: `Grupo ${String(index).padStart(2, "0")}`,
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
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    leader: null,
    creator: null,
    parentGroup: null,
    subGroups: [],
    membersCount: index,
    subGroupsCount: 0,
    ...overrides,
  };
}

export function memberDto(userId: string, name: string, memberRole: "LEADER" | "MEMBER" = "MEMBER", role: "STUDENT" | "TEACHER" = "STUDENT") {
  const email = `${userId}@ventylab.demo`;

  return {
    id: `m-${userId}`,
    groupId: "g1",
    userId,
    role,
    memberRole,
    joinedAt: "2026-08-03T00:00:00.000Z",
    user: { id: userId, name, email, role, image: null, createdAt: null },
  };
}

export function userDto(id: string, name: string, role: Role = "STUDENT") {
  return {
    id,
    email: `${id}@ventylab.demo`,
    name,
    image: null,
    role,
    isActive: true,
    emailVerified: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

export function supervisionDto(teacherGroupId: string, studentGroupId: string, name: string, isActive = true) {
  return {
    teacherGroupId,
    createdAt: "2026-08-05T00:00:00.000Z",
    studentGroup: { id: studentGroupId, name, isActive },
  };
}

function sessionValue(role: Role): SessionContextValue {
  const user = { id: `${role.toLowerCase()}-1`, email: "staff@ventylab.demo", name: "Staff", image: null, role };

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

export function renderWithSession(ui: ReactElement, role: Role = "TEACHER") {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <SessionContext.Provider value={sessionValue(role)}>{ui}</SessionContext.Provider>
    </SWRConfig>,
  );
}
