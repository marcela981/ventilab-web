/*
* Funcionalidad: Content editor test helpers
* Descripción: Shared fixtures of the content editor tests: backend envelope and error bodies, DTO factories for sections, levels (with sectionId), the staff curriculum tree (levels > modules > lessons) and lesson page summaries, a default content fixture (two sections, one unsectioned level) and a render helper that mounts a page inside an isolated SWR cache, a session context with the given role and the global ToastProvider. Test-only code. Depends on Testing Library, msw, SWR, the session context and the design-system toast.
* Versión: 1.0 (C1)
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
import type { Role } from "@shared/session/session.entity";
import type {
  ContentStatusDTO,
  LevelDTO,
  PageSummaryDTO,
  SectionDTO,
  TreeLessonDTO,
  TreeLevelDTO,
  TreeModuleDTO,
} from "../../api/dtos/content-editor.dto";

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

const DATE = "2026-10-01T00:00:00.000Z";

export function sectionDto(id: string, order: number, title: string, status: ContentStatusDTO = "PUBLISHED"): SectionDTO {
  return { id, slug: id, title, description: null, order, status, levelCount: 0, createdAt: DATE, updatedAt: DATE };
}

export function levelDto(id: string, order: number, sectionId: string | null): LevelDTO {
  return {
    id,
    title: `Nivel ${id}`,
    track: "mecanica",
    description: null,
    order,
    isActive: true,
    status: "PUBLISHED",
    sectionId,
    color: "",
    tags: [],
    parentId: null,
    lastModifiedBy: null,
    lastModifiedAt: null,
    createdAt: DATE,
    updatedAt: DATE,
    moduleCount: 0,
  };
}

export function treeLessonDto(id: string, order: number, title: string, status: ContentStatusDTO = "PUBLISHED"): TreeLessonDTO {
  return { id, title, slug: null, order, color: null, tags: [], isActive: true, status, estimatedTime: null, blocks: null };
}

export function treeModuleDto(id: string, order: number, title: string, lessons: TreeLessonDTO[], status: ContentStatusDTO = "PUBLISHED"): TreeModuleDTO {
  return {
    id,
    levelId: null,
    title,
    description: null,
    category: null,
    difficulty: null,
    estimatedTime: null,
    thumbnail: null,
    order,
    isActive: true,
    status,
    color: null,
    tags: [],
    createdAt: DATE,
    updatedAt: DATE,
    lessons,
  };
}

export function treeLevelDto(id: string, order: number, title: string, modules: TreeModuleDTO[], status: ContentStatusDTO = "PUBLISHED"): TreeLevelDTO {
  return {
    id,
    title,
    track: "mecanica",
    description: null,
    order,
    isActive: true,
    status,
    color: null,
    tags: [],
    parentId: null,
    createdAt: DATE,
    updatedAt: DATE,
    modules,
    children: [],
  };
}

export function pageSummaryDto(id: string, lessonId: string, order: number, title: string, status: ContentStatusDTO = "PUBLISHED"): PageSummaryDTO {
  return {
    id,
    lessonId,
    status,
    title,
    slug: id,
    order,
    type: "THEORY",
    difficulty: "BEGINNER",
    estimatedMinutes: null,
    learningObjectives: [],
    hasRequiredQuiz: false,
    legacyLessonId: null,
    legacyJsonId: null,
  };
}

// s1 "Fundamentos" (PUBLISHED): lv1 "Nivel básico" > m1 "Mecánica ventilatoria" (lessons l1, l2) and m2 "Modos" (DRAFT, no lessons).
// s2 "Avanzado" (DRAFT): lv2 "Nivel experto" > m3 "Destete" (DRAFT).
// Unsectioned: lv9 "Nivel libre" (absent from /api/levels or without sectionId). Arrays deliberately out of order.
export function contentFixture() {
  return {
    sections: [sectionDto("s2", 2, "Avanzado", "DRAFT"), sectionDto("s1", 1, "Fundamentos")],
    levels: [levelDto("lv2", 2, "s2"), levelDto("lv1", 1, "s1"), levelDto("lv9", 3, null)],
    tree: [
      treeLevelDto("lv9", 3, "Nivel libre", []),
      treeLevelDto("lv2", 2, "Nivel experto", [treeModuleDto("m3", 1, "Destete", [], "DRAFT")]),
      treeLevelDto("lv1", 1, "Nivel básico", [
        treeModuleDto("m2", 2, "Modos", [], "DRAFT"),
        treeModuleDto("m1", 1, "Mecánica ventilatoria", [
          treeLessonDto("l2", 2, "Volumen corriente"),
          treeLessonDto("l1", 1, "Presiones"),
        ]),
      ]),
    ],
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

export function TestProviders({ role = "TEACHER", children }: { role?: Role, children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <SessionContext.Provider value={sessionValue(role)}>
        <ToastProvider>{children}</ToastProvider>
      </SessionContext.Provider>
    </SWRConfig>
  );
}

export function renderWithSession(ui: ReactElement, role: Role = "TEACHER") {
  return render(<TestProviders role={role}>{ui}</TestProviders>);
}
