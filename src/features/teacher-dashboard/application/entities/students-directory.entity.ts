/*
* Funcionalidad: Students directory entity
* Descripción: Pure model of the students directory (/teacher/students): its tabs (Directorio, Estadísticas), the URL state (?page ?q ?sort ?scope; parsed leniently, defaults omitted when written back), the column sort toggle (name starts ascending, progress descending), the `GET /api/admin/students` query it maps to (scope "mine" → myGroups=true), the key that clears the row selection when the filter, search, sort or page change, the directory row model and the Spanish load error message (a 403 names the directory). No dependencies besides the shared API error helpers and the teacher dashboard error messages.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import type { AdminStudentsQueryDTO } from "../../api/dtos/students-directory.dto";
import { getTeacherDashboardErrorMessage } from "./teacher-dashboard-error-messages";

export const DIRECTORY_TABS = ["directorio", "estadisticas"] as const;
export type DirectoryTab = (typeof DIRECTORY_TABS)[number];
export const DEFAULT_DIRECTORY_TAB: DirectoryTab = "directorio";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const DIRECTORY_TAB_LABELS: Record<DirectoryTab, string> = {
  directorio: "Directorio",
  estadisticas: "Estadísticas",
};

export const DIRECTORY_PAGE_SIZE = 25;

export type DirectorySortKey = "name" | "progress";
export type SortDirection = "asc" | "desc";
export type DirectorySort = { key: DirectorySortKey, direction: SortDirection };
export type DirectoryScope = "all" | "mine";

export type DirectoryState = {
  page: number
  q: string
  sort: DirectorySort
  scope: DirectoryScope
};

export const DEFAULT_DIRECTORY_SORT: DirectorySort = { key: "name", direction: "asc" };

// The direction a column starts with when it becomes the sort column.
const FIRST_DIRECTION: Record<DirectorySortKey, SortDirection> = { name: "asc", progress: "desc" };

type QueryValue = string | string[] | undefined;

const single = (value: QueryValue): string | undefined => (typeof value === "string" ? value : undefined);

function readPage(value: QueryValue): number {
  const page = Number(single(value));

  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** `?sort=name` / `?sort=-progress` (a leading minus is descending); anything else gives the default sort. */
function readSort(value: QueryValue): DirectorySort {
  const raw = single(value) ?? "";
  const direction: SortDirection = raw.startsWith("-") ? "desc" : "asc";
  const key = raw.replace(/^-/, "");

  return key === "name" || key === "progress" ? { key, direction } : DEFAULT_DIRECTORY_SORT;
}

const writeSort = (sort: DirectorySort): string => `${sort.direction === "desc" ? "-" : ""}${sort.key}`;

export function readDirectoryState(query: Record<string, QueryValue>): DirectoryState {
  return {
    page: readPage(query.page),
    q: (single(query.q) ?? "").trim(),
    sort: readSort(query.sort),
    scope: single(query.scope) === "mine" ? "mine" : "all",
  };
}

/** Directory part of the URL query; defaults are left out so the bare /teacher/students stays the default view. */
export function toDirectoryQuery(state: DirectoryState): Record<string, string> {
  const sameSort = state.sort.key === DEFAULT_DIRECTORY_SORT.key && state.sort.direction === DEFAULT_DIRECTORY_SORT.direction;

  return {
    ...(state.page > 1 ? { page: String(state.page) } : {}),
    ...(state.q ? { q: state.q } : {}),
    ...(sameSort ? {} : { sort: writeSort(state.sort) }),
    ...(state.scope === "mine" ? { scope: "mine" } : {}),
  };
}

export function toAdminStudentsQuery(state: DirectoryState): AdminStudentsQueryDTO {
  return {
    page: state.page,
    limit: DIRECTORY_PAGE_SIZE,
    sortBy: state.sort.key,
    sortOrder: state.sort.direction,
    ...(state.q ? { search: state.q } : {}),
    ...(state.scope === "mine" ? { myGroups: "true" as const } : {}),
  };
}

export function toggleDirectorySort(current: DirectorySort, key: DirectorySortKey): DirectorySort {
  if (current.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }

  return { key, direction: FIRST_DIRECTION[key] };
}

/** The selection belongs to one listing: any change of page, search, sort or scope clears it. */
export function directorySelectionKey(state: DirectoryState): string {
  return `${state.page}|${state.q}|${writeSort(state.sort)}|${state.scope}`;
}

export type DirectoryGroupRef = { id: string, name: string };

export type DirectoryRow = {
  id: string
  name: string | null
  email: string
  studentCode: string | null
  /** Lesson-weighted progress over all published content, 0–100. */
  progress: number
  groups: readonly DirectoryGroupRef[]
  /** Whether the caller may open the student's detail (the backend scope). */
  canView: boolean
};

export const rowDisplayName = (row: Pick<DirectoryRow, "name" | "email">): string => row.name?.trim() || row.email;

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const DIRECTORY_ERROR_COPY = {
  forbidden: "No tienes permiso para ver el directorio de estudiantes.",
} as const;

export function getDirectoryErrorMessage(error: unknown): string {
  return toApiError(error).status === 403 ? DIRECTORY_ERROR_COPY.forbidden : getTeacherDashboardErrorMessage(error);
}
