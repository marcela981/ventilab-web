/*
* Funcionalidad: Outcome rubric tests
* Descripción: Unit tests of the outcome rubric rules against the backend rules they mirror v1.2 (B4, D7): numbers read through the shared es-CO parser ("1.125" and "1,125" are 1.125, thousands grouping is invalid).
*   (clinical-case-definition-validator `assertValidRubric` + the session scoring threshold units): a valid rubric, each
*   rejection (not an object, policy, passing score out of [0, 100], no criteria, unknown and duplicated type, negative
*   weight, missing threshold, negative penalty, missing or non-positive window, weights not adding up to 100 and the
*   1e-6 tolerance), the threshold units per type, the Spanish messages, and the draft helpers (round trip with
*   inapplicable fields dropped, "," decimals, add with the first unused type, type change clearing fields, move and
*   remove, weight total). Depends on vitest and the outcome rubric entity. v1.1 (review of 4134725): an unknown stored
*   type is kept and reported as type_invalid until a known type is chosen; AI_ASSIST_USAGE free uses must be whole;
*   the weight 0 hint per type.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  addOutcomeCriterion,
  emptyOutcomeRubricDraft,
  moveOutcomeCriterion,
  OUTCOME_CRITERION_TYPES,
  outcomeRubricDraftFrom,
  outcomeRubricDraftIssues,
  outcomeRubricIssueMessage,
  outcomeWeightTotal,
  outcomeWeightZeroHint,
  removeOutcomeCriterion,
  toOutcomeRubricValue,
  updateOutcomeCriterion,
  validateOutcomeRubric,
} from "./outcome-rubric.entity";
import type { OutcomeCriterionType, OutcomeRubric, OutcomeRubricIssueCode } from "./outcome-rubric.entity";

const VALID: OutcomeRubric = {
  assistancePolicy: "ALLOWED_WITH_PENALTY",
  passingScore: 70,
  criteria: [
    { type: "TARGETS_REACHED", weight: 40, threshold: 0.8 },
    { type: "TIME_IN_RANGE", weight: 30, threshold: 80, windowMinutes: 5 },
    { type: "PLATEAU_PRESSURE_LIMIT", weight: 20, threshold: 30, penaltyPoints: 5 },
    { type: "AI_ASSIST_USAGE", weight: 10, threshold: 1, penaltyPoints: 2 },
  ],
};

const codes = (raw: unknown): Array<[OutcomeRubricIssueCode, number | null]> =>
  validateOutcomeRubric(raw).map((issue) => [issue.code, issue.index]);

const withCriteria = (criteria: unknown[], extra: Record<string, unknown> = {}) => ({ ...VALID, criteria, ...extra });

describe("validateOutcomeRubric", () => {
  it("accepts a rubric the backend accepts", () => {
    expect(validateOutcomeRubric(VALID)).toEqual([]);
  });

  it("rejects a value that is not an object", () => {
    expect(codes(null)).toEqual([["not_object", null]]);
  });

  it("rejects an unknown policy and a passing score outside 0 to 100", () => {
    expect(codes({ ...VALID, assistancePolicy: "ALLOWED" })).toEqual([["policy_invalid", null]]);
    expect(codes({ ...VALID, passingScore: 101 })).toEqual([["passing_score_invalid", null]]);
    expect(codes({ ...VALID, passingScore: -1 })).toEqual([["passing_score_invalid", null]]);
    expect(codes({ ...VALID, passingScore: Number.NaN })).toEqual([["passing_score_invalid", null]]);
    expect(validateOutcomeRubric({ ...VALID, passingScore: 0 })).toEqual([]);
    expect(validateOutcomeRubric({ ...VALID, passingScore: 100 })).toEqual([]);
  });

  it("needs at least one criterion", () => {
    expect(codes(withCriteria([]))).toEqual([["criteria_required", null]]);
  });

  it("rejects unknown and duplicated types", () => {
    expect(codes(withCriteria([{ type: "SAFETY_VIOLATIONS", weight: 100, threshold: 1 }]))).toEqual([["type_invalid", 0]]);
    expect(codes(withCriteria([
      { type: "TARGETS_REACHED", weight: 50, threshold: 1 },
      { type: "TARGETS_REACHED", weight: 50, threshold: 1 },
    ]))).toEqual([["type_duplicated", 1]]);
  });

  it("rejects a negative weight, a missing threshold and a negative penalty", () => {
    expect(codes(withCriteria([
      { type: "TARGETS_REACHED", weight: -10, threshold: 1 },
      { type: "TIME_TO_STABILIZE", weight: 110 },
      { type: "AUTO_PEEP_LIMIT", weight: 0, threshold: 5, penaltyPoints: -1 },
    ]))).toEqual([["weight_invalid", 0], ["threshold_invalid", 1], ["penalty_invalid", 2]]);
  });

  it("requires a positive window for TIME_IN_RANGE and rejects a non-positive window anywhere", () => {
    expect(codes(withCriteria([{ type: "TIME_IN_RANGE", weight: 100, threshold: 80 }]))).toEqual([["window_invalid", 0]]);
    expect(codes(withCriteria([{ type: "TIME_IN_RANGE", weight: 100, threshold: 80, windowMinutes: 0 }]))).toEqual([["window_invalid", 0]]);
    expect(codes(withCriteria([{ type: "TARGETS_REACHED", weight: 100, threshold: 1, windowMinutes: -2 }]))).toEqual([["window_invalid", 0]]);
  });

  it("requires the weights to add up to 100 within 1e-6", () => {
    expect(codes(withCriteria([{ type: "TARGETS_REACHED", weight: 90, threshold: 1 }]))).toEqual([["weight_total", null]]);
    expect(validateOutcomeRubric(withCriteria([
      { type: "TARGETS_REACHED", weight: 33.3333333, threshold: 1 },
      { type: "TIME_TO_STABILIZE", weight: 33.3333333, threshold: 300 },
      { type: "TIME_IN_RANGE", weight: 33.3333334, threshold: 80, windowMinutes: 5 },
    ]))).toEqual([]);
  });

  it("applies the threshold unit of each type that the session scoring reads", () => {
    const single = (type: string, threshold: number) => codes(withCriteria([{ type, weight: 100, threshold, ...(type === "TIME_IN_RANGE" ? { windowMinutes: 5 } : {}) }]));

    expect(single("TARGETS_REACHED", 80)).toEqual([["threshold_out_of_range", 0]]);
    expect(single("TARGETS_REACHED", 0)).toEqual([["threshold_out_of_range", 0]]);
    expect(single("TARGETS_REACHED", 1)).toEqual([]);
    expect(single("TIME_TO_STABILIZE", 0)).toEqual([["threshold_out_of_range", 0]]);
    expect(single("TIME_IN_RANGE", 120)).toEqual([["threshold_out_of_range", 0]]);
    expect(single("TIDAL_VOLUME_LIMIT", 0)).toEqual([["threshold_out_of_range", 0]]);
    expect(single("AI_ASSIST_USAGE", 1.5)).toEqual([["threshold_out_of_range", 0]]);
    expect(single("AI_ASSIST_USAGE", 0)).toEqual([]);
  });

  it("gives Spanish messages, with the criterion position and the threshold unit", () => {
    expect(outcomeRubricIssueMessage({ code: "weight_total", field: "totalWeight", index: null })).toBe("Los pesos deben sumar 100.");
    expect(outcomeRubricIssueMessage({ code: "threshold_out_of_range", field: "threshold", index: 1 }, "TARGETS_REACHED"))
      .toBe("Criterio 2: el umbral debe ser una fracción mayor que 0 y como máximo 1.");
  });
});

describe("outcome rubric draft", () => {
  it("round-trips a stored rubric and drops the fields a type does not use", () => {
    const draft = outcomeRubricDraftFrom(withCriteria([
      ...VALID.criteria,
      { type: "TIME_TO_STABILIZE", weight: 0, threshold: 300, windowMinutes: 9, penaltyPoints: 4 },
    ]));

    expect(draft.criteria[4]).toMatchObject({ type: "TIME_TO_STABILIZE", windowMinutes: "", penaltyPoints: "" });
    expect(toOutcomeRubricValue(draft)).toEqual({
      ...VALID,
      criteria: [...VALID.criteria, { type: "TIME_TO_STABILIZE", weight: 0, threshold: 300 }],
    });
  });

  it("accepts a comma as the decimal separator and returns null while the draft has issues", () => {
    const draft = outcomeRubricDraftFrom({ assistancePolicy: "DISABLED", passingScore: 60, criteria: [{ type: "TARGETS_REACHED", weight: 100, threshold: 1 }] });
    const key = draft.criteria[0]?.key ?? "";

    expect(toOutcomeRubricValue(updateOutcomeCriterion(draft, key, { threshold: "0,75" }))?.criteria[0]?.threshold).toBe(0.75);
    expect(toOutcomeRubricValue(updateOutcomeCriterion(draft, key, { weight: "" }))).toBeNull();
  });

  it("reads one separator as decimal and rejects thousands grouping (D7)", () => {
    const draft = outcomeRubricDraftFrom({ assistancePolicy: "DISABLED", passingScore: 60, criteria: [{ type: "TARGETS_REACHED", weight: 100, threshold: 1 }] });
    const key = draft.criteria[0]?.key ?? "";

    expect(toOutcomeRubricValue({ ...draft, passingScore: "1.125" })?.passingScore).toBe(1.125);
    expect(toOutcomeRubricValue({ ...draft, passingScore: "1,125" })?.passingScore).toBe(1.125);
    expect(toOutcomeRubricValue({ ...draft, passingScore: "1.000.000" })).toBeNull();
    expect(toOutcomeRubricValue(updateOutcomeCriterion(draft, key, { weight: "1e2" }))).toBeNull();
  });

  it("reports draft issues with the key of their criterion; an empty field is invalid", () => {
    const draft = addOutcomeCriterion({ ...emptyOutcomeRubricDraft(), passingScore: "70" }, "k1");

    expect(outcomeRubricDraftIssues(draft).map((issue) => [issue.code, issue.field, issue.key])).toEqual([
      ["weight_invalid", "weight", "k1"],
      ["threshold_invalid", "threshold", "k1"],
      ["weight_total", "totalWeight", null],
    ]);
  });

  it("adds criteria with the first unused type and stops when every type is used", () => {
    let draft = emptyOutcomeRubricDraft();

    OUTCOME_CRITERION_TYPES.forEach((_, index) => {
      draft = addOutcomeCriterion(draft, `k${index}`);
    });

    expect(draft.criteria.map((criterion) => criterion.type)).toEqual(OUTCOME_CRITERION_TYPES);
    expect(addOutcomeCriterion(draft, "extra")).toBe(draft);
  });

  it("clears the window and penalty when the type changes to one that does not use them", () => {
    const draft = outcomeRubricDraftFrom(withCriteria([{ type: "TIME_IN_RANGE", weight: 100, threshold: 80, windowMinutes: 5 }]));
    const key = draft.criteria[0]?.key ?? "";

    expect(updateOutcomeCriterion(draft, key, { type: "TARGETS_REACHED" }).criteria[0]).toMatchObject({ windowMinutes: "", penaltyPoints: "" });
  });

  it("moves and removes criteria, and sums the numeric weights", () => {
    const draft = outcomeRubricDraftFrom(VALID);
    const [first, second] = draft.criteria;
    const moved = moveOutcomeCriterion(draft, second?.key ?? "", -1);

    expect(moved.criteria.map((criterion) => criterion.type).slice(0, 2)).toEqual(["TIME_IN_RANGE", "TARGETS_REACHED"]);
    expect(moveOutcomeCriterion(draft, first?.key ?? "", -1)).toBe(draft);
    expect(removeOutcomeCriterion(draft, first?.key ?? "").criteria).toHaveLength(3);
    expect(outcomeWeightTotal(draft)).toBe(100);
    expect(outcomeWeightTotal(updateOutcomeCriterion(draft, first?.key ?? "", { weight: "abc" }))).toBe(60);
  });
});

describe("outcome rubric draft with an unknown stored type", () => {
  const stored = withCriteria([{ type: "LEGACY_SCORE", weight: 100, threshold: 1 }]);

  it("keeps the raw type and reports type_invalid instead of turning it into TARGETS_REACHED", () => {
    const draft = outcomeRubricDraftFrom(stored);
    const [criterion] = draft.criteria;

    expect(criterion?.unknownType).toBe("LEGACY_SCORE");
    expect(outcomeRubricDraftIssues(draft).map((issue) => [issue.code, issue.field, issue.key])).toEqual([
      ["type_invalid", "type", criterion?.key],
    ]);
    expect(toOutcomeRubricValue(draft)).toBeNull();
  });

  it("becomes valid once the author picks a known type", () => {
    const draft = outcomeRubricDraftFrom(stored);
    const key = draft.criteria[0]?.key ?? "";
    const fixed = updateOutcomeCriterion(draft, key, { type: "TARGETS_REACHED" });

    expect(fixed.criteria[0]?.unknownType).toBeUndefined();
    expect(toOutcomeRubricValue(fixed)?.criteria).toEqual([{ type: "TARGETS_REACHED", weight: 100, threshold: 1 }]);
  });

  it("keeps the unknown type when another field changes", () => {
    const draft = outcomeRubricDraftFrom(stored);
    const key = draft.criteria[0]?.key ?? "";

    expect(updateOutcomeCriterion(draft, key, { weight: "90" }).criteria[0]?.unknownType).toBe("LEGACY_SCORE");
  });
});

describe("outcome rubric weight 0 hint", () => {
  const criterion = (type: OutcomeCriterionType, weight: string, penaltyPoints = "") => ({
    key: "k", type, weight, threshold: "1", windowMinutes: "", penaltyPoints,
  });

  it("gives no hint for a weight other than 0", () => {
    expect(outcomeWeightZeroHint(criterion("TARGETS_REACHED", "10"))).toBeNull();
    expect(outcomeWeightZeroHint(criterion("TARGETS_REACHED", ""))).toBeNull();
  });

  it("says an outcome criterion of weight 0 does not count for the grade", () => {
    expect(outcomeWeightZeroHint(criterion("TIME_IN_RANGE", "0"))).toBe("Peso 0: este criterio no cuenta para la nota.");
    expect(outcomeWeightZeroHint(criterion("AI_ASSIST_USAGE", "0"))).toBe("Peso 0: este criterio no cuenta para la nota.");
  });

  it("explains that the penalty still applies to the AI assist and the safety limits", () => {
    expect(outcomeWeightZeroHint(criterion("AI_ASSIST_USAGE", "0,0", "5"))).toBe("Peso 0: cada uso penalizado resta la penalización.");
    expect(outcomeWeightZeroHint(criterion("PLATEAU_PRESSURE_LIMIT", "0"))).toBe("Peso 0: el límite se sigue vigilando y su penalización se aplica.");
  });
});
