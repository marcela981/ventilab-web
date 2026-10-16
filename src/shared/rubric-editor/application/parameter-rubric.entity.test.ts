/*
* Funcionalidad: Parameter rubric tests
* Descripción: Unit tests of the builder rubric rules against the backend value object they mirror: a valid rubric (numeric range, text parameter, default priority, justification), every rejection in the backend order (not an object, empty criteria, unsupported and duplicated parameter, invalid priority, empty text value, range on a text parameter, non-numeric value, half range, inverted range, value outside the range, non-string justification) with its Spanish message, the translation of the English backend details, and the draft round trip (strings to numbers, empty draft as no rubric, text parameters drop their range, a new criterion picks an unused parameter). Depends on vitest and the parameter rubric entity. v1.1 (T10 simulation): moved unchanged with the entity
*   to `@shared/rubric-editor`.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  addCriterionDraft,
  emptyRubricDraft,
  parseBackendRubricError,
  rubricDraftFrom,
  rubricIssueMessage,
  sameRubric,
  toRubricValue,
  updateCriterionDraft,
  validateSimulationRubric,
} from "./parameter-rubric.entity";
import type { RubricIssueCode } from "./parameter-rubric.entity";

const codes = (raw: unknown): Array<[RubricIssueCode, number | null]> =>
  validateSimulationRubric(raw).issues.map((issue) => [issue.code, issue.index]);

describe("validateSimulationRubric", () => {
  it("accepts numeric criteria with a range, text criteria and a justification", () => {
    expect(validateSimulationRubric({
      criteria: [
        { parameter: "peep", expectedValue: 8, min: 6, max: 10, priority: "CRITICO" },
        { parameter: "ventilationMode", expectedValue: "VC" },
      ],
      justification: "Ventilación protectora",
    })).toEqual({ valid: true, issues: [] });
  });

  it("rejects a non-object rubric and empty criteria", () => {
    expect(codes(null)).toEqual([["not_object", null]]);
    expect(codes([])).toEqual([["not_object", null]]);
    expect(codes({ criteria: [] })).toEqual([["criteria_required", null]]);
    expect(codes({})).toEqual([["criteria_required", null]]);
  });

  it("applies the criterion rules in the backend order", () => {
    expect(codes({
      criteria: [
        "peep",
        { parameter: "pressure", expectedValue: 1 },
        { parameter: "peep", expectedValue: 8 },
        { parameter: "peep", expectedValue: 8 },
        { parameter: "fio2", expectedValue: 40, priority: "ALTA" },
        { parameter: "iERatio", expectedValue: "  " },
        { parameter: "ventilationMode", expectedValue: "VC", min: 1, max: 2 },
        { parameter: "tidalVolume", expectedValue: "450" },
        { parameter: "respiratoryRate", expectedValue: 14, min: 10 },
        { parameter: "maxPressure", expectedValue: 30, min: 35, max: 25 },
      ],
      justification: 3,
    })).toEqual([
      ["criterion_not_object", 0],
      ["parameter_unsupported", 1],
      ["parameter_duplicated", 3],
      ["priority_invalid", 4],
      ["text_expected_required", 5],
      ["text_range_not_allowed", 6],
      ["numeric_expected_required", 7],
      ["range_incomplete", 8],
      ["range_inverted", 9],
      ["justification_not_string", null],
    ]);
    expect(codes({ criteria: [{ parameter: "peep", expectedValue: 12, min: 5, max: 10 }] })).toEqual([["expected_out_of_range", 0]]);
  });

  it("writes the messages in Spanish with the 1-based criterion", () => {
    expect(rubricIssueMessage({ code: "range_inverted", index: 2 })).toBe("Criterio 3: el mínimo no puede ser mayor que el máximo.");
    expect(rubricIssueMessage({ code: "criteria_required", index: null })).toBe("La rúbrica necesita al menos un criterio.");
  });
});

describe("parseBackendRubricError", () => {
  it("maps every English backend message to its issue", () => {
    expect([
      "rubric must be an object",
      "criteria must be a non-empty array",
      "criteria[0] must be an object",
      "criteria[1].parameter is not supported",
      "criteria[2].parameter is duplicated",
      "criteria[3].priority must be one of CRITICO, IMPORTANTE, OPCIONAL",
      "criteria[4].expectedValue must be a non-empty string",
      "criteria[5] ranges are only allowed for numeric parameters",
      "criteria[6].expectedValue must be a finite number",
      "criteria[7] must define both min and max or neither",
      "criteria[8].min must not be greater than max",
      "criteria[9].expectedValue must be within min and max",
      "justification must be a string",
    ].map(parseBackendRubricError)).toEqual([
      { code: "not_object", index: null },
      { code: "criteria_required", index: null },
      { code: "criterion_not_object", index: 0 },
      { code: "parameter_unsupported", index: 1 },
      { code: "parameter_duplicated", index: 2 },
      { code: "priority_invalid", index: 3 },
      { code: "text_expected_required", index: 4 },
      { code: "text_range_not_allowed", index: 5 },
      { code: "numeric_expected_required", index: 6 },
      { code: "range_incomplete", index: 7 },
      { code: "range_inverted", index: 8 },
      { code: "expected_out_of_range", index: 9 },
      { code: "justification_not_string", index: null },
    ]);
    expect(parseBackendRubricError("something else")).toBeNull();
  });
});

describe("rubric drafts", () => {
  it("round-trips a stored rubric and converts the edited strings to numbers", () => {
    const stored = { criteria: [{ parameter: "peep", expectedValue: 8, min: 6, max: 10, priority: "CRITICO" }, { parameter: "iERatio", expectedValue: "1:2" }] };
    const draft = rubricDraftFrom(stored);

    expect(draft.criteria.map((criterion) => [criterion.parameter, criterion.expectedValue, criterion.min, criterion.max, criterion.priority])).toEqual([
      ["peep", "8", "6", "10", "CRITICO"],
      ["iERatio", "1:2", "", "", "OPCIONAL"],
    ]);
    expect(sameRubric(draft, stored)).toBe(true);
    expect(toRubricValue({ ...draft, justification: " Protección " })).toEqual({
      criteria: [
        { parameter: "peep", expectedValue: 8, min: 6, max: 10, priority: "CRITICO" },
        { parameter: "iERatio", expectedValue: "1:2", priority: "OPCIONAL" },
      ],
      justification: "Protección",
    });
  });

  it("treats an empty draft as no rubric and keeps a non-numeric value for the validator", () => {
    expect(toRubricValue(emptyRubricDraft())).toBeNull();
    expect(sameRubric(emptyRubricDraft(), null)).toBe(true);

    const draft = addCriterionDraft(emptyRubricDraft(), "c1");

    expect(draft.criteria[0]?.parameter).toBe("tidalVolume");
    expect(codes(toRubricValue(updateCriterionDraft(draft, "c1", { expectedValue: "abc" })))).toEqual([["numeric_expected_required", 0]]);
  });

  it("picks an unused parameter and clears the range of a text parameter", () => {
    let draft = addCriterionDraft(emptyRubricDraft(), "c1");

    draft = addCriterionDraft(draft, "c2");
    expect(draft.criteria.map((criterion) => criterion.parameter)).toEqual(["tidalVolume", "respiratoryRate"]);

    draft = updateCriterionDraft(draft, "c2", { min: "10", max: "20" });
    draft = updateCriterionDraft(draft, "c2", { parameter: "ventilationMode" });
    expect(draft.criteria[1]).toMatchObject({ parameter: "ventilationMode", min: "", max: "" });
  });
});
