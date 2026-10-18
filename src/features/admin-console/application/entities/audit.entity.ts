/*
* Funcionalidad: Audit log rules
* Descripción: Pure rules of /admin/audit: the AuditEntry read model (one row of `GET /api/audit`, before/after/metadata as plain objects), the filters kept in the URL (actor id, action, target type and id, Bogota calendar days, page and sort order) with their reader and writer, the API query of the list and of the CSV export (same filters, the export takes no paging), and diffAuditChanges, which flattens the before/after objects of one entry into dotted keys and keeps ONLY the keys whose values differ (deep comparison; arrays compared as a whole). formatAuditValue renders one side of a change. No statistic is computed. Depends on the admin console date range entity. v1.1 (closure B2): the audit catalog model (actions, target types, export row limit) and catalogOptions for the action and target type selects.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readDay } from "./date-range.entity";
import type { IsoRange } from "./date-range.entity";

export type AuditRecord = Record<string, unknown>;

export type AuditEntry = {
  id: string
  performedAt: string
  action: string
  actorId: string | null
  actorRole: string | null
  targetType: string
  targetId: string
  targetCollection: string
  description: string | null
  reason: string | null
  ip: string | null
  requestId: string | null
  before: AuditRecord | null
  after: AuditRecord | null
  metadata: AuditRecord | null
};

export type AuditSortOrder = "asc" | "desc";

/** Values of the audit filters and the CSV cap (`GET /api/audit/catalog`). */
export type AuditCatalog = {
  actions: string[]
  targetTypes: string[]
  exportRowLimit: number
};

/** Options of a catalog select: the catalog values plus a value of the URL the catalog does not list (old link). */
export function catalogOptions(values: readonly string[], selected: string): string[] {
  return selected && !values.includes(selected) ? [selected, ...values] : [...values];
}

export type AuditFilters = {
  actorId: string
  action: string
  targetType: string
  targetId: string
  fromDay: string
  toDay: string
  page: number
  sortOrder: AuditSortOrder
};

export type AuditChange = {
  path: string
  before: unknown
  after: unknown
};

export const AUDIT_PAGE_SIZE = 20;
export const AUDIT_HISTORY_PAGE_SIZE = 10;

export const NO_AUDIT_FILTERS: AuditFilters = {
  actorId: "",
  action: "",
  targetType: "",
  targetId: "",
  fromDay: "",
  toDay: "",
  page: 1,
  sortOrder: "desc",
};

type UrlQuery = Record<string, string | string[] | undefined>;

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

function readPage(value: unknown): number {
  const page = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function readAuditFilters(query: UrlQuery): AuditFilters {
  return {
    actorId: readText(query.actorId),
    action: readText(query.action),
    targetType: readText(query.targetType),
    targetId: readText(query.targetId),
    fromDay: readDay(query.from),
    toDay: readDay(query.to),
    page: readPage(query.page),
    sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
  };
}

export function hasAuditFilters(filters: AuditFilters): boolean {
  return Boolean(filters.actorId || filters.action || filters.targetType || filters.targetId || filters.fromDay || filters.toDay);
}

/** URL query of the filters: empty values, page 1 and the default order are left out. */
export function toAuditFiltersQuery(filters: AuditFilters): Record<string, string> {
  const query: Record<string, string> = {};

  if (filters.actorId) query.actorId = filters.actorId;
  if (filters.action) query.action = filters.action;
  if (filters.targetType) query.targetType = filters.targetType;
  if (filters.targetId) query.targetId = filters.targetId;
  if (filters.fromDay) query.from = filters.fromDay;
  if (filters.toDay) query.to = filters.toDay;
  if (filters.page > 1) query.page = String(filters.page);
  if (filters.sortOrder === "asc") query.sortOrder = "asc";

  return query;
}

export type AuditExportApiQuery = {
  actorId?: string
  action?: string
  targetType?: string
  targetId?: string
  from?: string
  to?: string
};

export type AuditApiQuery = AuditExportApiQuery & {
  page: number
  limit: number
  sortOrder: AuditSortOrder
};

export function toAuditExportQuery(filters: AuditFilters, range: IsoRange): AuditExportApiQuery {
  const query: AuditExportApiQuery = {};

  if (filters.actorId) query.actorId = filters.actorId;
  if (filters.action) query.action = filters.action;
  if (filters.targetType) query.targetType = filters.targetType;
  if (filters.targetId) query.targetId = filters.targetId;
  if (range.from) query.from = range.from;
  if (range.to) query.to = range.to;

  return query;
}

export function toAuditApiQuery(filters: AuditFilters, range: IsoRange): AuditApiQuery {
  return { ...toAuditExportQuery(filters, range), page: filters.page, limit: AUDIT_PAGE_SIZE, sortOrder: filters.sortOrder };
}

function isPlainObject(value: unknown): value is AuditRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => deepEqual(item, right[index]));
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

    return [...keys].every((key) => deepEqual(left[key], right[key]));
  }

  return false;
}

function flatten(value: AuditRecord | null, prefix: string, into: Map<string, unknown>): Map<string, unknown> {
  if (!value) {
    return into;
  }

  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(item) && Object.keys(item).length > 0) {
      flatten(item, path, into);
    } else {
      into.set(path, item);
    }
  }

  return into;
}

/** Only the fields whose values differ between before and after, as dotted keys in alphabetical order. */
export function diffAuditChanges(before: AuditRecord | null, after: AuditRecord | null): AuditChange[] {
  const left = flatten(before, "", new Map());
  const right = flatten(after, "", new Map());
  const paths = [...new Set([...left.keys(), ...right.keys()])].sort((a, b) => a.localeCompare(b));

  return paths
    .filter((path) => !deepEqual(left.get(path), right.get(path)))
    .map((path) => ({ path, before: left.get(path), after: right.get(path) }));
}

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const AUDIT_VALUE_LABELS = {
  absent: "(sin valor)",
  empty: "(vacío)",
} as const;

export function formatAuditValue(value: unknown): string {
  if (value === undefined) {
    return AUDIT_VALUE_LABELS.absent;
  }

  if (typeof value === "string") {
    return value === "" ? AUDIT_VALUE_LABELS.empty : value;
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return String(value);
  }

  return JSON.stringify(value);
}
