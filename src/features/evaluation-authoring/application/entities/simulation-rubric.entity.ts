/*
* Funcionalidad: Simulation rubric (builder)
* Descripción: Pure rules of the rubric of a SIMULATION question, mirroring the backend value object (ventylab-server src/features/evaluation/domain/value-objects/simulation-rubric.ts): `{criteria:[{parameter, expectedValue, min?, max?, priority?}], justification?}` with numeric parameters tidalVolume, respiratoryRate, peep, fio2, maxPressure and text parameters ventilationMode, iERatio; at least one criterion, no duplicated parameter, min and max together or neither with min <= expectedValue <= max, no range on text parameters, priority CRITICO, IMPORTANTE or OPCIONAL (default OPCIONAL), justification a string. validateSimulationRubric applies the same rules in the same order and returns typed issues with Spanish messages; parseBackendRubricError translates the English details the backend sends in a readiness issue. Also the editable draft of the rubric (strings per field, stable client keys), its conversion to the value sent to the backend and back, and the Spanish labels. The backend rubric has no weights, thresholds or AI-assist policy, so none are offered. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type RubricNumericParameter = "tidalVolume" | "respiratoryRate" | "peep" | "fio2" | "maxPressure";
export type RubricTextParameter = "ventilationMode" | "iERatio";
export type RubricParameter = RubricNumericParameter | RubricTextParameter;
export type RubricPriority = "CRITICO" | "IMPORTANTE" | "OPCIONAL";

export const RUBRIC_NUMERIC_PARAMETERS: readonly RubricNumericParameter[] = ["tidalVolume", "respiratoryRate", "peep", "fio2", "maxPressure"];
export const RUBRIC_TEXT_PARAMETERS: readonly RubricTextParameter[] = ["ventilationMode", "iERatio"];
export const RUBRIC_PARAMETERS: readonly RubricParameter[] = [...RUBRIC_NUMERIC_PARAMETERS, ...RUBRIC_TEXT_PARAMETERS];
export const RUBRIC_PRIORITIES: readonly RubricPriority[] = ["CRITICO", "IMPORTANTE", "OPCIONAL"];
export const DEFAULT_RUBRIC_PRIORITY: RubricPriority = "OPCIONAL";

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const RUBRIC_PARAMETER_LABELS: Readonly<Record<RubricParameter, string>> = {
  tidalVolume: "Volumen tidal (mL)",
  respiratoryRate: "Frecuencia respiratoria (rpm)",
  peep: "PEEP (cmH2O)",
  fio2: "FiO2 (%)",
  maxPressure: "Presión máxima (cmH2O)",
  ventilationMode: "Modo ventilatorio",
  iERatio: "Relación I:E",
};

export const RUBRIC_PRIORITY_LABELS: Readonly<Record<RubricPriority, string>> = {
  CRITICO: "Crítico",
  IMPORTANTE: "Importante",
  OPCIONAL: "Opcional",
};

export type RubricIssueCode =
  | "not_object"
  | "criteria_required"
  | "criterion_not_object"
  | "parameter_unsupported"
  | "parameter_duplicated"
  | "priority_invalid"
  | "text_expected_required"
  | "text_range_not_allowed"
  | "numeric_expected_required"
  | "range_incomplete"
  | "range_inverted"
  | "expected_out_of_range"
  | "justification_not_string";

// index: 0-based criterion position, null for rubric-level issues.
export type RubricIssue = { code: RubricIssueCode, index: number | null };

const CRITERION_MESSAGES: Readonly<Record<RubricIssueCode, string>> = {
  not_object: "La rúbrica no es válida.",
  criteria_required: "La rúbrica necesita al menos un criterio.",
  criterion_not_object: "el criterio no es válido.",
  parameter_unsupported: "elige un parámetro.",
  parameter_duplicated: "el parámetro ya está en otro criterio.",
  priority_invalid: "la prioridad debe ser Crítico, Importante u Opcional.",
  text_expected_required: "escribe el valor esperado.",
  text_range_not_allowed: "los parámetros de texto no admiten mínimo ni máximo.",
  numeric_expected_required: "el valor esperado debe ser un número.",
  range_incomplete: "define el mínimo y el máximo, o ninguno de los dos.",
  range_inverted: "el mínimo no puede ser mayor que el máximo.",
  expected_out_of_range: "el valor esperado debe estar entre el mínimo y el máximo.",
  justification_not_string: "La justificación debe ser texto.",
};

export function rubricIssueMessage(issue: RubricIssue): string {
  const message = CRITERION_MESSAGES[issue.code];

  return issue.index === null ? message : `Criterio ${issue.index + 1}: ${message}`;
}

export type RubricValidation = { valid: boolean, issues: RubricIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isNumericParameter(parameter: string): parameter is RubricNumericParameter {
  return (RUBRIC_NUMERIC_PARAMETERS as readonly string[]).includes(parameter);
}

export function isTextParameter(parameter: string): parameter is RubricTextParameter {
  return (RUBRIC_TEXT_PARAMETERS as readonly string[]).includes(parameter);
}

function isPriority(value: unknown): value is RubricPriority {
  return typeof value === "string" && (RUBRIC_PRIORITIES as readonly string[]).includes(value);
}

function rangeIssue(raw: Record<string, unknown>, expectedValue: number): RubricIssueCode | null {
  if (raw.min === undefined && raw.max === undefined) {
    return null;
  }

  if (!isFiniteNumber(raw.min) || !isFiniteNumber(raw.max)) {
    return "range_incomplete";
  }

  if (raw.min > raw.max) {
    return "range_inverted";
  }

  return expectedValue < raw.min || expectedValue > raw.max ? "expected_out_of_range" : null;
}

function criterionIssue(raw: unknown, seen: Set<string>): RubricIssueCode | null {
  if (!isRecord(raw)) {
    return "criterion_not_object";
  }

  const parameter = raw.parameter;

  if (typeof parameter !== "string" || (!isNumericParameter(parameter) && !isTextParameter(parameter))) {
    return "parameter_unsupported";
  }

  if (seen.has(parameter)) {
    return "parameter_duplicated";
  }

  seen.add(parameter);

  if (raw.priority !== undefined && !isPriority(raw.priority)) {
    return "priority_invalid";
  }

  if (isTextParameter(parameter)) {
    if (typeof raw.expectedValue !== "string" || raw.expectedValue.trim() === "") {
      return "text_expected_required";
    }

    return raw.min !== undefined || raw.max !== undefined ? "text_range_not_allowed" : null;
  }

  if (!isFiniteNumber(raw.expectedValue)) {
    return "numeric_expected_required";
  }

  return rangeIssue(raw, raw.expectedValue);
}

// Same rules and order as the backend validateSimulationRubric.
export function validateSimulationRubric(raw: unknown): RubricValidation {
  if (!isRecord(raw)) {
    return { valid: false, issues: [{ code: "not_object", index: null }] };
  }

  if (!Array.isArray(raw.criteria) || raw.criteria.length === 0) {
    return { valid: false, issues: [{ code: "criteria_required", index: null }] };
  }

  const seen = new Set<string>();
  const issues: RubricIssue[] = [];

  raw.criteria.forEach((item: unknown, index: number) => {
    const code = criterionIssue(item, seen);

    if (code) {
      issues.push({ code, index });
    }
  });

  if (raw.justification !== undefined && typeof raw.justification !== "string") {
    issues.push({ code: "justification_not_string", index: null });
  }

  return { valid: issues.length === 0, issues };
}

const BACKEND_RUBRIC_ERRORS: ReadonlyArray<readonly [RegExp, RubricIssueCode]> = [
  [/^rubric must be an object$/, "not_object"],
  [/^criteria must be a non-empty array$/, "criteria_required"],
  [/^justification must be a string$/, "justification_not_string"],
  [/must be an object$/, "criterion_not_object"],
  [/\.parameter is not supported$/, "parameter_unsupported"],
  [/\.parameter is duplicated$/, "parameter_duplicated"],
  [/\.priority must be one of/, "priority_invalid"],
  [/\.expectedValue must be a non-empty string$/, "text_expected_required"],
  [/ ranges are only allowed for numeric parameters$/, "text_range_not_allowed"],
  [/\.expectedValue must be a finite number$/, "numeric_expected_required"],
  [/ must define both min and max or neither$/, "range_incomplete"],
  [/\.min must not be greater than max$/, "range_inverted"],
  [/\.expectedValue must be within min and max$/, "expected_out_of_range"],
];

// Translates one English detail of a backend invalid_rubric issue; null when it is not recognized.
export function parseBackendRubricError(detail: string): RubricIssue | null {
  const match = BACKEND_RUBRIC_ERRORS.find(([pattern]) => pattern.test(detail));

  if (!match) {
    return null;
  }

  const index = /^criteria\[(\d+)\]/.exec(detail);

  return { code: match[1], index: index ? Number(index[1]) : null };
}

export type CriterionDraft = {
  key: string
  // "" until a parameter is chosen.
  parameter: RubricParameter | ""
  expectedValue: string
  min: string
  max: string
  priority: RubricPriority
};

export type RubricDraft = {
  criteria: CriterionDraft[]
  justification: string
};

export function emptyRubricDraft(): RubricDraft {
  return { criteria: [], justification: "" };
}

function fieldText(value: unknown): string {
  return typeof value === "number" || typeof value === "string" ? String(value) : "";
}

export function rubricDraftFrom(raw: unknown): RubricDraft {
  if (!isRecord(raw)) {
    return emptyRubricDraft();
  }

  const criteria = Array.isArray(raw.criteria) ? raw.criteria : [];

  return {
    criteria: criteria.map((item: unknown, index: number) => {
      const criterion = isRecord(item) ? item : {};
      const parameter = typeof criterion.parameter === "string" && (RUBRIC_PARAMETERS as readonly string[]).includes(criterion.parameter)
        ? (criterion.parameter as RubricParameter)
        : "";

      return {
        key: `criterion-${index}`,
        parameter,
        expectedValue: fieldText(criterion.expectedValue),
        min: fieldText(criterion.min),
        max: fieldText(criterion.max),
        priority: isPriority(criterion.priority) ? criterion.priority : DEFAULT_RUBRIC_PRIORITY,
      };
    }),
    justification: typeof raw.justification === "string" ? raw.justification : "",
  };
}

// A number when the text is one, otherwise the trimmed text (the validator then reports it).
function toNumberOrText(value: string): number | string {
  const trimmed = value.trim().replace(",", ".");
  const parsed = Number(trimmed);

  return trimmed !== "" && Number.isFinite(parsed) ? parsed : value.trim();
}

function toCriterionValue(criterion: CriterionDraft): Record<string, unknown> {
  const value: Record<string, unknown> = { parameter: criterion.parameter };
  const numeric = criterion.parameter !== "" && isNumericParameter(criterion.parameter);

  value.expectedValue = numeric ? toNumberOrText(criterion.expectedValue) : criterion.expectedValue.trim();

  if (criterion.min.trim() !== "") {
    value.min = toNumberOrText(criterion.min);
  }

  if (criterion.max.trim() !== "") {
    value.max = toNumberOrText(criterion.max);
  }

  value.priority = criterion.priority;

  return value;
}

// The value sent to the backend; null (no rubric) when the draft is empty.
export function toRubricValue(draft: RubricDraft): Record<string, unknown> | null {
  const justification = draft.justification.trim();

  if (draft.criteria.length === 0 && justification === "") {
    return null;
  }

  return {
    criteria: draft.criteria.map(toCriterionValue),
    ...(justification === "" ? {} : { justification }),
  };
}

export function sameRubric(draft: RubricDraft, stored: unknown): boolean {
  return JSON.stringify(toRubricValue(draft)) === JSON.stringify(toRubricValue(rubricDraftFrom(stored)));
}

// Issues of a draft that has content (an empty draft means "no rubric yet").
export function rubricDraftIssues(draft: RubricDraft): RubricIssue[] {
  const value = toRubricValue(draft);

  return value === null ? [] : validateSimulationRubric(value).issues;
}

export function addCriterionDraft(draft: RubricDraft, key: string): RubricDraft {
  const used = new Set(draft.criteria.map((criterion) => criterion.parameter));
  const parameter = RUBRIC_PARAMETERS.find((candidate) => !used.has(candidate)) ?? "";

  return {
    ...draft,
    criteria: [...draft.criteria, { key, parameter, expectedValue: "", min: "", max: "", priority: DEFAULT_RUBRIC_PRIORITY }],
  };
}

export function updateCriterionDraft(draft: RubricDraft, key: string, changes: Partial<Omit<CriterionDraft, "key">>): RubricDraft {
  return {
    ...draft,
    criteria: draft.criteria.map((criterion) => {
      if (criterion.key !== key) {
        return criterion;
      }

      const next = { ...criterion, ...changes };

      // Text parameters take no range.
      return next.parameter !== "" && isTextParameter(next.parameter) ? { ...next, min: "", max: "" } : next;
    }),
  };
}

export function removeCriterionDraft(draft: RubricDraft, key: string): RubricDraft {
  return { ...draft, criteria: draft.criteria.filter((criterion) => criterion.key !== key) };
}
