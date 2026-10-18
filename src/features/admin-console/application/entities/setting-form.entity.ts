/*
* Funcionalidad: Setting form generator
* Descripción: Builds the form of any platform setting from its metadata, with no hand-written form per setting (the API sends no field type, so the kind comes from `typeof defaultValue`): number → numeric field with limits.min/max/integer; boolean → switch; string → text, or select with limits.allowedValues; array of primitives → multi-select with limits.allowedValues (and limits.required) or a list editor; object → recursive group whose children come from the default (plus any key only the current value has), each child taking limits[childKey] when present and otherwise inheriting its parent's limits (so `ai.quotas` and `ai.prices` reach their per-field limits); `ai.useCase.*` → provider chain field (chain + models, limits.providerChain.minLength/maxLength) plus the generic numeric fields; anything else → JSON field. validateSettingValue mirrors only the hard limits the API shows (min/max/integer, allowed and required values, lengths) plus non-empty models of the chain providers; describeLimits renders them; diffSettingValues lists the changed fields with previous value, new value and limits (ventilator commands confirmation); mapSettingServerError places a 422 (details.reason "<path> <reason>", paths like `providerChain[0]`, `models.x`, `value`) on the field it names, translated to Spanish, or on the card when no field matches. Depends on the platform setting entity, the admin console config and error messages and the api-client errors. v1.1 (O4a review): record-like settings (`ai.quotas`: requestsPerDay/tokensPerDay are optional and a missing role or use case is unlimited; `ai.prices`: whole replacement, so a provider or model of the default may be missing) mark their nested fields `optional`: a missing (undefined) optional field skips validation, and the editor omits the key when its input is emptied. v1.2 (closure B2): the registry metadata drives the form when present: `type` (integer, number, boolean, string, string-list, integer-list, map, object; object or no type keeps the default-driven form), `unit` on number and list fields, and `keySchema` builds a map field (root or at keySchema.path) whose keys the admin adds and removes (allowedKeys as a select when non-null, free text otherwise), each value built from the declared value type and limits, nested maps through valueKeySchema, objects shaped by a sample value that also seeds a new key; validation, diff and server paths walk the keys of the draft. A 400/422 with `data.errors: [{ field, message }]` puts each server message under the field it names (setting key prefix removed), the rest on the card; the legacy `details.reason` parsing stays as fallback.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import { SETTING_FIELD_LABELS } from "../config/admin-console.config";
import { getAdminConsoleErrorMessage, PROVIDER_NOT_CONFIGURED_CODE, serverFieldErrors } from "./admin-console-error-messages";
import { cloneValue, formatSettingValue, getAt, InvalidJsonDraft, isPrimitive, isRecord, pathId, valuesEqual } from "./platform-setting.entity";
import type { PlatformSetting, Primitive, SettingKeySchema, SettingPath, SettingValueType } from "./platform-setting.entity";

export type NumberLimits = { min: number | null, max: number | null, integer: boolean };

export type LengthLimits = { minLength: number | null, maxLength: number | null };

type FieldBase = {
  // Path in the backend error format ("" for the root value).
  id: string
  path: SettingPath
  label: string
  // The key may be missing from the value (record-like settings): undefined is valid and skips validation.
  optional?: boolean
};

export type NumberField = FieldBase & { kind: "number", limits: NumberLimits, unit?: string };
export type BooleanField = FieldBase & { kind: "boolean" };
export type TextField = FieldBase & { kind: "text", limits: LengthLimits };
export type SelectField = FieldBase & { kind: "select", options: readonly Primitive[] };
export type MultiSelectField = FieldBase & { kind: "multiSelect", options: readonly Primitive[], required: readonly Primitive[], limits: LengthLimits };
export type ListField = FieldBase & { kind: "list", itemKind: "number" | "string", limits: LengthLimits, itemLimits: NumberLimits, unit?: string };
export type GroupField = FieldBase & { kind: "group", children: readonly SettingField[] };
export type ProviderChainField = FieldBase & { kind: "providerChain", modelsPath: SettingPath, limits: LengthLimits };
export type JsonField = FieldBase & { kind: "json" };

/** How each value of a map is built: its declared type and limits, its nested map schema and a sample value for new keys. */
export type MapValueSpec = {
  valueType: SettingValueType
  limits: Readonly<Record<string, unknown>>
  keySchema: SettingKeySchema | null
  // A value of the default (or current) map used as the starting value of a new key and as the shape of object values.
  template: unknown
  optionalMode: "all" | "entries" | null
};

/** A map with keys the admin adds and removes (`type: "map"` + keySchema); its entries are built from the draft. */
export type MapField = FieldBase & {
  kind: "map"
  keyLabel: string
  allowedKeys: readonly string[] | null
  value: MapValueSpec
};

export type SettingField =
  | NumberField
  | BooleanField
  | TextField
  | SelectField
  | MultiSelectField
  | ListField
  | GroupField
  | ProviderChainField
  | MapField
  | JsonField;

export type FieldErrors = Readonly<Record<string, string>>;

export type SettingChange = {
  id: string
  label: string
  before: string
  after: string
  limits: string
};

export type ServerErrorMapping = {
  fieldErrors: Record<string, string>
  cardMessage: string | null
};

const AI_USE_CASE_PREFIX = "ai.useCase.";

// Record-like settings whose entries may be missing from the value.
// "all": every field below the root may be missing (ai.quotas: optional requestsPerDay/tokensPerDay, a missing role or use case is unlimited).
// "entries": only the nested records may be missing; a present entry needs all its numbers (ai.prices: whole replacement, both prices required).
export const RECORD_SETTINGS: Readonly<Record<string, "all" | "entries">> = {
  "ai.quotas": "all",
  "ai.prices": "entries",
};
const CHAIN_KEY = "providerChain";
const MODELS_KEY = "models";
const LABEL_SEPARATOR = " › ";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const SETTING_FORM_COPY = {
  rootLabel: "Valor",
  number: "Ingresa un número.",
  integer: "Debe ser un número entero.",
  between: (min: number, max: number) => `Debe estar entre ${min} y ${max}.`,
  atLeast: (min: number) => `Debe ser mayor o igual a ${min}.`,
  atMost: (max: number) => `Debe ser menor o igual a ${max}.`,
  required: "Este campo es obligatorio.",
  maxChars: (max: number) => `Debe tener como máximo ${max} caracteres.`,
  option: "Elige un valor permitido.",
  options: "Elige solo valores permitidos.",
  mustInclude: (values: string) => `Debe incluir ${values}.`,
  entries: (min: number | null, max: number | null) => {
    if (min !== null && max !== null) {
      return `Debe tener entre ${min} y ${max} elementos.`;
    }

    return min !== null ? `Debe tener al menos ${min} elementos.` : `Debe tener como máximo ${max ?? 0} elementos.`;
  },
  listItem: (index: number, message: string) => `Elemento ${index + 1}: ${message}`,
  chainLength: (min: number | null, max: number | null) => {
    if (min !== null && max !== null) {
      return `La cadena debe tener entre ${min} y ${max} proveedores.`;
    }

    return min !== null ? `La cadena debe tener al menos ${min} proveedores.` : `La cadena debe tener como máximo ${max ?? 0} proveedores.`;
  },
  chainRepeated: "No repitas proveedores en la cadena.",
  model: "Ingresa el modelo de este proveedor.",
  json: "El JSON no es válido.",
  limitMin: (min: number) => `mín. ${min}`,
  limitMax: (max: number) => `máx. ${max}`,
  limitInteger: "entero",
  limitDecimal: "decimal",
  limitAllowed: (values: string) => `valores permitidos: ${values}`,
  limitRequired: (values: string) => `obligatorios: ${values}`,
  limitEntries: (min: number | null, max: number | null) => {
    if (min !== null && max !== null) {
      return `entre ${min} y ${max} elementos`;
    }

    return min !== null ? `al menos ${min} elementos` : `como máximo ${max ?? 0} elementos`;
  },
  noLimits: "Sin límites declarados",
  limitKeys: (values: string) => `claves permitidas: ${values}`,
  noEntry: "(sin entrada)",
  invalidValue: (reason: string) => `El valor no es válido: ${reason}`,
} as const;

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function primitiveArray(value: unknown): Primitive[] | null {
  return Array.isArray(value) && value.every(isPrimitive) ? value : null;
}

export function toNumberLimits(limits: Readonly<Record<string, unknown>>): NumberLimits {
  return { min: numberOrNull(limits.min), max: numberOrNull(limits.max), integer: limits.integer === true };
}

export function toLengthLimits(limits: unknown): LengthLimits {
  const record = isRecord(limits) ? limits : {};

  return { minLength: numberOrNull(record.minLength), maxLength: numberOrNull(record.maxLength) };
}

function childLimits(limits: Readonly<Record<string, unknown>>, key: string): Readonly<Record<string, unknown>> {
  const own = limits[key];

  return isRecord(own) ? own : limits;
}

export function fieldLabel(key: string | number): string {
  return typeof key === "number" ? String(key + 1) : (SETTING_FIELD_LABELS[key] ?? key);
}

function base(path: SettingPath, label: string): FieldBase {
  return { id: pathId(path), path, label };
}

function buildArrayField(path: SettingPath, label: string, defaultValue: unknown[], value: unknown, limits: Readonly<Record<string, unknown>>): SettingField {
  const items = [...defaultValue, ...(Array.isArray(value) ? value : [])];

  if (!items.every(isPrimitive)) {
    return { ...base(path, label), kind: "json" };
  }

  const allowed = primitiveArray(limits.allowedValues);

  if (allowed) {
    return {
      ...base(path, label),
      kind: "multiSelect",
      options: allowed,
      required: primitiveArray(limits.required) ?? [],
      limits: toLengthLimits(limits),
    };
  }

  const first = items[0];

  if (typeof first !== "number" && typeof first !== "string") {
    return { ...base(path, label), kind: "json" };
  }

  return {
    ...base(path, label),
    kind: "list",
    itemKind: typeof first === "number" ? "number" : "string",
    limits: toLengthLimits(limits),
    itemLimits: toNumberLimits(limits),
  };
}

function firstValue(value: unknown): unknown {
  return isRecord(value) ? Object.values(value)[0] : undefined;
}

function buildMapField(
  path: SettingPath,
  label: string,
  schema: SettingKeySchema,
  defaultValue: unknown,
  value: unknown,
  optionalMode: MapValueSpec["optionalMode"],
): MapField {
  return {
    ...base(path, label),
    kind: "map",
    keyLabel: schema.keyLabel,
    allowedKeys: schema.allowedKeys,
    value: {
      valueType: schema.valueType,
      limits: schema.valueLimits ?? {},
      keySchema: schema.valueKeySchema,
      template: firstValue(defaultValue) ?? firstValue(value),
      optionalMode,
    },
  };
}

/** A field of a declared value type (registry metadata); "object" and an unknown shape fall back to the default-driven form. */
function buildTypedField(
  path: SettingPath,
  label: string,
  type: SettingValueType,
  defaultValue: unknown,
  value: unknown,
  limits: Readonly<Record<string, unknown>>,
): SettingField {
  switch (type) {
    case "integer":
      return { ...base(path, label), kind: "number", limits: { ...toNumberLimits(limits), integer: true } };
    case "number":
      return { ...base(path, label), kind: "number", limits: toNumberLimits(limits) };
    case "boolean":
      return { ...base(path, label), kind: "boolean" };
    case "string": {
      const allowed = primitiveArray(limits.allowedValues);

      return allowed
        ? { ...base(path, label), kind: "select", options: allowed }
        : { ...base(path, label), kind: "text", limits: toLengthLimits(limits) };
    }
    case "string-list":
    case "integer-list": {
      const allowed = primitiveArray(limits.allowedValues);

      if (allowed) {
        return { ...base(path, label), kind: "multiSelect", options: allowed, required: primitiveArray(limits.required) ?? [], limits: toLengthLimits(limits) };
      }

      return type === "integer-list"
        ? { ...base(path, label), kind: "list", itemKind: "number", limits: toLengthLimits(limits), itemLimits: { ...toNumberLimits(limits), integer: true } }
        : { ...base(path, label), kind: "list", itemKind: "string", limits: toLengthLimits(limits), itemLimits: toNumberLimits({}) };
    }
    default:
      return buildField(path, label, defaultValue, value, limits);
  }
}

/** Field of one value of a map, at `[...map.path, key]`, built from the map's value spec and the current draft. */
export function mapEntryField(field: MapField, key: string, root: unknown): SettingField {
  const path = [...field.path, key];
  const current = getAt(root, path);
  const { valueType, limits, keySchema, template, optionalMode } = field.value;
  let entry: SettingField;

  if (valueType === "map" && keySchema) {
    entry = buildMapField(path, fieldLabel(key), keySchema, template, current, optionalMode);
  } else if (valueType === "object") {
    entry = buildField(path, fieldLabel(key), isRecord(template) ? template : current, current, limits);
  } else {
    entry = buildTypedField(path, fieldLabel(key), valueType, template, current, limits);
  }

  return optionalMode ? markOptional(entry, optionalMode, true) : entry;
}

/** Keys of the map in the draft, in insertion order. */
export function mapKeys(field: MapField, root: unknown): string[] {
  const current = getAt(root, field.path);

  return isRecord(current) ? Object.keys(current) : [];
}

/** Starting value of a new key: an empty nested map, a copy of the sample value, or the empty value of the declared type. */
export function newMapEntryValue(field: MapField): unknown {
  const { template, valueType } = field.value;

  // A nested map starts without keys: copying the sample would copy another key's entries (e.g. another provider's models).
  if (valueType === "map") {
    return {};
  }

  if (template !== undefined) {
    return cloneValue(template);
  }

  switch (valueType) {
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return false;
    case "string":
      return "";
    case "string-list":
    case "integer-list":
      return [];
    default:
      return {};
  }
}

function buildField(
  path: SettingPath,
  label: string,
  defaultValue: unknown,
  value: unknown,
  limits: Readonly<Record<string, unknown>>,
  keySchema: SettingKeySchema | null = null,
  optionalMode: MapValueSpec["optionalMode"] = null,
): SettingField {
  if (keySchema && pathId(path) === (keySchema.path ?? "")) {
    return buildMapField(path, label, keySchema, defaultValue, value, optionalMode);
  }

  if (typeof defaultValue === "number") {
    return { ...base(path, label), kind: "number", limits: toNumberLimits(limits) };
  }

  if (typeof defaultValue === "boolean") {
    return { ...base(path, label), kind: "boolean" };
  }

  if (typeof defaultValue === "string") {
    const allowed = primitiveArray(limits.allowedValues);

    return allowed
      ? { ...base(path, label), kind: "select", options: allowed }
      : { ...base(path, label), kind: "text", limits: toLengthLimits(limits) };
  }

  if (Array.isArray(defaultValue)) {
    return buildArrayField(path, label, defaultValue, value, limits);
  }

  if (isRecord(defaultValue)) {
    const current = isRecord(value) ? value : {};
    const keys = [...new Set([...Object.keys(defaultValue), ...Object.keys(current)])];

    if (keys.length === 0) {
      return { ...base(path, label), kind: "json" };
    }

    return {
      ...base(path, label),
      kind: "group",
      children: keys.map((key) => {
        const source = defaultValue[key] ?? current[key];

        return buildField([...path, key], fieldLabel(key), source, current[key], childLimits(limits, key), keySchema, optionalMode);
      }),
    };
  }

  return { ...base(path, label), kind: "json" };
}

export function isAiUseCaseSetting(setting: Pick<PlatformSetting, "key" | "defaultValue">): boolean {
  return setting.key.startsWith(AI_USE_CASE_PREFIX)
    && isRecord(setting.defaultValue)
    && Array.isArray(setting.defaultValue[CHAIN_KEY]);
}

function buildAiUseCaseField(setting: Pick<PlatformSetting, "defaultValue" | "value" | "limits">): GroupField {
  const defaults = isRecord(setting.defaultValue) ? setting.defaultValue : {};
  const current = isRecord(setting.value) ? setting.value : {};
  const keys = [...new Set([...Object.keys(defaults), ...Object.keys(current)])]
    .filter((key) => key !== CHAIN_KEY && key !== MODELS_KEY);
  const chain: ProviderChainField = {
    ...base([CHAIN_KEY], fieldLabel(CHAIN_KEY)),
    kind: "providerChain",
    modelsPath: [MODELS_KEY],
    limits: toLengthLimits(setting.limits[CHAIN_KEY]),
  };

  return {
    ...base([], SETTING_FORM_COPY.rootLabel),
    kind: "group",
    children: [
      chain,
      ...keys.map((key) => buildField([key], fieldLabel(key), defaults[key] ?? current[key], current[key], childLimits(setting.limits, key))),
    ],
  };
}

function markOptional(field: SettingField, mode: "all" | "entries", isRoot: boolean): SettingField {
  const optional = !isRoot && (mode === "all" || field.kind === "group" || field.kind === "map");

  if (field.kind === "group") {
    return { ...field, ...(optional ? { optional } : {}), children: field.children.map((child) => markOptional(child, mode, false)) };
  }

  // A map marks its own entries when they are built (its value spec carries the mode).
  return optional ? { ...field, optional } : field;
}

type SettingMetadata = Pick<PlatformSetting, "key" | "defaultValue" | "value" | "limits"> & Partial<Pick<PlatformSetting, "type" | "keySchema" | "unit">>;

function withUnit(field: SettingField, unit: string | null | undefined): SettingField {
  return unit && (field.kind === "number" || field.kind === "list") ? { ...field, unit } : field;
}

/**
 * Form of a setting from its registry metadata: the declared `type` decides the field (integer, number, boolean, string,
 * string-list, integer-list, map with its keySchema, object); without metadata the kind comes from the default value.
 */
export function buildSettingField(setting: SettingMetadata): SettingField {
  if (isAiUseCaseSetting(setting)) {
    return buildAiUseCaseField(setting);
  }

  const recordMode = RECORD_SETTINGS[setting.key] ?? null;
  const keySchema = setting.keySchema ?? null;
  let field: SettingField;

  if (setting.type === "map" && keySchema && keySchema.path === null) {
    field = buildMapField([], SETTING_FORM_COPY.rootLabel, keySchema, setting.defaultValue, setting.value, recordMode);
  } else if (setting.type && setting.type !== "object" && setting.type !== "map") {
    field = buildTypedField([], SETTING_FORM_COPY.rootLabel, setting.type, setting.defaultValue, setting.value, setting.limits);
  } else {
    field = buildField([], SETTING_FORM_COPY.rootLabel, setting.defaultValue, setting.value, setting.limits, keySchema, recordMode);
  }

  const marked = recordMode && field.kind !== "map" ? markOptional(field, recordMode, true) : field;

  return withUnit(marked, setting.unit);
}

function rangeError(value: number, limits: NumberLimits): string | null {
  const { min, max } = limits;
  const outside = (min !== null && value < min) || (max !== null && value > max);

  if (!outside) {
    return null;
  }

  if (min !== null && max !== null) {
    return SETTING_FORM_COPY.between(min, max);
  }

  return min !== null ? SETTING_FORM_COPY.atLeast(min) : SETTING_FORM_COPY.atMost(max ?? 0);
}

export function numberError(value: unknown, limits: NumberLimits): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return SETTING_FORM_COPY.number;
  }

  if (limits.integer && !Number.isInteger(value)) {
    return SETTING_FORM_COPY.integer;
  }

  return rangeError(value, limits);
}

function lengthError(length: number, limits: LengthLimits, message: (min: number | null, max: number | null) => string): string | null {
  const { minLength, maxLength } = limits;

  if ((minLength !== null && length < minLength) || (maxLength !== null && length > maxLength)) {
    return message(minLength, maxLength);
  }

  return null;
}

function textError(value: unknown, limits: LengthLimits): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return SETTING_FORM_COPY.required;
  }

  return limits.maxLength !== null && value.length > limits.maxLength ? SETTING_FORM_COPY.maxChars(limits.maxLength) : null;
}

function listError(field: ListField, value: unknown): string | null {
  if (!Array.isArray(value)) {
    return SETTING_FORM_COPY.required;
  }

  for (const [index, item] of value.entries()) {
    const itemError = field.itemKind === "number" ? numberError(item, field.itemLimits) : textError(item, { minLength: null, maxLength: null });

    if (itemError) {
      return SETTING_FORM_COPY.listItem(index, itemError);
    }
  }

  return lengthError(value.length, field.limits, SETTING_FORM_COPY.entries);
}

function multiSelectError(field: MultiSelectField, value: unknown): string | null {
  if (!Array.isArray(value)) {
    return SETTING_FORM_COPY.required;
  }

  if (!value.every((item) => field.options.includes(item as Primitive))) {
    return SETTING_FORM_COPY.options;
  }

  const missing = field.required.filter((item) => !value.includes(item));

  if (missing.length > 0) {
    return SETTING_FORM_COPY.mustInclude(missing.map(formatSettingValue).join(", "));
  }

  return lengthError(value.length, field.limits, SETTING_FORM_COPY.entries);
}

function chainErrors(field: ProviderChainField, root: unknown, errors: Record<string, string>): void {
  const chain = getAt(root, field.path);
  const models = getAt(root, field.modelsPath);
  const providers = Array.isArray(chain) ? chain.filter((item): item is string => typeof item === "string") : [];
  const lengthMessage = lengthError(providers.length, field.limits, SETTING_FORM_COPY.chainLength);

  if (lengthMessage) {
    errors[field.id] = lengthMessage;
  } else if (new Set(providers).size !== providers.length) {
    errors[field.id] = SETTING_FORM_COPY.chainRepeated;
  }

  for (const provider of providers) {
    const model = isRecord(models) ? models[provider] : undefined;

    if (typeof model !== "string" || model.trim() === "") {
      errors[modelErrorKey(provider)] = SETTING_FORM_COPY.model;
    }
  }
}

export function modelErrorKey(provider: string): string {
  return `${MODELS_KEY}.${provider}`;
}

function collectErrors(field: SettingField, root: unknown, errors: Record<string, string>): void {
  const value = getAt(root, field.path);
  let message: string | null = null;

  if (field.optional && value === undefined) {
    return;
  }

  switch (field.kind) {
    case "group":
      field.children.forEach((child) => collectErrors(child, root, errors));

      return;
    case "map":
      if (value !== undefined && !isRecord(value)) {
        errors[field.id] = SETTING_FORM_COPY.required;

        return;
      }

      mapKeys(field, root).forEach((key) => collectErrors(mapEntryField(field, key, root), root, errors));

      return;
    case "providerChain":
      chainErrors(field, root, errors);

      return;
    case "number":
      message = numberError(value, field.limits);
      break;
    case "boolean":
      message = typeof value === "boolean" ? null : SETTING_FORM_COPY.required;
      break;
    case "text":
      message = textError(value, field.limits);
      break;
    case "select":
      message = field.options.includes(value as Primitive) ? null : SETTING_FORM_COPY.option;
      break;
    case "multiSelect":
      message = multiSelectError(field, value);
      break;
    case "list":
      message = listError(field, value);
      break;
    case "json":
      message = value instanceof InvalidJsonDraft || value === undefined ? SETTING_FORM_COPY.json : null;
      break;
  }

  if (message) {
    errors[field.id] = message;
  }
}

export function validateSettingValue(field: SettingField, root: unknown): Record<string, string> {
  const errors: Record<string, string> = {};

  collectErrors(field, root, errors);

  return errors;
}

export function describeLimits(field: SettingField): string {
  const parts: string[] = [];

  switch (field.kind) {
    case "number":
    case "list": {
      const limits = field.kind === "number" ? field.limits : field.itemLimits;

      if (limits.min !== null) {
        parts.push(SETTING_FORM_COPY.limitMin(limits.min));
      }

      if (limits.max !== null) {
        parts.push(SETTING_FORM_COPY.limitMax(limits.max));
      }

      if (field.kind === "number") {
        parts.push(limits.integer ? SETTING_FORM_COPY.limitInteger : SETTING_FORM_COPY.limitDecimal);
      }

      if (field.kind === "list" && (field.limits.minLength !== null || field.limits.maxLength !== null)) {
        parts.push(SETTING_FORM_COPY.limitEntries(field.limits.minLength, field.limits.maxLength));
      }

      break;
    }
    case "select":
      parts.push(SETTING_FORM_COPY.limitAllowed(field.options.map(formatSettingValue).join(", ")));
      break;
    case "multiSelect":
      parts.push(SETTING_FORM_COPY.limitAllowed(field.options.map(formatSettingValue).join(", ")));

      if (field.required.length > 0) {
        parts.push(SETTING_FORM_COPY.limitRequired(field.required.map(formatSettingValue).join(", ")));
      }

      break;
    case "providerChain":
    case "text":
      if (field.limits.minLength !== null || field.limits.maxLength !== null) {
        parts.push(SETTING_FORM_COPY.limitEntries(field.limits.minLength, field.limits.maxLength));
      }

      break;
    case "map":
      if (field.allowedKeys) {
        parts.push(SETTING_FORM_COPY.limitKeys(field.allowedKeys.map((key) => fieldLabel(key)).join(", ")));
      }

      break;
    default:
      break;
  }

  if (parts.length === 0) {
    return SETTING_FORM_COPY.noLimits;
  }

  const text = parts.join(", ");

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function formatChain(field: ProviderChainField, root: unknown): string {
  const chain = getAt(root, field.path);
  const models = getAt(root, field.modelsPath);

  if (!Array.isArray(chain) || chain.length === 0) {
    return formatSettingValue(null);
  }

  return chain
    .map((provider) => {
      const model = isRecord(models) && typeof provider === "string" ? models[provider] : undefined;

      return typeof model === "string" && model ? `${String(provider)} (${model})` : String(provider);
    })
    .join(" → ");
}

function collectChanges(field: SettingField, before: unknown, after: unknown, prefix: string, changes: SettingChange[]): void {
  if (field.kind === "group") {
    const groupPrefix = field.path.length === 0 ? prefix : `${prefix}${field.label}${LABEL_SEPARATOR}`;

    field.children.forEach((child) => collectChanges(child, before, after, groupPrefix, changes));

    return;
  }

  if (field.kind === "map") {
    const mapPrefix = field.path.length === 0 ? prefix : `${prefix}${field.label}${LABEL_SEPARATOR}`;
    const keys = [...new Set([...mapKeys(field, before), ...mapKeys(field, after)])];

    for (const key of keys) {
      const previous = getAt(before, [...field.path, key]);
      const next = getAt(after, [...field.path, key]);

      if (previous !== undefined && next !== undefined) {
        collectChanges(mapEntryField(field, key, after), before, after, mapPrefix, changes);
      } else if (!valuesEqual(previous, next)) {
        changes.push({
          id: pathId([...field.path, key]),
          label: `${mapPrefix}${fieldLabel(key)}`,
          before: previous === undefined ? SETTING_FORM_COPY.noEntry : formatSettingValue(previous),
          after: next === undefined ? SETTING_FORM_COPY.noEntry : formatSettingValue(next),
          limits: describeLimits(field),
        });
      }
    }

    return;
  }

  const label = `${prefix}${field.label}`;

  if (field.kind === "providerChain") {
    const changed = !valuesEqual(getAt(before, field.path), getAt(after, field.path))
      || !valuesEqual(getAt(before, field.modelsPath), getAt(after, field.modelsPath));

    if (changed) {
      changes.push({ id: field.id, label, before: formatChain(field, before), after: formatChain(field, after), limits: describeLimits(field) });
    }

    return;
  }

  const previous = getAt(before, field.path);
  const next = getAt(after, field.path);

  if (!valuesEqual(previous, next)) {
    changes.push({ id: field.id, label, before: formatSettingValue(previous), after: formatSettingValue(next), limits: describeLimits(field) });
  }
}

export function diffSettingValues(field: SettingField, before: unknown, after: unknown): SettingChange[] {
  const changes: SettingChange[] = [];

  collectChanges(field, before, after, "", changes);

  return changes;
}

const REASON_TRANSLATIONS: readonly [RegExp, (match: RegExpMatchArray) => string][] = [
  [/^must be between (\S+) and (\S+)$/, (match) => `Debe estar entre ${match[1] ?? ""} y ${match[2] ?? ""}.`],
  [/^must be an integer$/, () => SETTING_FORM_COPY.integer],
  [/^must be a number$/, () => SETTING_FORM_COPY.number],
  [/^must be a boolean$/, () => SETTING_FORM_COPY.required],
  [/^must be a non-empty string$/, () => SETTING_FORM_COPY.required],
  [/^must have at most (\d+) characters$/, (match) => SETTING_FORM_COPY.maxChars(Number(match[1]))],
  [/^must have between (\d+) and (\d+) entries$/, (match) => SETTING_FORM_COPY.entries(Number(match[1]), Number(match[2]))],
  [/^must be one of (.+)$/, (match) => `Debe ser uno de: ${match[1] ?? ""}.`],
  [/^must include (.+)$/, (match) => SETTING_FORM_COPY.mustInclude(match[1] ?? "")],
  [/^must not repeat a /, () => "No puede tener valores repetidos."],
  [/^needs a model for (.+)$/, (match) => `Falta el modelo de ${match[1] ?? ""}.`],
  [/^is not a known field$/, () => "No es un campo conocido."],
  [/^must be an? (object|array)$/, () => "El formato no es válido."],
];

export function translateReason(reason: string): string | null {
  for (const [pattern, translate] of REASON_TRANSLATIONS) {
    const match = reason.match(pattern);

    if (match) {
      return translate(match);
    }
  }

  return null;
}

function collectIds(field: SettingField, ids: Set<string>, root: unknown): boolean {
  if (field.kind === "group") {
    return field.children.reduce((hasChain, child) => collectIds(child, ids, root) || hasChain, false);
  }

  ids.add(field.id);

  if (field.kind === "map") {
    // The map itself takes the errors of a key it no longer has; each present key adds its own fields.
    return mapKeys(field, root).reduce((hasChain, key) => collectIds(mapEntryField(field, key, root), ids, root) || hasChain, false);
  }

  return field.kind === "providerChain";
}

function normalizeServerPath(path: string): string {
  if (path === "value") {
    return "";
  }

  if (path.startsWith("value.")) {
    return path.slice("value.".length);
  }

  return path.startsWith("value[") ? path.slice("value".length) : path;
}

function parentPath(path: string): string | null {
  if (path === "") {
    return null;
  }

  if (/\[\d+\]$/.test(path)) {
    return path.replace(/\[\d+\]$/, "");
  }

  const dot = path.lastIndexOf(".");

  return dot >= 0 ? path.slice(0, dot) : "";
}

export function resolveServerPath(field: SettingField, serverPath: string, root: unknown = undefined): string | null {
  const ids = new Set<string>();
  const hasChain = collectIds(field, ids, root);
  let candidate: string | null = normalizeServerPath(serverPath);

  while (candidate !== null) {
    if (ids.has(candidate)) {
      return candidate;
    }

    if (hasChain && candidate.startsWith(`${MODELS_KEY}.`)) {
      return candidate;
    }

    if (hasChain && candidate === MODELS_KEY) {
      return CHAIN_KEY;
    }

    candidate = parentPath(candidate);
  }

  return null;
}

function reasonOf(details: unknown): string | null {
  if (!isRecord(details)) {
    return null;
  }

  return typeof details.reason === "string" ? details.reason : null;
}

function isValueField(settingKey: string, serverField: string): boolean {
  const inValue = (prefix: string) => serverField === prefix || serverField.startsWith(`${prefix}.`) || serverField.startsWith(`${prefix}[`);

  return inValue("value") || (settingKey !== "" && inValue(settingKey));
}

/** Path inside the value of a server field: `ai.quotas.STUDENT.*` → `STUDENT.*`, the key itself or `value` → "" (the root). */
export function settingRelativePath(settingKey: string, serverField: string): string {
  if (serverField === settingKey) {
    return "";
  }

  if (serverField.startsWith(`${settingKey}.`)) {
    return serverField.slice(settingKey.length + 1);
  }

  return serverField.startsWith(`${settingKey}[`) ? serverField.slice(settingKey.length) : serverField;
}

/**
 * Places the per-field errors of a 400/422 (`data.errors: [{ field, message }]`, the field is the setting key or the key
 * plus a nested path) under the matching field of the draft; an error that matches no field goes to the card. Without
 * per-field errors, the legacy `details.reason` ("<path> <reason>") is parsed.
 */
export function mapSettingServerError(field: SettingField, error: unknown, root: unknown = undefined, settingKey = ""): ServerErrorMapping {
  const apiError = toApiError(error);
  const fieldErrors = serverFieldErrors(apiError);

  if (fieldErrors.length > 0) {
    const mapped: Record<string, string> = {};
    const unmatched: string[] = [];

    for (const item of fieldErrors) {
      // Fields outside the value (e.g. `version`) belong to the card.
      const target = isValueField(settingKey, item.field)
        ? resolveServerPath(field, settingKey ? settingRelativePath(settingKey, item.field) : item.field, root)
        : null;

      if (target === null) {
        unmatched.push(item.message);
      } else if (!(target in mapped)) {
        mapped[target] = item.message;
      }
    }

    return { fieldErrors: mapped, cardMessage: unmatched.length > 0 ? unmatched.join(" ") : null };
  }

  if (apiError.code === PROVIDER_NOT_CONFIGURED_CODE) {
    const message = getAdminConsoleErrorMessage(apiError);
    const target = resolveServerPath(field, CHAIN_KEY);

    return target === null ? { fieldErrors: {}, cardMessage: message } : { fieldErrors: { [target]: message }, cardMessage: null };
  }

  const reason = reasonOf(apiError.details);

  if (!reason) {
    return { fieldErrors: {}, cardMessage: getAdminConsoleErrorMessage(apiError) };
  }

  const space = reason.indexOf(" ");
  const serverPath = space >= 0 ? reason.slice(0, space) : reason;
  const detail = space >= 0 ? reason.slice(space + 1) : "";
  const message = translateReason(detail) ?? SETTING_FORM_COPY.invalidValue(reason);
  const target = resolveServerPath(field, serverPath, root);

  return target === null ? { fieldErrors: {}, cardMessage: message } : { fieldErrors: { [target]: message }, cardMessage: null };
}
