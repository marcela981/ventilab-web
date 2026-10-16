/*
* Funcionalidad: Outcome rubric (clinical case default rubric)
* Descripción: Pure rules of the outcome rubric a clinical case stores as `defaultRubric`, on the contract schema
*   (openapi `ClinicalCaseRubricDTO` / `RubricCriterionDTO`): `{assistancePolicy, passingScore, criteria: [{type,
*   weight, threshold, windowMinutes?, penaltyPoints?}]}`. `validateOutcomeRubric` mirrors, in the same order, the
*   save-time rules of the backend (ventylab-server `clinical-cases/domain/services/clinical-case-definition-validator.ts`
*   `assertValidRubric` + the management DTO): policy DISABLED or ALLOWED_WITH_PENALTY; passing score finite in
*   [0, 100]; at least one criterion; known and unique types; weight and threshold finite and ≥ 0; penalty, when
*   present, finite and ≥ 0; windowMinutes required and > 0 for TIME_IN_RANGE (and > 0 whenever present); weights
*   adding up to 100 within 1e-6. It also applies the threshold units the session scoring reads
*   (`simulation/domain/sessions/simulation-session-rubric.ts`), because a threshold outside them is silently replaced
*   by a default when the session is scored: TARGETS_REACHED a fraction in (0, 1], TIME_TO_STABILIZE seconds > 0,
*   TIME_IN_RANGE a percentage in (0, 100], the four safety limits > 0 and AI_ASSIST_USAGE a whole number of free uses.
*   The window applies only to TIME_IN_RANGE and the penalty only to the safety limits and AI_ASSIST_USAGE, so the
*   draft drops them for other types. Also the editable draft (strings per field, stable client keys), its conversion
*   from and to the stored value, add/update/remove/move helpers, the weight total and the Spanish labels and
*   messages. No dependencies.
*   v1.1 (review of 4134725): a stored criterion with an unknown type keeps that raw type in the draft
*   (`unknownType`) and is reported as `type_invalid` until the author picks a known type (it was silently turned into
*   TARGETS_REACHED); `outcomeWeightZeroHint` explains what a weight of 0 means for each type, following the session
*   scoring conversion; the AI_ASSIST_USAGE integer rule is documented as a deliberate tightening of the backend.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type OutcomeCriterionType =
  | "TARGETS_REACHED"
  | "TIME_TO_STABILIZE"
  | "TIME_IN_RANGE"
  | "PLATEAU_PRESSURE_LIMIT"
  | "DRIVING_PRESSURE_LIMIT"
  | "TIDAL_VOLUME_LIMIT"
  | "AUTO_PEEP_LIMIT"
  | "AI_ASSIST_USAGE";

export type OutcomeAssistancePolicy = "DISABLED" | "ALLOWED_WITH_PENALTY";

export type OutcomeRubricCriterion = {
  type: OutcomeCriterionType
  weight: number
  threshold: number
  windowMinutes?: number
  penaltyPoints?: number
};

export type OutcomeRubric = {
  assistancePolicy: OutcomeAssistancePolicy
  passingScore: number
  criteria: OutcomeRubricCriterion[]
};

export const OUTCOME_CRITERION_TYPES: readonly OutcomeCriterionType[] = [
  "TARGETS_REACHED",
  "TIME_TO_STABILIZE",
  "TIME_IN_RANGE",
  "PLATEAU_PRESSURE_LIMIT",
  "DRIVING_PRESSURE_LIMIT",
  "TIDAL_VOLUME_LIMIT",
  "AUTO_PEEP_LIMIT",
  "AI_ASSIST_USAGE",
];

export const OUTCOME_ASSISTANCE_POLICIES: readonly OutcomeAssistancePolicy[] = ["DISABLED", "ALLOWED_WITH_PENALTY"];

/** Backend rule: the criterion weights are points that add up to this total (and the passing score is within it). */
export const OUTCOME_RUBRIC_TOTAL_WEIGHT = 100;
export const OUTCOME_RUBRIC_WEIGHT_TOLERANCE = 0.000001;

const SAFETY_LIMIT_TYPES: readonly OutcomeCriterionType[] = [
  "PLATEAU_PRESSURE_LIMIT",
  "DRIVING_PRESSURE_LIMIT",
  "TIDAL_VOLUME_LIMIT",
  "AUTO_PEEP_LIMIT",
];

// TODO(i18n): move to a rubric-editor namespace in src/i18n.
export const OUTCOME_CRITERION_LABELS: Readonly<Record<OutcomeCriterionType, string>> = {
  TARGETS_REACHED: "Objetivos alcanzados",
  TIME_TO_STABILIZE: "Tiempo para estabilizar",
  TIME_IN_RANGE: "Tiempo en rango",
  PLATEAU_PRESSURE_LIMIT: "Límite de presión meseta",
  DRIVING_PRESSURE_LIMIT: "Límite de presión de distensión",
  TIDAL_VOLUME_LIMIT: "Límite de volumen tidal",
  AUTO_PEEP_LIMIT: "Límite de auto-PEEP",
  AI_ASSIST_USAGE: "Uso de la asesoría de IA",
};

/** Label of the threshold of each type, with the unit the session scoring reads. */
export const OUTCOME_THRESHOLD_LABELS: Readonly<Record<OutcomeCriterionType, string>> = {
  TARGETS_REACHED: "Fracción mínima de objetivos (0 a 1)",
  TIME_TO_STABILIZE: "Tiempo máximo para estabilizar (s)",
  TIME_IN_RANGE: "Tiempo mínimo en rango (%)",
  PLATEAU_PRESSURE_LIMIT: "Presión meseta máxima (cmH2O)",
  DRIVING_PRESSURE_LIMIT: "Presión de distensión máxima (cmH2O)",
  TIDAL_VOLUME_LIMIT: "Volumen tidal máximo (mL/kg de peso predicho)",
  AUTO_PEEP_LIMIT: "Auto-PEEP máxima (cmH2O)",
  AI_ASSIST_USAGE: "Usos sin penalización",
};

export const OUTCOME_POLICY_LABELS: Readonly<Record<OutcomeAssistancePolicy, string>> = {
  DISABLED: "Desactivada",
  ALLOWED_WITH_PENALTY: "Permitida con penalización",
};

export type OutcomeRubricField =
  | "assistancePolicy"
  | "passingScore"
  | "criteria"
  | "totalWeight"
  | "type"
  | "weight"
  | "threshold"
  | "windowMinutes"
  | "penaltyPoints";

export type OutcomeRubricIssueCode =
  | "not_object"
  | "policy_invalid"
  | "passing_score_invalid"
  | "criteria_required"
  | "criterion_not_object"
  | "type_invalid"
  | "type_duplicated"
  | "weight_invalid"
  | "threshold_invalid"
  | "threshold_out_of_range"
  | "penalty_invalid"
  | "window_invalid"
  | "weight_total";

/** index: 0-based criterion position, null for rubric-level issues. */
export type OutcomeRubricIssue = { code: OutcomeRubricIssueCode, field: OutcomeRubricField, index: number | null };

const THRESHOLD_RANGE_MESSAGES: Readonly<Record<OutcomeCriterionType, string>> = {
  TARGETS_REACHED: "debe ser una fracción mayor que 0 y como máximo 1.",
  TIME_TO_STABILIZE: "debe ser un número de segundos mayor que 0.",
  TIME_IN_RANGE: "debe ser un porcentaje mayor que 0 y como máximo 100.",
  PLATEAU_PRESSURE_LIMIT: "debe ser mayor que 0.",
  DRIVING_PRESSURE_LIMIT: "debe ser mayor que 0.",
  TIDAL_VOLUME_LIMIT: "debe ser mayor que 0.",
  AUTO_PEEP_LIMIT: "debe ser mayor que 0.",
  AI_ASSIST_USAGE: "debe ser un número entero de usos, 0 o más.",
};

const MESSAGES: Readonly<Record<Exclude<OutcomeRubricIssueCode, "threshold_out_of_range">, string>> = {
  not_object: "La rúbrica no es válida.",
  policy_invalid: "Elige si la asesoría de IA está desactivada o permitida con penalización.",
  passing_score_invalid: "El puntaje mínimo debe ser un número entre 0 y 100.",
  criteria_required: "La rúbrica necesita al menos un criterio.",
  criterion_not_object: "el criterio no es válido.",
  type_invalid: "elige un tipo de criterio.",
  type_duplicated: "el tipo ya está en otro criterio.",
  weight_invalid: "el peso debe ser un número de 0 o más.",
  threshold_invalid: "el umbral debe ser un número de 0 o más.",
  penalty_invalid: "la penalización debe ser un número de 0 o más.",
  window_invalid: "la ventana debe ser un número de minutos mayor que 0.",
  weight_total: `Los pesos deben sumar ${OUTCOME_RUBRIC_TOTAL_WEIGHT}.`,
};

/** Spanish message of an issue; `type` gives the threshold range of a threshold_out_of_range issue. */
export function outcomeRubricIssueMessage(issue: OutcomeRubricIssue, type?: OutcomeCriterionType | undefined): string {
  const message = issue.code === "threshold_out_of_range"
    ? `el umbral ${type ? THRESHOLD_RANGE_MESSAGES[type] : "está fuera de rango."}`
    : MESSAGES[issue.code];

  return issue.index === null ? message : `Criterio ${issue.index + 1}: ${message}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegative(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

export function isOutcomeCriterionType(value: unknown): value is OutcomeCriterionType {
  return typeof value === "string" && (OUTCOME_CRITERION_TYPES as readonly string[]).includes(value);
}

export function isOutcomeAssistancePolicy(value: unknown): value is OutcomeAssistancePolicy {
  return typeof value === "string" && (OUTCOME_ASSISTANCE_POLICIES as readonly string[]).includes(value);
}

/** TIME_IN_RANGE is the only type with an evaluation window. */
export function criterionUsesWindow(type: OutcomeCriterionType): boolean {
  return type === "TIME_IN_RANGE";
}

/** The safety limits and the AI assist usage subtract penalty points; other types ignore them. */
export function criterionUsesPenalty(type: OutcomeCriterionType): boolean {
  return type === "AI_ASSIST_USAGE" || SAFETY_LIMIT_TYPES.includes(type);
}

/** The threshold unit the session scoring reads (a value outside it is replaced by a default at scoring time). */
function thresholdInRange(type: OutcomeCriterionType, threshold: number): boolean {
  switch (type) {
    case "TARGETS_REACHED":
      return threshold > 0 && threshold <= 1;
    case "TIME_IN_RANGE":
      return threshold > 0 && threshold <= 100;
    case "AI_ASSIST_USAGE":
      // Deliberately stricter than the backend: the save-time validator accepts any finite threshold ≥ 0, but the
      // session scoring floors it (`Math.floor`) into whole free uses, so 1.5 would silently mean 1. The editor
      // therefore only accepts integers (tracked in odd/tasks/simulation.md, T10-fix).
      return Number.isInteger(threshold);
    default:
      return threshold > 0;
  }
}

export function weightTotalMatches(total: number): boolean {
  return Math.abs(total - OUTCOME_RUBRIC_TOTAL_WEIGHT) <= OUTCOME_RUBRIC_WEIGHT_TOLERANCE;
}

function criterionIssues(raw: unknown, index: number, seen: Set<OutcomeCriterionType>): OutcomeRubricIssue[] {
  if (!isRecord(raw)) {
    return [{ code: "criterion_not_object", field: "type", index }];
  }

  const issues: OutcomeRubricIssue[] = [];
  const type = isOutcomeCriterionType(raw.type) ? raw.type : null;

  if (type === null) {
    issues.push({ code: "type_invalid", field: "type", index });
  } else if (seen.has(type)) {
    issues.push({ code: "type_duplicated", field: "type", index });
  }

  if (!isNonNegative(raw.weight)) {
    issues.push({ code: "weight_invalid", field: "weight", index });
  }

  if (!isNonNegative(raw.threshold)) {
    issues.push({ code: "threshold_invalid", field: "threshold", index });
  } else if (type !== null && !thresholdInRange(type, raw.threshold)) {
    issues.push({ code: "threshold_out_of_range", field: "threshold", index });
  }

  if (raw.penaltyPoints !== undefined && !isNonNegative(raw.penaltyPoints)) {
    issues.push({ code: "penalty_invalid", field: "penaltyPoints", index });
  }

  const hasValidWindow = isFiniteNumber(raw.windowMinutes) && raw.windowMinutes > 0;

  if ((type === "TIME_IN_RANGE" && !hasValidWindow) || (raw.windowMinutes !== undefined && !hasValidWindow)) {
    issues.push({ code: "window_invalid", field: "windowMinutes", index });
  }

  return issues;
}

/**
 * Every issue of a stored outcome rubric, in the backend order (policy, passing score, criteria, per-criterion
 * fields, weight total). An empty list means the backend accepts it and the scoring reads every threshold as given.
 */
export function validateOutcomeRubric(raw: unknown): OutcomeRubricIssue[] {
  if (!isRecord(raw)) {
    return [{ code: "not_object", field: "criteria", index: null }];
  }

  const issues: OutcomeRubricIssue[] = [];

  if (!isOutcomeAssistancePolicy(raw.assistancePolicy)) {
    issues.push({ code: "policy_invalid", field: "assistancePolicy", index: null });
  }

  if (!isFiniteNumber(raw.passingScore) || raw.passingScore < 0 || raw.passingScore > OUTCOME_RUBRIC_TOTAL_WEIGHT) {
    issues.push({ code: "passing_score_invalid", field: "passingScore", index: null });
  }

  const criteria = Array.isArray(raw.criteria) ? raw.criteria : [];

  if (criteria.length === 0) {
    issues.push({ code: "criteria_required", field: "criteria", index: null });

    return issues;
  }

  const seen = new Set<OutcomeCriterionType>();
  let total = 0;

  criteria.forEach((criterion: unknown, index: number) => {
    issues.push(...criterionIssues(criterion, index, seen));

    if (isRecord(criterion)) {
      if (isOutcomeCriterionType(criterion.type)) {
        seen.add(criterion.type);
      }

      total += isFiniteNumber(criterion.weight) ? criterion.weight : Number.NaN;
    }
  });

  if (!weightTotalMatches(total)) {
    issues.push({ code: "weight_total", field: "totalWeight", index: null });
  }

  return issues;
}

export type OutcomeCriterionDraft = {
  key: string
  type: OutcomeCriterionType
  /**
   * The raw stored type when it is not a known type. While set, `type` is only a placeholder: the criterion is
   * validated with the raw value (type_invalid), so the author must pick a known type before saving.
   */
  unknownType?: string
  weight: string
  threshold: string
  /** Kept only for TIME_IN_RANGE. */
  windowMinutes: string
  /** Kept only for the safety limits and AI_ASSIST_USAGE; "" = not set. */
  penaltyPoints: string
};

export type OutcomeRubricDraft = {
  assistancePolicy: OutcomeAssistancePolicy
  passingScore: string
  criteria: OutcomeCriterionDraft[]
};

export function emptyOutcomeRubricDraft(): OutcomeRubricDraft {
  return { assistancePolicy: "DISABLED", passingScore: "", criteria: [] };
}

function fieldText(value: unknown): string {
  return typeof value === "number" || typeof value === "string" ? String(value) : "";
}

/** The editable draft of a stored rubric; an unknown type is kept in `unknownType` and reported on validation. */
export function outcomeRubricDraftFrom(raw: unknown): OutcomeRubricDraft {
  if (!isRecord(raw)) {
    return emptyOutcomeRubricDraft();
  }

  const criteria = Array.isArray(raw.criteria) ? raw.criteria : [];

  return {
    assistancePolicy: isOutcomeAssistancePolicy(raw.assistancePolicy) ? raw.assistancePolicy : "DISABLED",
    passingScore: fieldText(raw.passingScore),
    criteria: criteria.map((item: unknown, index: number) => {
      const criterion = isRecord(item) ? item : {};
      const known = isOutcomeCriterionType(criterion.type);
      const type = known ? criterion.type as OutcomeCriterionType : OUTCOME_CRITERION_TYPES[0] as OutcomeCriterionType;
      const draftCriterion: OutcomeCriterionDraft = {
        key: `outcome-criterion-${index}`,
        type,
        weight: fieldText(criterion.weight),
        threshold: fieldText(criterion.threshold),
        windowMinutes: known && criterionUsesWindow(type) ? fieldText(criterion.windowMinutes) : "",
        penaltyPoints: known && criterionUsesPenalty(type) ? fieldText(criterion.penaltyPoints) : "",
      };

      if (!known) {
        draftCriterion.unknownType = fieldText(criterion.type);
      }

      return draftCriterion;
    }),
  };
}

/** A number for a numeric text ("," accepted as the decimal separator); NaN for an empty or non-numeric text. */
export function parseRubricNumber(value: string): number {
  const trimmed = value.trim().replace(",", ".");

  return trimmed === "" ? Number.NaN : Number(trimmed);
}

function toCriterionRaw(criterion: OutcomeCriterionDraft): Record<string, unknown> {
  const raw: Record<string, unknown> = {
    type: criterion.unknownType ?? criterion.type,
    weight: parseRubricNumber(criterion.weight),
    threshold: parseRubricNumber(criterion.threshold),
  };

  if (criterionUsesWindow(criterion.type)) {
    raw.windowMinutes = parseRubricNumber(criterion.windowMinutes);
  }

  if (criterionUsesPenalty(criterion.type) && criterion.penaltyPoints.trim() !== "") {
    raw.penaltyPoints = parseRubricNumber(criterion.penaltyPoints);
  }

  return raw;
}

function draftRaw(draft: OutcomeRubricDraft): Record<string, unknown> {
  return {
    assistancePolicy: draft.assistancePolicy,
    passingScore: parseRubricNumber(draft.passingScore),
    criteria: draft.criteria.map(toCriterionRaw),
  };
}

/** Issues of the draft (NaN for an empty or non-numeric field), each with the key of its criterion. */
export function outcomeRubricDraftIssues(draft: OutcomeRubricDraft): Array<OutcomeRubricIssue & { key: string | null }> {
  return validateOutcomeRubric(draftRaw(draft)).map((issue) => ({
    ...issue,
    key: issue.index === null ? null : draft.criteria[issue.index]?.key ?? null,
  }));
}

/** The value to store; null while the draft has any issue. */
export function toOutcomeRubricValue(draft: OutcomeRubricDraft): OutcomeRubric | null {
  const raw = draftRaw(draft);

  return validateOutcomeRubric(raw).length === 0 ? raw as unknown as OutcomeRubric : null;
}

/** Sum of the weights that are numbers (an empty or invalid weight counts as 0). */
export function outcomeWeightTotal(draft: OutcomeRubricDraft): number {
  return draft.criteria.reduce((sum, criterion) => {
    const weight = parseRubricNumber(criterion.weight);

    return Number.isFinite(weight) ? sum + weight : sum;
  }, 0);
}

/** The known types the criteria use (a criterion with an unknown stored type uses none). */
export function usedOutcomeTypes(draft: OutcomeRubricDraft): Set<OutcomeCriterionType> {
  return new Set(draft.criteria.filter((criterion) => criterion.unknownType === undefined).map((criterion) => criterion.type));
}

/** Appends a criterion of the first unused type; the draft is returned unchanged when every type is used. */
export function addOutcomeCriterion(draft: OutcomeRubricDraft, key: string): OutcomeRubricDraft {
  const used = usedOutcomeTypes(draft);
  const type = OUTCOME_CRITERION_TYPES.find((candidate) => !used.has(candidate));

  if (!type) {
    return draft;
  }

  return {
    ...draft,
    criteria: [...draft.criteria, { key, type, weight: "", threshold: "", windowMinutes: "", penaltyPoints: "" }],
  };
}

/** Updates one criterion; a new type clears the unknown stored type and the window and penalty fields it does not use. */
export function updateOutcomeCriterion(
  draft: OutcomeRubricDraft,
  key: string,
  changes: Partial<Omit<OutcomeCriterionDraft, "key">>,
): OutcomeRubricDraft {
  return {
    ...draft,
    criteria: draft.criteria.map((criterion) => {
      if (criterion.key !== key) {
        return criterion;
      }

      const { unknownType, ...rest } = { ...criterion, ...changes };
      const next: OutcomeCriterionDraft = {
        ...rest,
        windowMinutes: criterionUsesWindow(rest.type) ? rest.windowMinutes : "",
        penaltyPoints: criterionUsesPenalty(rest.type) ? rest.penaltyPoints : "",
      };

      if (unknownType !== undefined && changes.type === undefined) {
        next.unknownType = unknownType;
      }

      return next;
    }),
  };
}

export function removeOutcomeCriterion(draft: OutcomeRubricDraft, key: string): OutcomeRubricDraft {
  return { ...draft, criteria: draft.criteria.filter((criterion) => criterion.key !== key) };
}

/** Moves a criterion one position up (-1) or down (+1); unchanged at the edges. */
export function moveOutcomeCriterion(draft: OutcomeRubricDraft, key: string, offset: -1 | 1): OutcomeRubricDraft {
  const from = draft.criteria.findIndex((criterion) => criterion.key === key);
  const to = from + offset;

  if (from < 0 || to < 0 || to >= draft.criteria.length) {
    return draft;
  }

  const criteria = [...draft.criteria];
  const [moved] = criteria.splice(from, 1);

  if (moved) {
    criteria.splice(to, 0, moved);
  }

  return { ...draft, criteria };
}

/**
 * What a weight of 0 means for a criterion, following the session scoring conversion
 * (`simulation-session-rubric.ts`): an outcome criterion of weight 0 is skipped; AI_ASSIST_USAGE of weight 0 still
 * counts with penaltyPoints × 4 as its weight when it has a penalty (skipped otherwise); a safety limit of weight 0
 * still sets its limit and penalty in the grouped safety criterion. Null when the weight is not 0.
 */
export function outcomeWeightZeroHint(criterion: OutcomeCriterionDraft): string | null {
  if (criterion.unknownType !== undefined || parseRubricNumber(criterion.weight) !== 0) {
    return null;
  }

  if (SAFETY_LIMIT_TYPES.includes(criterion.type)) {
    return "Peso 0: el límite se sigue vigilando y su penalización se aplica.";
  }

  const penalty = parseRubricNumber(criterion.penaltyPoints);

  if (criterion.type === "AI_ASSIST_USAGE" && Number.isFinite(penalty) && penalty > 0) {
    return "Peso 0: cada uso penalizado resta la penalización.";
  }

  return "Peso 0: este criterio no cuenta para la nota.";
}
