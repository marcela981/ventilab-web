/*
* Funcionalidad: Learning test helpers
* Descripción: Shared fixtures of the learning tests: backend envelope and error bodies, factories of the curriculum tree, module lessons and progress DTOs (summary, section, module), and a render helper that mounts a page inside an isolated SWR cache and a session context with the given role (no AuthProvider, no network for the session). Test-only code. Depends on Testing Library, msw, SWR and the session context.
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
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { Role } from "@shared/session/session.entity";
import type { CurriculumTreeDTO, ModuleLessonDTO, TreeLevelDTO, TreeModuleDTO } from "../../api/dtos/curriculum.dto";

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

export function treeModuleDto(id: string, order: number, overrides: Partial<TreeModuleDTO> = {}): TreeModuleDTO {
  return {
    id,
    title: `Módulo ${id}`,
    description: null,
    order,
    lessonCount: 2,
    locked: false,
    completed: false,
    missingPrerequisites: [],
    status: "PUBLISHED",
    ...overrides,
  };
}

export function treeLevelDto(id: string, order: number, sectionId: string | null, modules: TreeModuleDTO[], overrides: Partial<TreeLevelDTO> = {}): TreeLevelDTO {
  return {
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
    ...overrides,
  };
}

// s1 (order 1): lv1 "Nivel básico" (m1 completed, m2) and lv2 locked by lv1 (m3 locked by m2).
// s2 (order 2): empty. Unsectioned: lv9 (m9). Arrays are deliberately out of order.
export function treeDto(): CurriculumTreeDTO {
  return {
    sections: [
      { id: "s2", title: "Avanzado", description: null, order: 2, slug: "s2", status: "PUBLISHED", levels: [] },
      {
        id: "s1",
        title: "Fundamentos",
        description: "Bases de la ventilación",
        order: 1,
        slug: "s1",
        status: "PUBLISHED",
        levels: [
          treeLevelDto("lv2", 2, "s1", [
            treeModuleDto("m3", 1, { locked: true, missingPrerequisites: [{ id: "m2", title: "Módulo m2" }] }),
          ], { locked: true, missingPrerequisites: [{ id: "lv1", title: "Nivel básico" }] }),
          treeLevelDto("lv1", 1, "s1", [
            treeModuleDto("m2", 2),
            treeModuleDto("m1", 1, { completed: true }),
          ], { title: "Nivel básico" }),
        ],
      },
    ],
    unsectionedLevels: [treeLevelDto("lv9", 1, null, [treeModuleDto("m9", 1)])],
  };
}

export function lessonDto(id: string, order: number, pageCount: number): ModuleLessonDTO {
  return {
    id,
    title: `Lección ${id}`,
    order,
    pageCount,
    moduleId: "m2",
    aiGenerated: false,
    color: null,
    content: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    estimatedTime: null,
    hasRequiredQuiz: false,
    isActive: true,
    quizCount: 0,
    slug: null,
    status: "PUBLISHED",
    tags: [],
  };
}

export function progressItem(percentage: number, completedLessons: number, totalLessons: number) {
  return { percentage, completedLessons, totalLessons, completed: percentage >= 100 };
}

export function lessonProgressDto(lessonId: string, viewedPages: number, totalPages: number) {
  const done = totalPages > 0 && viewedPages >= totalPages;

  return { lessonId, viewedPages, totalPages, completedByPages: done, completed: done };
}

export function moduleProgressDto(moduleId: string, percentage: number, lessons: ReturnType<typeof lessonProgressDto>[]) {
  const completedLessons = lessons.filter((lesson) => lesson.completed).length;

  return { moduleId, levelId: "lv1", ...progressItem(percentage, completedLessons, lessons.length), lessons };
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

export function SessionWrapper({ role, children }: { role: Role, children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <SessionContext.Provider value={sessionValue(role)}>{children}</SessionContext.Provider>
    </SWRConfig>
  );
}

export function renderWithSession(ui: ReactElement, role: Role = "STUDENT") {
  return render(<SessionWrapper role={role}>{ui}</SessionWrapper>);
}
