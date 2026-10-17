/*
* Funcionalidad: Platform setting entity
* Descripción: Client model of one platform setting (key, category, description, effective value, default value, origin DEFAULT/OVERRIDE, free-form hard limits, version, last update) and the pure value helpers the generated forms use: path ids in the backend error format (`a.b`, `list[0]`), immutable read/write by path, deep clone and deep equality of JSON values, the display format of a value (Sí/No, lists joined by commas, JSON for objects) and the marker of a JSON field whose text does not parse. Depends on the admin console config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { SettingCategory } from "../config/admin-console.config";

export type SettingOrigin = "DEFAULT" | "OVERRIDE";

export type PlatformSetting = {
  key: string
  category: SettingCategory
  description: string
  value: unknown
  defaultValue: unknown
  origin: SettingOrigin
  limits: Readonly<Record<string, unknown>>
  version: number
  updatedAt: string | null
  updatedById: string | null
};

export type Primitive = string | number | boolean;

export type SettingPath = readonly (string | number)[];

// Draft value of a JSON field whose text does not parse; validation reports it and saving is blocked.
export class InvalidJsonDraft {
  readonly text: string;

  constructor(text: string) {
    this.text = text;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof InvalidJsonDraft);
}

export function isPrimitive(value: unknown): value is Primitive {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

export function pathId(path: SettingPath): string {
  return path.reduce<string>((id, segment) => {
    if (typeof segment === "number") {
      return `${id}[${segment}]`;
    }

    return id ? `${id}.${segment}` : segment;
  }, "");
}

export function getAt(root: unknown, path: SettingPath): unknown {
  let current: unknown = root;

  for (const segment of path) {
    if (typeof segment === "number") {
      current = Array.isArray(current) ? current[segment] : undefined;
    } else {
      current = isRecord(current) ? current[segment] : undefined;
    }
  }

  return current;
}

export function setAt(root: unknown, path: SettingPath, value: unknown): unknown {
  const [head, ...rest] = path;

  if (head === undefined) {
    return value;
  }

  if (typeof head === "number") {
    const list = Array.isArray(root) ? [...root] : [];

    list[head] = setAt(list[head], rest, value);

    return list;
  }

  const record = isRecord(root) ? { ...root } : {};

  record[head] = setAt(record[head], rest, value);

  return record;
}

export function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item: unknown) => cloneValue(item)) as T;
  }

  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)])) as T;
  }

  return value;
}

export function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => valuesEqual(item, right[index]));
  }

  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left);

    return leftKeys.length === Object.keys(right).length && leftKeys.every((key) => key in right && valuesEqual(left[key], right[key]));
  }

  return false;
}

// TODO(i18n): move to an admin-console namespace in src/i18n.
const VALUE_COPY = { yes: "Sí", no: "No", empty: "—", invalidJson: "JSON no válido" } as const;

export function formatSettingValue(value: unknown): string {
  if (value === null || value === undefined) {
    return VALUE_COPY.empty;
  }

  if (value instanceof InvalidJsonDraft) {
    return VALUE_COPY.invalidJson;
  }

  if (typeof value === "boolean") {
    return value ? VALUE_COPY.yes : VALUE_COPY.no;
  }

  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }

  if (Array.isArray(value) && value.every(isPrimitive)) {
    return value.length > 0 ? value.map((item) => formatSettingValue(item)).join(", ") : VALUE_COPY.empty;
  }

  return JSON.stringify(value);
}
