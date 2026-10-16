/*
* Funcionalidad: Case editor entity tests
* Descripción: Pure tests of the case editor entities: the draft ↔ DTO mapping (a stored definition round-trips to an
*   equal body, an empty draft reports the required fields and sends nothing, events go out sorted by time with
*   their keys in DTO order, a partial mechanics block is reported, a decreasing recruitment PEEP, a target min above
*   its max, event parameters of their type, the engine ventilator timing rule and the rubric rules), the ranges read
*   from the vendored backend constants (text, scale, out-of-range check), the predicted body weight, the dirty
*   comparison, the event and curve operations, the list query and row status, and the server error mapping (422
*   range and 400 definition paths read from the message, indices mapped to row keys, sections for ventilator and
*   rubric, page-level message otherwise). Depends on vitest and the case editor entities.
*   v1.1 (review of 50ed812): no status action for an unknown status, a server path the editor does not render falls
*   back to the page message, event times in seconds without float noise, plain-decimal parsing.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { CLINICAL_CASE_PHYSIOLOGICAL_RANGES, predictedBodyWeightKg } from "@shared/sim-engine";
import { MECHANICS_FIELDS } from "../config/case-editor.config";
import { definitionDto } from "../pages/case-editor-test-helpers";
import { isRenderedFieldId, mapSaveError, serverErrorPath, toDraftFieldId } from "./case-editor-errors";
import {
  addCurvePoint,
  addEvent,
  applyVentilatorChanges,
  caseDraftFromDefinition,
  draftPredictedBodyWeightKg,
  emptyCaseDraft,
  eventsInTimeOrder,
  parseNumber,
  removeEvent,
  sameDraft,
  sortDraftEvents,
  toUpsertCase,
  updateCurvePoint,
  updateEvent,
} from "./case-draft.entity";
import type { CaseDraft } from "./case-draft.entity";
import { NO_CASE_LIST_FILTERS, statusActionsFor, toCaseListQuery, toCaseListRow } from "./case-list.entity";
import { formatRange, isOutOfRange, RANGE_COPY } from "./case-ranges.entity";
import { caseItemDto } from "../pages/case-editor-test-helpers";

function validDraft(): CaseDraft {
  return caseDraftFromDefinition(definitionDto("c1"));
}

describe("draft ↔ DTO mapping", () => {
  it("round-trips a stored definition to the same blocks", () => {
    const definition = definitionDto("c1");
    const { body, errors } = toUpsertCase(caseDraftFromDefinition(definition));

    expect(errors).toEqual({});
    expect(body).toEqual({
      title: definition.title,
      summary: definition.summary,
      description: definition.description,
      history: definition.history,
      patientAge: 52,
      patientWeight: 120,
      patientSex: "FEMALE",
      patientHeightCm: 165,
      mainDiagnosis: definition.mainDiagnosis,
      comorbidities: ["Obesidad"],
      labData: { ph: 7.3 },
      difficulty: "INTERMEDIATE",
      pathology: "SDRA",
      educationalGoal: definition.educationalGoal,
      mechanics: definition.mechanics,
      initialVentilatorSettings: definition.initialVentilatorSettings,
      initialState: definition.initialState,
      events: definition.events,
      targets: definition.targets,
      defaultRubric: definition.defaultRubric,
    });
  });

  it("reports the required fields of an empty draft and sends nothing", () => {
    const { body, errors } = toUpsertCase(emptyCaseDraft());

    expect(body).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(["description", "educationalGoal", "mainDiagnosis", "patientAge", "patientWeight", "title"]);
  });

  it("omits the optional blocks a new case leaves empty but keeps the engine default settings", () => {
    const draft: CaseDraft = { ...emptyCaseDraft(), title: "T", description: "D", mainDiagnosis: "M", educationalGoal: "G", patientAge: "40", patientWeight: "70" };
    const { body } = toUpsertCase(draft);

    expect(body).not.toBeNull();
    expect(body?.mechanics).toBeUndefined();
    expect(body?.initialState).toBeUndefined();
    expect(body?.targets).toBeUndefined();
    expect(body?.defaultRubric).toBeUndefined();
    expect(body?.history).toBeUndefined();
    expect(body?.initialVentilatorSettings).toMatchObject({ mode: "VCV", tidalVolumeMl: 450 });
  });

  it("sends the events sorted by time, with the keys in DTO order", () => {
    let draft: CaseDraft = { ...validDraft(), events: [] };

    draft = addEvent(draft, "a");
    draft = updateEvent(draft, "a", { timeSeconds: "600", type: "BRONCHOSPASM", params: { ...draft.events[0]!.params, resistanceFactor: "2" } });
    draft = addEvent(draft, "b");
    draft = updateEvent(draft, "b", { timeSeconds: "120", type: "DISCONNECTION" });

    expect(eventsInTimeOrder(draft.events)).toBe(false);

    const { body, eventKeys } = toUpsertCase(draft);

    expect(body?.events).toEqual([
      { simTimeMs: 120_000, type: "DISCONNECTION" },
      { simTimeMs: 600_000, type: "BRONCHOSPASM", resistanceFactor: 2 },
    ]);
    expect(eventKeys).toEqual(["b", "a"]);
    expect(sortDraftEvents(draft).events.map((event) => event.key)).toEqual(["b", "a"]);
    expect(removeEvent(draft, "a").events.map((event) => event.key)).toEqual(["b"]);
  });

  it("a new type drops the parameters of the old one and requires one of its own", () => {
    let draft = validDraft();
    const key = draft.events[0]!.key;

    draft = updateEvent(draft, key, { type: "DERECRUITMENT" });

    expect(draft.events[0]!.params.resistanceFactor).toBe("");
    expect(toUpsertCase(draft).errors[`events.${key}`]).toBe("Indica al menos un parámetro de este evento.");
  });

  it("checks every value against the vendored physiological ranges", () => {
    const draft = validDraft();
    const { errors } = toUpsertCase({ ...draft, mechanics: { ...draft.mechanics, "mechanics.complianceMlPerCmH2O": "200" }, patientAge: "121" });
    const range = CLINICAL_CASE_PHYSIOLOGICAL_RANGES.complianceMlPerCmH2O;

    expect(errors["mechanics.complianceMlPerCmH2O"]).toBe(RANGE_COPY.outOfRange(`${range.min}–${range.max} mL/cmH2O`));
    expect(errors.patientAge).toMatch(/0–120 años/);
  });

  it("reports a partial mechanics block, a decreasing recruitment PEEP and a target min above its max", () => {
    const draft = validDraft();
    const [first, second] = draft.recruitmentCurve;
    let edited: CaseDraft = { ...draft, mechanics: { ...draft.mechanics, "mechanics.deadSpaceMl": "" } };

    edited = updateCurvePoint(edited, second!.key, { peepCmH2O: first!.peepCmH2O });
    edited = { ...edited, targetRanges: { ...edited.targetRanges, ph: { min: "7.45", max: "7.35" }, paco2MmHg: { min: "35", max: "" } } };

    const { errors } = toUpsertCase(edited);

    expect(errors["mechanics.deadSpaceMl"]).toMatch(/bloque se guarda completo/);
    expect(errors[`mechanics.recruitmentCurve.${second!.key}.peepCmH2O`]).toMatch(/mayor que la del punto anterior/);
    expect(errors["targets.ph.min"]).toMatch(/mínimo no puede ser mayor/);
    expect(errors["targets.paco2MmHg.max"]).toMatch(/mínimo y el máximo/);
    expect(MECHANICS_FIELDS.length).toBe(19);
  });

  it("applies the engine ventilator validation and the rubric rules", () => {
    const draft = validDraft();
    // RR 40 → 1.5 s cycle; Ti 1.5 leaves no expiratory time.
    const timing = applyVentilatorChanges(draft, { respiratoryRateBpm: 40, inspiratoryTimeS: 1.5 });
    const rubric = { ...draft, rubric: { ...draft.rubric!, passingScore: "120" } };

    expect(toUpsertCase(timing).errors.initialVentilatorSettings).toMatch(/tiempo espiratorio/);
    expect(toUpsertCase(rubric).errors.defaultRubric).toMatch(/^Revisa la rúbrica por defecto/);
  });

  it("adds curve points with the given key", () => {
    expect(addCurvePoint(emptyCaseDraft(), "k1").recruitmentCurve).toEqual([{ key: "k1", peepCmH2O: "", shuntFraction: "" }]);
  });

  it("tells a changed draft from an unchanged one", () => {
    const draft = validDraft();

    expect(sameDraft(draft, caseDraftFromDefinition(definitionDto("c1")))).toBe(true);
    expect(sameDraft(draft, { ...draft, title: "Otro" })).toBe(false);
  });
});

describe("predicted body weight", () => {
  it("uses the engine formula once sex and a plausible height are known", () => {
    const draft = { ...emptyCaseDraft(), patientSex: "MALE" as const, patientHeightCm: "175" };

    expect(draftPredictedBodyWeightKg(draft)).toBeCloseTo(predictedBodyWeightKg("MALE", 175), 6);
    expect(draftPredictedBodyWeightKg(draft)).toBeCloseTo(70.6, 1);
    expect(draftPredictedBodyWeightKg({ ...draft, patientSex: "" })).toBeNull();
    expect(draftPredictedBodyWeightKg({ ...draft, patientHeightCm: "90" })).toBeNull();
  });
});

describe("physiological ranges", () => {
  it("formats the vendored ranges in display units", () => {
    expect(formatRange("deadSpaceMl")).toBe("50–500 mL");
    expect(formatRange("effortRateBpm")).toBe("0–45 resp/min");
    expect(formatRange("eventTimeMs", { scale: 1 / 1000, unit: "s" })).toBe("0–14.400 s");
    expect(isOutOfRange("fio2", 0.2)).toBe(true);
    expect(isOutOfRange("fio2", 0.21)).toBe(false);
    expect(isOutOfRange("fio2", Number.NaN)).toBe(true);
  });
});

describe("case list", () => {
  it("sends only the chosen filters, newest first", () => {
    expect(toCaseListQuery(NO_CASE_LIST_FILTERS, 2, 10)).toEqual({ page: 2, limit: 10, sortOrder: "desc" });
    expect(toCaseListQuery({ status: "DRAFT", pathology: "EPOC", difficulty: "" }, 1, 10)).toEqual({
      page: 1, limit: 10, sortOrder: "desc", status: "DRAFT", pathology: "EPOC",
    });
  });

  it("knows a row status only while filtered by one, and offers the status changes", () => {
    expect(toCaseListRow(caseItemDto("c1"), "").status).toBeNull();
    expect(toCaseListRow(caseItemDto("c1"), "ARCHIVED").status).toBe("ARCHIVED");
    // Unfiltered view: the stored status is unknown, so no status change is offered (the page shows a hint).
    expect(statusActionsFor(null)).toEqual([]);
    expect(statusActionsFor("DRAFT")).toEqual(["publish", "archive"]);
    expect(statusActionsFor("PUBLISHED")).toEqual(["archive"]);
    expect(statusActionsFor("ARCHIVED")).toEqual(["publish"]);
  });
});

describe("server field errors", () => {
  const keys = { eventKeys: ["e-a", "e-b"], curveKeys: ["p-a"] };

  it("reads the field path from the 422 and 400 messages", () => {
    expect(serverErrorPath("clinical-cases.physiological_range_violation", "mechanics.deadSpaceMl = 600 está fuera del rango 50-500 mL")).toBe("mechanics.deadSpaceMl");
    expect(serverErrorPath("clinical-cases.invalid_definition", "La definición del caso clínico es inconsistente en events[1].simTimeMs")).toBe("events[1].simTimeMs");
    expect(serverErrorPath("common.validation", "x")).toBeNull();
  });

  it("maps indices to row keys and whole-section fields", () => {
    expect(toDraftFieldId("events[1].resistanceFactor", keys)).toBe("events.e-b.resistanceFactor");
    expect(toDraftFieldId("mechanics.recruitmentCurve[0].shuntFraction", keys)).toBe("mechanics.recruitmentCurve.p-a.shuntFraction");
    expect(toDraftFieldId("initialVentilatorSettings.inspiratoryTimeS", keys)).toBe("initialVentilatorSettings");
    expect(toDraftFieldId("defaultRubric.criteria[0].weight", keys)).toBe("defaultRubric");
    expect(toDraftFieldId("events[9].type", keys)).toBeNull();
  });

  it("keeps a page-level message when the error has no field", () => {
    const rangeError = new ApiError({ status: 422, code: "clinical-cases.physiological_range_violation", message: "patientWeight = 400 is outside 1-350 kg" });
    const conflict = new ApiError({ status: 409, code: "clinical-cases.clinical_case_has_simulation_sessions", message: "x" });

    expect(mapSaveError(rangeError, keys)).toMatchObject({ field: "patientWeight" });
    expect(mapSaveError(conflict, keys)).toEqual({ field: null, message: "El caso ya tiene sesiones de simulación: duplícalo para cambiar su definición." });
  });

  it("falls back to the page message when the mapped field is not one the editor renders", () => {
    const unknownField = new ApiError({ status: 422, code: "clinical-cases.physiological_range_violation", message: "labData.lactate = 40 is outside 0-30 mmol/L" });
    const rendered = new ApiError({ status: 422, code: "clinical-cases.physiological_range_violation", message: "events[1].resistanceFactor = 9 is outside 1-5" });

    expect(mapSaveError(unknownField, keys)).toEqual({
      field: null,
      message: "El servidor rechazó un valor fuera del rango fisiológicamente plausible. labData.lactate = 40 is outside 0-30 mmol/L",
    });
    expect(mapSaveError(rendered, keys)).toMatchObject({ field: "events.e-b.resistanceFactor" });
    expect(isRenderedFieldId("mechanics.deadSpaceMl", keys)).toBe(true);
    expect(isRenderedFieldId("targets.spo2Percent.min", keys)).toBe(true);
    expect(isRenderedFieldId("targets.plateauPressureMaxCmH2O", keys)).toBe(true);
    expect(isRenderedFieldId("events.e-a", keys)).toBe(true);
    expect(isRenderedFieldId("mechanics.recruitmentCurve.p-a.peepCmH2O", keys)).toBe(true);
    expect(isRenderedFieldId("mechanics.recruitmentCurve.p-z.peepCmH2O", keys)).toBe(false);
    expect(isRenderedFieldId("mechanics.unknown", keys)).toBe(false);
  });
});

describe("review fixes (e45841f / 50ed812)", () => {
  it("reads an event time in whole seconds without float noise", () => {
    const draft = caseDraftFromDefinition(definitionDto("c1", {
      events: [
        { simTimeMs: 700, type: "SECRETIONS", resistanceFactor: 1.5 },
        { simTimeMs: 300_000, type: "SECRETIONS", resistanceFactor: 1.5 },
        { simTimeMs: 1_100, type: "SECRETIONS", resistanceFactor: 1.5 },
      ],
    }));

    expect(draft.events.map((event) => event.timeSeconds)).toEqual(["0.7", "300", "1.1"]);
  });

  it("accepts only plain decimal numbers (comma or dot), nothing Number() would also read", () => {
    expect(parseNumber("1,5")).toBe(1.5);
    expect(parseNumber(" -2.25 ")).toBe(-2.25);
    expect(parseNumber("40")).toBe(40);
    expect(parseNumber("1e3")).toBeNaN();
    expect(parseNumber("0x10")).toBeNaN();
    expect(parseNumber("Infinity")).toBeNaN();
    expect(parseNumber(".5")).toBeNaN();
    expect(parseNumber("5.")).toBeNaN();
    expect(parseNumber("")).toBeNaN();
  });
});
