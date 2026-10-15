/*
* Funcionalidad: Evaluation authoring entities
* Descripción: Domain types of the evaluation authoring list (EvaluationListItem with type, status, structure counts, activations and the canManage flag; the list page with its server pagination), the Spanish labels of types and statuses, the list filters and their pure helpers: the query sent to `GET /api/evaluations` (type, status, trimmed search, sortBy updatedAt desc, 1-based page and limit; no status means DRAFT and READY because the backend lists archived evaluations only when asked) and the module filter, which the API does not offer, applied on the client to the current page only (moduleOptions lists the module ids present on that page). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type EvaluationType = "EXAM" | "QUIZ" | "WORKSHOP";
export type EvaluationStatus = "DRAFT" | "READY" | "ARCHIVED";

export type EvaluationListItem = {
  id: string
  title: string
  type: EvaluationType
  status: EvaluationStatus
  moduleId: string | null
  levelId: string | null
  questionCount: number
  scenarioCount: number
  assignmentCount: number
  canManage: boolean
  createdByName: string | null
  updatedAt: string
};

export type EvaluationListPage = {
  items: EvaluationListItem[]
  total: number
  page: number
  pages: number
};

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const EVALUATION_TYPE_LABELS: Readonly<Record<EvaluationType, string>> = {
  EXAM: "Examen",
  QUIZ: "Quiz",
  WORKSHOP: "Taller",
};

export const EVALUATION_STATUS_LABELS: Readonly<Record<EvaluationStatus, string>> = {
  DRAFT: "Borrador",
  READY: "Lista",
  ARCHIVED: "Archivada",
};

export type EvaluationTypeFilter = "all" | EvaluationType;
// "current" asks for no status: the backend then lists DRAFT and READY, never ARCHIVED.
export type EvaluationStatusFilter = "current" | EvaluationStatus;

export type EvaluationListFilters = {
  search: string
  type: EvaluationTypeFilter
  status: EvaluationStatusFilter
  moduleId: string
};

export const ALL_MODULES = "all";

export const EMPTY_EVALUATION_FILTERS: EvaluationListFilters = {
  search: "",
  type: "all",
  status: "current",
  moduleId: ALL_MODULES,
};

export type EvaluationListQuery = {
  type?: EvaluationType
  status?: EvaluationStatus
  search?: string
  sortBy: "updatedAt"
  sortOrder: "desc"
  page: number
  limit: number
};

// pageIndex is 0-based (table pagination); the API page is 1-based.
export function toEvaluationListQuery(
  filters: Pick<EvaluationListFilters, "search" | "type" | "status">,
  pageIndex: number,
  limit: number,
): EvaluationListQuery {
  const search = filters.search.trim();

  return {
    ...(filters.type === "all" ? {} : { type: filters.type }),
    ...(filters.status === "current" ? {} : { status: filters.status }),
    ...(search ? { search } : {}),
    sortBy: "updatedAt",
    sortOrder: "desc",
    page: pageIndex + 1,
    limit,
  };
}

// The API has no module filter: it narrows only the page already loaded.
export function filterByModule(items: readonly EvaluationListItem[], moduleId: string): EvaluationListItem[] {
  return moduleId === ALL_MODULES ? [...items] : items.filter((item) => item.moduleId === moduleId);
}

export function moduleOptions(items: readonly EvaluationListItem[]): string[] {
  const ids = new Set<string>();

  for (const item of items) {
    if (item.moduleId) {
      ids.add(item.moduleId);
    }
  }

  return [...ids].sort((a, b) => a.localeCompare(b, "es"));
}

export function canArchive(item: EvaluationListItem): boolean {
  return item.canManage && item.status !== "ARCHIVED";
}
