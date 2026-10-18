/*
* Funcionalidad: Setting form generator tests
* Descripción: buildSettingField generates every field kind from the metadata (number with min/max/integer, boolean, string, string with allowedValues, array with allowedValues and required, plain array, object as a recursive group with per-field and inherited limits, ai.useCase.* provider chain, unmappable shapes as JSON); validateSettingValue reports the hard limits (range, integer, not a number, allowed and required values, chain length, empty model, invalid JSON) and nothing for valid values; describeLimits, diffSettingValues and mapSettingServerError (422 paths `value`, `providerChain[0]`, `models.x`, nested fields, unknown paths on the card, providers without credentials). Depends on vitest and the admin console entities. v1.1 (O4a review): record-like settings (ai.quotas optional quota numbers and entries; ai.prices optional providers/models with required prices when present) and removeAt. v1.2 (closure B2): the declared types of the registry (integer with unit, string, string-list, integer-list), a map built from its key schema (validation per key, allowed keys in the limits, new keys empty for nested maps and seeded from the sample for objects, added/removed keys in the diff) and the per-field server errors (`data.errors`) mapped under the draft fields with the rest on the card.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { InvalidJsonDraft, removeAt, setAt } from "./platform-setting.entity";
import {
  buildSettingField,
  describeLimits,
  diffSettingValues,
  mapEntryField,
  mapSettingServerError,
  newMapEntryValue,
  resolveServerPath,
  settingRelativePath,
  validateSettingValue,
} from "./setting-form.entity";
import type { GroupField, SettingField } from "./setting-form.entity";

type Meta = { key: string, defaultValue: unknown, value?: unknown, limits?: Record<string, unknown> };

function build({ key, defaultValue, value = defaultValue, limits = {} }: Meta): SettingField {
  return buildSettingField({ key, defaultValue, value, limits });
}

const AI_USE_CASE: Meta = {
  key: "ai.useCase.FREE_CHAT",
  defaultValue: { providerChain: ["gemini"], models: { gemini: "gemini-2.0-flash" }, timeoutMs: 30000, maxOutputTokens: 1024, temperature: 0.7 },
  limits: {
    providerChain: { minLength: 1, maxLength: 3, requiresCredentials: true },
    timeoutMs: { min: 1000, max: 120000, integer: true },
    maxOutputTokens: { min: 1, max: 32768, integer: true },
    temperature: { min: 0, max: 2, integer: false },
  },
};

function children(field: SettingField): readonly SettingField[] {
  expect(field.kind).toBe("group");

  return (field as GroupField).children;
}

describe("buildSettingField", () => {
  it("maps a number default to a numeric field with its limits", () => {
    const field = build({ key: "evaluation.passingGrade", defaultValue: 3, limits: { min: 0, max: 5, integer: false } });

    expect(field).toMatchObject({ kind: "number", id: "", path: [], limits: { min: 0, max: 5, integer: false } });
  });

  it("maps a boolean default to a switch", () => {
    expect(build({ key: "ai.tutor.topicCheck.enabled", defaultValue: true })).toMatchObject({ kind: "boolean" });
  });

  it("maps a string to a text field, or to a select when the limits list the allowed values", () => {
    expect(build({ key: "x.mode", defaultValue: "fast" })).toMatchObject({ kind: "text" });
    expect(build({ key: "x.mode", defaultValue: "fast", limits: { allowedValues: ["fast", "slow"] } })).toMatchObject({
      kind: "select",
      options: ["fast", "slow"],
    });
  });

  it("maps an array of primitives to a multi-select with allowed and required values, or to a list editor", () => {
    expect(build({ key: "simulation.allowedTimeMultipliers", defaultValue: [1, 2], limits: { allowedValues: [1, 2, 5, 10], required: [1] } })).toMatchObject({
      kind: "multiSelect",
      options: [1, 2, 5, 10],
      required: [1],
    });
    expect(build({ key: "x.tags", defaultValue: ["a", "b"], limits: { maxLength: 4 } })).toMatchObject({
      kind: "list",
      itemKind: "string",
      limits: { minLength: null, maxLength: 4 },
    });
  });

  it("maps an object to a recursive group with per-field limits and inherits the parent limits for dynamic keys", () => {
    const rubric = build({
      key: "simulation.rubric.defaultThresholds",
      defaultValue: { targetsReached: 0.8, timeToStabilizeSeconds: 60 },
      limits: { targetsReached: { min: 0.01, max: 1, integer: false }, timeToStabilizeSeconds: { min: 1, max: 3600, integer: false } },
    });

    expect(children(rubric).map((child) => [child.id, child.kind, child.label])).toEqual([
      ["targetsReached", "number", "Objetivos alcanzados (fracción)"],
      ["timeToStabilizeSeconds", "number", "Tiempo para estabilizar (s)"],
    ]);
    expect(children(rubric)[0]).toMatchObject({ limits: { min: 0.01, max: 1 } });

    const quotas = build({
      key: "ai.quotas",
      defaultValue: { STUDENT: { "*": { requestsPerDay: 50 } } },
      limits: { roles: ["STUDENT"], requestsPerDay: { min: 0, max: 100000, integer: true } },
    });
    const leaf = children(children(children(quotas)[0] as SettingField)[0] as SettingField)[0];

    expect(leaf).toMatchObject({ id: "STUDENT.*.requestsPerDay", kind: "number", limits: { min: 0, max: 100000, integer: true } });
  });

  it("keeps keys that only the current value has", () => {
    const field = build({ key: "ai.prices", defaultValue: { gemini: { a: { inputPer1kUsd: 0 } } }, value: { gemini: { a: { inputPer1kUsd: 0 } }, openai: { b: { inputPer1kUsd: 1 } } } });

    expect(children(field).map((child) => child.id)).toEqual(["gemini", "openai"]);
  });

  it("gives ai.useCase settings the provider chain field plus the generic numeric fields", () => {
    const field = build(AI_USE_CASE);

    expect(children(field).map((child) => [child.id, child.kind])).toEqual([
      ["providerChain", "providerChain"],
      ["timeoutMs", "number"],
      ["maxOutputTokens", "number"],
      ["temperature", "number"],
    ]);
    expect(children(field)[0]).toMatchObject({ limits: { minLength: 1, maxLength: 3 } });
    expect(children(field)[1]).toMatchObject({ limits: { min: 1000, max: 120000, integer: true } });
  });

  it("falls back to a JSON field for shapes it cannot map", () => {
    expect(build({ key: "x.rules", defaultValue: [{ a: 1 }] })).toMatchObject({ kind: "json" });
    expect(build({ key: "x.map", defaultValue: {} })).toMatchObject({ kind: "json" });
    expect(build({ key: "x.null", defaultValue: null })).toMatchObject({ kind: "json" });
  });
});

describe("validateSettingValue", () => {
  const grade = build({ key: "evaluation.passingGrade", defaultValue: 3, limits: { min: 0, max: 5, integer: false } });
  const grace = build({ key: "evaluation.submitGraceSeconds", defaultValue: 30, limits: { min: 0, max: 600, integer: true } });

  it("accepts values within the limits", () => {
    expect(validateSettingValue(grade, 4.5)).toEqual({});
    expect(validateSettingValue(grace, 600)).toEqual({});
  });

  it("reports out of range, non integer and non numeric values on the field", () => {
    expect(validateSettingValue(grade, 7)).toEqual({ "": "Debe estar entre 0 y 5." });
    expect(validateSettingValue(grace, 1.5)).toEqual({ "": "Debe ser un número entero." });
    expect(validateSettingValue(grace, Number.NaN)).toEqual({ "": "Ingresa un número." });
  });

  it("checks allowed and required values of a multi-select", () => {
    const field = build({ key: "simulation.allowedTimeMultipliers", defaultValue: [1, 2], limits: { allowedValues: [1, 2, 5], required: [1] } });

    expect(validateSettingValue(field, [1, 5])).toEqual({});
    expect(validateSettingValue(field, [2])).toEqual({ "": "Debe incluir 1." });
    expect(validateSettingValue(field, [1, 3])).toEqual({ "": "Elige solo valores permitidos." });
  });

  it("checks nested fields by their path", () => {
    const field = build({ key: "simulation.rubric.defaultThresholds", defaultValue: { targetsReached: 0.8 }, limits: { targetsReached: { min: 0.01, max: 1, integer: false } } });

    expect(validateSettingValue(field, { targetsReached: 2 })).toEqual({ targetsReached: "Debe estar entre 0.01 y 1." });
  });

  it("treats the quota numbers and entries of ai.quotas as optional (missing means unlimited)", () => {
    const quotas = build({
      key: "ai.quotas",
      defaultValue: { STUDENT: { "*": { requestsPerDay: 50, tokensPerDay: 20000 } }, TEACHER: { "*": { requestsPerDay: 200 } } },
      limits: { requestsPerDay: { min: 0, max: 100000, integer: true }, tokensPerDay: { min: 0, max: 10000000, integer: true } },
    });

    expect(validateSettingValue(quotas, { STUDENT: { "*": { requestsPerDay: 50 } } })).toEqual({});
    expect(validateSettingValue(quotas, { STUDENT: { "*": { requestsPerDay: -1 } } })).toEqual({ "STUDENT.*.requestsPerDay": "Debe estar entre 0 y 100000." });
    expect(validateSettingValue(quotas, { STUDENT: { "*": { tokensPerDay: Number.NaN } } })).toEqual({ "STUDENT.*.tokensPerDay": "Ingresa un número." });
  });

  it("lets ai.prices omit a provider or model of the default but needs both prices of a present model", () => {
    const prices = build({
      key: "ai.prices",
      defaultValue: { gemini: { flash: { inputPer1kUsd: 0.1, outputPer1kUsd: 0.4 } }, openai: { mini: { inputPer1kUsd: 0.15, outputPer1kUsd: 0.6 } } },
      limits: { inputPer1kUsd: { min: 0, max: 1000, integer: false }, outputPer1kUsd: { min: 0, max: 1000, integer: false } },
    });

    expect(validateSettingValue(prices, { gemini: { flash: { inputPer1kUsd: 0.1, outputPer1kUsd: 0.4 } } })).toEqual({});
    expect(validateSettingValue(prices, { gemini: { flash: { inputPer1kUsd: 0.1 } } })).toEqual({ "gemini.flash.outputPer1kUsd": "Ingresa un número." });
  });

  it("removes a key by its path without touching the rest", () => {
    const value = { STUDENT: { "*": { requestsPerDay: 50, tokensPerDay: 100 } } };

    expect(removeAt(value, ["STUDENT", "*", "tokensPerDay"])).toEqual({ STUDENT: { "*": { requestsPerDay: 50 } } });
    expect(removeAt(value, ["TEACHER", "*", "tokensPerDay"])).toBe(value);
    expect(value.STUDENT["*"].tokensPerDay).toBe(100);
  });

  it("checks the chain length, repeated providers and an empty model", () => {
    const field = build(AI_USE_CASE);
    const value = AI_USE_CASE.defaultValue;

    expect(validateSettingValue(field, value)).toEqual({});
    expect(validateSettingValue(field, setAt(value, ["providerChain"], []))).toEqual({ providerChain: "La cadena debe tener entre 1 y 3 proveedores." });
    expect(validateSettingValue(field, setAt(value, ["providerChain"], ["gemini", "gemini"]))).toEqual({ providerChain: "No repitas proveedores en la cadena." });
    expect(validateSettingValue(field, setAt(value, ["models", "gemini"], " "))).toEqual({ "models.gemini": "Ingresa el modelo de este proveedor." });
    expect(validateSettingValue(field, setAt(value, ["temperature"], 3))).toEqual({ temperature: "Debe estar entre 0 y 2." });
  });

  it("rejects a JSON field whose text does not parse", () => {
    const field = build({ key: "x.rules", defaultValue: [{ a: 1 }] });

    expect(validateSettingValue(field, new InvalidJsonDraft("{"))).toEqual({ "": "El JSON no es válido." });
  });
});

describe("describeLimits and diffSettingValues", () => {
  it("describes the hard limits of a field", () => {
    expect(describeLimits(build({ key: "a.b", defaultValue: 1, limits: { min: 1, max: 60, integer: true } }))).toBe("Mín. 1, máx. 60, entero");
    expect(describeLimits(build({ key: "a.b", defaultValue: true }))).toBe("Sin límites declarados");
  });

  it("lists every changed field with its previous value, new value and limits", () => {
    const field = build({ key: "commands.safety.maxPeep", defaultValue: 20, limits: { min: 0, max: 30, integer: false } });

    expect(diffSettingValues(field, 20, 25)).toEqual([{ id: "", label: "Valor", before: "20", after: "25", limits: "Mín. 0, máx. 30, decimal" }]);
    expect(diffSettingValues(field, 20, 20)).toEqual([]);
  });
});

describe("mapSettingServerError", () => {
  const unprocessable = (code: string, details: unknown) => new ApiError({ code, message: code, status: 422, details });

  it("places a scalar 422 on the root field, translated", () => {
    const field = build({ key: "evaluation.passingGrade", defaultValue: 3, limits: { min: 0, max: 10 } });

    expect(mapSettingServerError(field, unprocessable("platform-settings.hard_limit_exceeded", { key: "evaluation.passingGrade", reason: "value must be between 0 and 5" })))
      .toEqual({ fieldErrors: { "": "Debe estar entre 0 y 5." }, cardMessage: null });
  });

  it("places chain, model and nested paths on their fields and unknown paths on the card", () => {
    const field = build(AI_USE_CASE);

    expect(resolveServerPath(field, "providerChain[0]")).toBe("providerChain");
    expect(resolveServerPath(field, "models.gemini")).toBe("models.gemini");
    expect(resolveServerPath(field, "models")).toBe("providerChain");
    expect(resolveServerPath(field, "timeoutMs")).toBe("timeoutMs");
    expect(mapSettingServerError(field, unprocessable("platform-settings.invalid_value", { key: "k", reason: "value.extra is not a known field" })))
      .toEqual({ fieldErrors: {}, cardMessage: "No es un campo conocido." });
  });

  it("shows providers without credentials on the chain", () => {
    const field = build(AI_USE_CASE);

    expect(mapSettingServerError(field, unprocessable("platform-settings.ai_provider_not_configured", { providers: ["openai"] })))
      .toEqual({ fieldErrors: { providerChain: "La cadena incluye proveedores sin credenciales: openai." }, cardMessage: null });
  });
});

describe("registry metadata (closure B2)", () => {
  const unprocessable = (code: string, details: unknown) => new ApiError({ code, message: code, status: 422, details });
  const QUOTA_SCHEMA = {
    path: null,
    keyLabel: "Rol",
    allowedKeys: ["STUDENT", "TEACHER", "ADMIN"],
    valueType: "map" as const,
    valueLimits: null,
    valueKeySchema: {
      path: null,
      keyLabel: "Caso de uso",
      allowedKeys: ["*", "FREE_CHAT"],
      valueType: "object" as const,
      valueLimits: { requestsPerDay: { min: 0, max: 100, integer: true } },
      valueKeySchema: null,
    },
  };
  const QUOTAS = {
    key: "ai.quotas",
    type: "map" as const,
    keySchema: QUOTA_SCHEMA,
    defaultValue: { STUDENT: { "*": { requestsPerDay: 50, tokensPerDay: 20000 } } },
    limits: {},
  };

  it("builds the declared types: integer, number with its unit, string, string-list and integer-list", () => {
    expect(buildSettingField({ key: "a", defaultValue: 3, value: 3, limits: { min: 0 }, type: "integer", unit: "s" }))
      .toMatchObject({ kind: "number", limits: { min: 0, integer: true }, unit: "s" });
    expect(buildSettingField({ key: "a", defaultValue: "", value: "", limits: {}, type: "string" })).toMatchObject({ kind: "text" });
    expect(buildSettingField({ key: "a", defaultValue: [], value: [], limits: {}, type: "string-list" })).toMatchObject({ kind: "list", itemKind: "string" });
    expect(buildSettingField({ key: "a", defaultValue: [], value: [], limits: { min: 1 }, type: "integer-list" }))
      .toMatchObject({ kind: "list", itemKind: "number", itemLimits: { min: 1, integer: true } });
  });

  it("builds a map from its key schema and validates every key of the draft", () => {
    const field = buildSettingField({ ...QUOTAS, value: QUOTAS.defaultValue });

    expect(field).toMatchObject({ kind: "map", keyLabel: "Rol", allowedKeys: ["STUDENT", "TEACHER", "ADMIN"] });
    expect(validateSettingValue(field, { STUDENT: { "*": { requestsPerDay: 500 } } })).toEqual({ "STUDENT.*.requestsPerDay": "Debe estar entre 0 y 100." });
    // ai.quotas entries are optional: a missing quota number is unlimited.
    expect(validateSettingValue(field, { TEACHER: { FREE_CHAT: {} } })).toEqual({});
    expect(describeLimits(field)).toBe("Claves permitidas: Estudiante, Docente, Administrador");
  });

  it("starts a new key of a nested map empty and a new key of an object map from the sample value", () => {
    const field = buildSettingField({ ...QUOTAS, value: QUOTAS.defaultValue });

    if (field.kind !== "map") {
      throw new Error("map expected");
    }

    expect(newMapEntryValue(field)).toEqual({});
    const inner = mapEntryField(field, "STUDENT", QUOTAS.defaultValue);

    expect(inner.kind).toBe("map");
    expect(inner.kind === "map" ? newMapEntryValue(inner) : null).toEqual({ requestsPerDay: 50, tokensPerDay: 20000 });
  });

  it("lists added and removed keys in the diff", () => {
    const field = buildSettingField({ ...QUOTAS, value: QUOTAS.defaultValue });

    expect(diffSettingValues(field, { STUDENT: { "*": { requestsPerDay: 50 } } }, { TEACHER: { "*": { requestsPerDay: 10 } } }).map((change) => change.label))
      .toEqual(["Estudiante", "Docente"]);
  });

  it("places the per-field server errors under the field of the draft and the rest on the card", () => {
    const value = { STUDENT: { "*": { requestsPerDay: 50 } } };
    const field = buildSettingField({ ...QUOTAS, value });
    const error = unprocessable("platform-settings.hard_limit_exceeded", {
      errors: [
        { field: "ai.quotas.STUDENT.*.requestsPerDay", message: "Debe ser como máximo 100." },
        { field: "ai.quotas.GHOST.x", message: "Clave desconocida." },
        { field: "version", message: "Versión inválida." },
      ],
    });

    expect(mapSettingServerError(field, error, value, "ai.quotas")).toEqual({
      fieldErrors: { "STUDENT.*.requestsPerDay": "Debe ser como máximo 100.", "": "Clave desconocida." },
      cardMessage: "Versión inválida.",
    });
    expect(settingRelativePath("ai.quotas", "ai.quotas")).toBe("");
    expect(settingRelativePath("ai.useCase.X", "ai.useCase.X.providerChain[0]")).toBe("providerChain[0]");
  });
});
