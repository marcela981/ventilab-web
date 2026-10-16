/*
* Funcionalidad: Case draft model
* Descripción: Editable draft of a clinical case and its pure mapping to and from the contract. The draft keeps the
*   numbers as typed text (empty = not set; "," accepted as the decimal separator) so a half-typed value is never lost,
*   one stable key per scheduled event and recruitment curve point, the initial ventilator settings as engine
*   settings (what the configure-mode console edits), the default rubric as the shared outcome rubric draft and the
*   laboratory data it does not edit (sent back unchanged). `caseDraftFromDefinition` reads GET /definition (opaque
*   blocks read defensively); `toUpsertCase` builds the POST/PUT body (UpsertClinicalCaseDTO) and the field errors the
*   backend would answer (required fields, numbers, the vendored physiological ranges, complete blocks, ascending
*   recruitment PEEP, target min ≤ max, event parameters of their type, the engine ventilator settings validation and
*   the rubric rules), with the events sorted by time and the keys in DTO order so a server error path
*   (`events[2].simTimeMs`) maps back to its row. Also the event and curve operations, the predicted body weight
*   (engine predictedBodyWeightKg, Devine) and the dirty comparison. Depends on the sim-engine and rubric-editor
*   public APIs, the case editor config, ranges and DTOs.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { outcomeRubricDraftFrom, outcomeRubricDraftIssues, outcomeRubricIssueMessage, toOutcomeRubricValue } from "@shared/rubric-editor";
import type { OutcomeRubricDraft } from "@shared/rubric-editor";
import {
  DEFAULT_VENTILATOR_SETTINGS,
  EngineValidationError,
  predictedBodyWeightKg,
  resolveVentilatorSettings,
  validateVentilatorSettings,
} from "@shared/sim-engine";
import type { VentilatorSettings } from "@shared/sim-engine";
import type {
  ClinicalCaseDefinitionDTO,
  ClinicalCaseEventDTO,
  ClinicalCaseMechanicsDTO,
  ClinicalCaseRubricDTO,
  ClinicalCaseTargetsDTO,
  UpsertClinicalCaseDTO,
} from "../../api/dtos/case-editor.dto";
import {
  CASE_DIFFICULTIES,
  CASE_EVENT_TYPES,
  CASE_PATHOLOGIES,
  CASE_SEXES,
  EVENT_PARAMETER_FIELDS,
  EVENT_PARAMETERS_BY_TYPE,
  EVENT_TIME_FIELD,
  EVENT_TIME_SCALE,
  INITIAL_STATE_FIELDS,
  MECHANICS_FIELDS,
  PATIENT_FIELDS,
  RECRUITMENT_FIELDS,
  TARGET_MAX_FIELDS,
  TARGET_MAX_KEYS,
  TARGET_RANGE_FIELDS,
  TARGET_RANGE_KEYS,
} from "../config/case-editor.config";
import type {
  CaseDifficulty,
  CaseEventParameter,
  CaseEventType,
  CasePathology,
  CaseSex,
  NumericFieldDefinition,
  TargetMaxKey,
  TargetRangeKey,
} from "../config/case-editor.config";
import { formatRange, isOutOfRange, RANGE_COPY } from "./case-ranges.entity";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const DRAFT_COPY = {
  required: "Este campo es obligatorio.",
  notANumber: "Escribe un número.",
  blockIncomplete: "Completa este valor: el bloque se guarda completo o vacío.",
  presentIllnessRequired: "Describe la enfermedad actual para guardar los antecedentes.",
  curveOrder: "La PEEP de cada punto debe ser mayor que la del punto anterior.",
  targetBounds: "Completa el mínimo y el máximo.",
  targetOrder: "El mínimo no puede ser mayor que el máximo.",
  eventParameters: "Indica al menos un parámetro de este evento.",
  ventilatorTiming: "Con esta combinación el tiempo espiratorio queda demasiado corto. Ajusta Ti, la pausa o la FR.",
  ventilatorInvalid: "La combinación de ajustes del ventilador no es válida.",
  rubric: (detail: string) => `Revisa la rúbrica por defecto: ${detail}`,
} as const;

export type CaseEventDraft = {
  key: string
  /** Simulated time in seconds (the contract stores ms). */
  timeSeconds: string
  type: CaseEventType
  params: Record<CaseEventParameter, string>
};

export type RecruitmentPointDraft = { key: string, peepCmH2O: string, shuntFraction: string };

export type TargetRangeDraft = { min: string, max: string };

export type CaseDraft = {
  title: string
  summary: string
  /** Markdown shown to the student as the clinical history of the case. */
  description: string
  difficulty: CaseDifficulty
  pathology: CasePathology
  mainDiagnosis: string
  educationalGoal: string
  /** One per line. */
  comorbidities: string
  presentIllness: string
  /** One per line. */
  relevantHistory: string
  patientSex: CaseSex | ""
  patientAge: string
  patientHeightCm: string
  patientWeight: string
  /** Keyed by the DTO path of MECHANICS_FIELDS. */
  mechanics: Record<string, string>
  recruitmentCurve: RecruitmentPointDraft[]
  /** Keyed by the DTO path of INITIAL_STATE_FIELDS. */
  initialState: Record<string, string>
  /** null: the case has no initial ventilator settings. */
  ventilator: VentilatorSettings | null
  events: CaseEventDraft[]
  targetRanges: Record<TargetRangeKey, TargetRangeDraft>
  targetMax: Record<TargetMaxKey, string>
  /** null: the case has no default rubric. */
  rubric: OutcomeRubricDraft | null
  /** Not edited here: sent back as it came. */
  labData: Record<string, unknown> | null
};

/** Field id (DTO path, or `events.<key>.<field>` / `mechanics.recruitmentCurve.<key>.<field>` for rows) → message. */
export type FieldErrors = Readonly<Record<string, string>>;

export type UpsertMapping = {
  /** null while there is any field error. */
  body: UpsertClinicalCaseDTO | null
  errors: FieldErrors
  /** Row keys in DTO order, to map a server error path (`events[2]`) back to its row. */
  eventKeys: readonly string[]
  curveKeys: readonly string[]
};

const EMPTY_EVENT_PARAMS: Record<CaseEventParameter, string> = {
  resistanceFactor: "",
  complianceFactor: "",
  shuntIncrease: "",
  effortAmplitudeCmH2O: "",
  effortRateBpm: "",
};

function emptyRecord(fields: readonly NumericFieldDefinition[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.path, ""]));
}

export function emptyCaseDraft(): CaseDraft {
  return {
    title: "",
    summary: "",
    description: "",
    difficulty: CASE_DIFFICULTIES[0] as CaseDifficulty,
    pathology: CASE_PATHOLOGIES[0] as CasePathology,
    mainDiagnosis: "",
    educationalGoal: "",
    comorbidities: "",
    presentIllness: "",
    relevantHistory: "",
    patientSex: "",
    patientAge: "",
    patientHeightCm: "",
    patientWeight: "",
    mechanics: emptyRecord(MECHANICS_FIELDS),
    recruitmentCurve: [],
    initialState: emptyRecord(INITIAL_STATE_FIELDS),
    ventilator: { ...DEFAULT_VENTILATOR_SETTINGS },
    events: [],
    targetRanges: {
      spo2Percent: { min: "", max: "" },
      paco2MmHg: { min: "", max: "" },
      ph: { min: "", max: "" },
      tidalVolumePerKgPbw: { min: "", max: "" },
    },
    targetMax: { plateauPressureMaxCmH2O: "", drivingPressureMaxCmH2O: "", autoPeepMaxCmH2O: "" },
    rubric: null,
    labData: null,
  };
}

// ---- reading the definition --------------------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Value at a dotted path of an opaque object. */
function at(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => (isRecord(current) ? current[part] : undefined), source);
}

function numberText(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function lines(values: unknown): string {
  return Array.isArray(values) ? values.filter((item): item is string => typeof item === "string").join("\n") : "";
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? value as T : fallback;
}

function readEvent(raw: unknown, index: number): CaseEventDraft {
  const event = isRecord(raw) ? raw : {};
  const type = oneOf(event.type, CASE_EVENT_TYPES, CASE_EVENT_TYPES[0] as CaseEventType);
  const timeMs = typeof event.simTimeMs === "number" && Number.isFinite(event.simTimeMs) ? event.simTimeMs : null;

  return {
    key: `event-${index}`,
    timeSeconds: timeMs === null ? "" : String(timeMs * EVENT_TIME_SCALE),
    type,
    params: {
      resistanceFactor: numberText(event.resistanceFactor),
      complianceFactor: numberText(event.complianceFactor),
      shuntIncrease: numberText(event.shuntIncrease),
      effortAmplitudeCmH2O: numberText(event.effortAmplitudeCmH2O),
      effortRateBpm: numberText(event.effortRateBpm),
    },
  };
}

function readVentilator(raw: unknown): VentilatorSettings | null {
  return isRecord(raw) ? resolveVentilatorSettings(raw as Partial<VentilatorSettings>) : null;
}

/** Draft of a stored case (GET /definition). */
export function caseDraftFromDefinition(definition: ClinicalCaseDefinitionDTO): CaseDraft {
  const empty = emptyCaseDraft();
  const mechanics = definition.mechanics;
  const curve = at(mechanics, "recruitmentCurve");
  const targets = definition.targets;

  return {
    ...empty,
    title: definition.title,
    summary: definition.summary ?? "",
    description: definition.description,
    difficulty: oneOf(definition.difficulty, CASE_DIFFICULTIES, empty.difficulty),
    pathology: oneOf(definition.pathology, CASE_PATHOLOGIES, empty.pathology),
    mainDiagnosis: definition.mainDiagnosis,
    educationalGoal: definition.educationalGoal,
    comorbidities: lines(definition.comorbidities),
    presentIllness: text(at(definition.history, "presentIllness")),
    relevantHistory: lines(at(definition.history, "relevantHistory")),
    patientSex: definition.patientSex ? oneOf<CaseSex | "">(definition.patientSex, CASE_SEXES, "") : "",
    patientAge: numberText(definition.patientAge),
    patientHeightCm: numberText(definition.patientHeightCm),
    patientWeight: numberText(definition.patientWeight),
    mechanics: Object.fromEntries(MECHANICS_FIELDS.map((field) => [field.path, numberText(at({ mechanics }, field.path))])),
    recruitmentCurve: Array.isArray(curve)
      ? curve.map((point: unknown, index: number) => ({
        key: `point-${index}`,
        peepCmH2O: numberText(at(point, "peepCmH2O")),
        shuntFraction: numberText(at(point, "shuntFraction")),
      }))
      : [],
    initialState: Object.fromEntries(INITIAL_STATE_FIELDS.map((field) => [
      field.path,
      numberText(at({ initialState: definition.initialState }, field.path)),
    ])),
    ventilator: readVentilator(definition.initialVentilatorSettings),
    events: definition.events.map(readEvent),
    targetRanges: {
      spo2Percent: { min: numberText(at(targets, "spo2Percent.min")), max: numberText(at(targets, "spo2Percent.max")) },
      paco2MmHg: { min: numberText(at(targets, "paco2MmHg.min")), max: numberText(at(targets, "paco2MmHg.max")) },
      ph: { min: numberText(at(targets, "ph.min")), max: numberText(at(targets, "ph.max")) },
      tidalVolumePerKgPbw: { min: numberText(at(targets, "tidalVolumePerKgPbw.min")), max: numberText(at(targets, "tidalVolumePerKgPbw.max")) },
    },
    targetMax: {
      plateauPressureMaxCmH2O: numberText(at(targets, "plateauPressureMaxCmH2O")),
      drivingPressureMaxCmH2O: numberText(at(targets, "drivingPressureMaxCmH2O")),
      autoPeepMaxCmH2O: numberText(at(targets, "autoPeepMaxCmH2O")),
    },
    rubric: definition.defaultRubric ? outcomeRubricDraftFrom(definition.defaultRubric) : null,
    labData: isRecord(definition.labData) ? definition.labData : null,
  };
}

// ---- building the body --------------------------------------------------------------------------------------------

/** A number for a typed text ("," accepted as the decimal separator); NaN when empty or not numeric. */
export function parseNumber(value: string): number {
  const trimmed = value.trim().replace(",", ".");

  return trimmed === "" ? Number.NaN : Number(trimmed);
}

function isBlank(value: string): boolean {
  return value.trim() === "";
}

function toLines(value: string): string[] {
  return value.split("\n").map((line) => line.trim()).filter((line) => line !== "");
}

/** Collects field errors while the body is built. */
class ErrorCollector {
  public readonly errors: Record<string, string> = {};

  public add(field: string, message: string): void {
    if (!(field in this.errors)) {
      this.errors[field] = message;
    }
  }

  /** The stored number of a required numeric text inside its physiological range; null (with an error) otherwise. */
  public number(field: string, value: string, definition: NumericFieldDefinition, scale: number = 1): number | null {
    if (isBlank(value)) {
      this.add(field, DRAFT_COPY.required);

      return null;
    }

    const parsed = parseNumber(value);

    if (!Number.isFinite(parsed)) {
      this.add(field, DRAFT_COPY.notANumber);

      return null;
    }

    const stored = scale === 1 ? parsed : Math.round(parsed / scale);

    if (isOutOfRange(definition.parameter, stored)) {
      this.add(field, RANGE_COPY.outOfRange(scale === 1 ? formatRange(definition.parameter) : formatRange(definition.parameter, { scale, unit: "s" })));

      return null;
    }

    return stored;
  }

  /** Optional numeric text: undefined when empty. */
  public optionalNumber(field: string, value: string, definition: NumericFieldDefinition): number | null | undefined {
    return isBlank(value) ? undefined : this.number(field, value, definition);
  }
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = target;

  parts.slice(0, -1).forEach((part) => {
    if (!isRecord(current[part])) {
      current[part] = {};
    }

    current = current[part] as Record<string, unknown>;
  });
  current[parts[parts.length - 1] as string] = value;
}

function buildMechanics(draft: CaseDraft, collector: ErrorCollector, curveKeys: string[]): ClinicalCaseMechanicsDTO | undefined {
  const anyValue = MECHANICS_FIELDS.some((field) => !isBlank(draft.mechanics[field.path] ?? "")) || draft.recruitmentCurve.length > 0;

  if (!anyValue) {
    return undefined;
  }

  const root: Record<string, unknown> = {};

  MECHANICS_FIELDS.forEach((field) => {
    const value = draft.mechanics[field.path] ?? "";

    if (isBlank(value)) {
      collector.add(field.path, DRAFT_COPY.blockIncomplete);

      return;
    }

    setPath(root, field.path, collector.number(field.path, value, field));
  });

  let previousPeep: number | null = null;
  const curve = draft.recruitmentCurve.map((point) => {
    const base = `mechanics.recruitmentCurve.${point.key}`;
    const peep = collector.number(`${base}.peepCmH2O`, point.peepCmH2O, RECRUITMENT_FIELDS.peepCmH2O);
    const shunt = collector.number(`${base}.shuntFraction`, point.shuntFraction, RECRUITMENT_FIELDS.shuntFraction);

    if (peep !== null && previousPeep !== null && peep <= previousPeep) {
      collector.add(`${base}.peepCmH2O`, DRAFT_COPY.curveOrder);
    }

    previousPeep = peep ?? previousPeep;
    curveKeys.push(point.key);

    return { peepCmH2O: peep ?? 0, shuntFraction: shunt ?? 0 };
  });

  setPath(root, "mechanics.recruitmentCurve", curve);

  return root.mechanics as ClinicalCaseMechanicsDTO;
}

function buildInitialState(draft: CaseDraft, collector: ErrorCollector): UpsertClinicalCaseDTO["initialState"] {
  if (INITIAL_STATE_FIELDS.every((field) => isBlank(draft.initialState[field.path] ?? ""))) {
    return undefined;
  }

  const root: Record<string, unknown> = {};

  INITIAL_STATE_FIELDS.forEach((field) => {
    const value = draft.initialState[field.path] ?? "";

    if (isBlank(value)) {
      collector.add(field.path, DRAFT_COPY.blockIncomplete);
    } else {
      setPath(root, field.path, collector.number(field.path, value, field));
    }
  });

  return root.initialState as UpsertClinicalCaseDTO["initialState"];
}

function buildVentilator(draft: CaseDraft, collector: ErrorCollector): UpsertClinicalCaseDTO["initialVentilatorSettings"] {
  if (!draft.ventilator) {
    return undefined;
  }

  try {
    validateVentilatorSettings(resolveVentilatorSettings(draft.ventilator));
  } catch (error) {
    const timing = error instanceof EngineValidationError && error.code === "INVALID_TIMING";

    collector.add("initialVentilatorSettings", timing ? DRAFT_COPY.ventilatorTiming : DRAFT_COPY.ventilatorInvalid);
  }

  return { ...draft.ventilator };
}

/** Events sorted by time (stable; rows without a valid time last), as the contract requires non-decreasing times. */
export function sortEventsByTime(events: readonly CaseEventDraft[]): CaseEventDraft[] {
  const timeOf = (event: CaseEventDraft): number => {
    const value = parseNumber(event.timeSeconds);

    return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  };

  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => timeOf(a.event) - timeOf(b.event) || a.index - b.index)
    .map(({ event }) => event);
}

export function eventsInTimeOrder(events: readonly CaseEventDraft[]): boolean {
  return sortEventsByTime(events).every((event, index) => event === events[index]);
}

function buildEvents(draft: CaseDraft, collector: ErrorCollector, eventKeys: string[]): ClinicalCaseEventDTO[] {
  return sortEventsByTime(draft.events).map((event) => {
    const base = `events.${event.key}`;
    const timeMs = collector.number(`${base}.simTimeMs`, event.timeSeconds, EVENT_TIME_FIELD, EVENT_TIME_SCALE);
    const dto: ClinicalCaseEventDTO = { simTimeMs: timeMs ?? 0, type: event.type };
    const allowed: readonly CaseEventParameter[] = EVENT_PARAMETERS_BY_TYPE[event.type];
    const present = allowed.filter((parameter) => !isBlank(event.params[parameter]));

    if (allowed.length > 0 && present.length === 0) {
      collector.add(base, DRAFT_COPY.eventParameters);
    }

    present.forEach((parameter) => {
      const value = collector.number(`${base}.${parameter}`, event.params[parameter], EVENT_PARAMETER_FIELDS[parameter]);

      if (value !== null) {
        dto[parameter] = value;
      }
    });

    eventKeys.push(event.key);

    return dto;
  });
}

function buildTargets(draft: CaseDraft, collector: ErrorCollector): ClinicalCaseTargetsDTO | undefined {
  const targets: Record<string, unknown> = {};

  TARGET_RANGE_KEYS.forEach((key) => {
    const field = TARGET_RANGE_FIELDS[key];
    const range = draft.targetRanges[key];

    if (isBlank(range.min) && isBlank(range.max)) {
      return;
    }

    if (isBlank(range.min) || isBlank(range.max)) {
      collector.add(isBlank(range.min) ? `${field.path}.min` : `${field.path}.max`, DRAFT_COPY.targetBounds);

      return;
    }

    const min = collector.number(`${field.path}.min`, range.min, field);
    const max = collector.number(`${field.path}.max`, range.max, field);

    if (min !== null && max !== null && min > max) {
      collector.add(`${field.path}.min`, DRAFT_COPY.targetOrder);
    }

    targets[key] = { min: min ?? 0, max: max ?? 0 };
  });

  TARGET_MAX_KEYS.forEach((key) => {
    const field = TARGET_MAX_FIELDS[key];
    const value = collector.optionalNumber(field.path, draft.targetMax[key], field);

    if (typeof value === "number") {
      targets[key] = value;
    }
  });

  return Object.keys(targets).length > 0 ? targets as ClinicalCaseTargetsDTO : undefined;
}

function buildRubric(draft: CaseDraft, collector: ErrorCollector): ClinicalCaseRubricDTO | undefined {
  if (!draft.rubric) {
    return undefined;
  }

  const [issue] = outcomeRubricDraftIssues(draft.rubric);
  const value = toOutcomeRubricValue(draft.rubric);

  if (issue || !value) {
    collector.add("defaultRubric", DRAFT_COPY.rubric(issue ? outcomeRubricIssueMessage(issue) : ""));

    return undefined;
  }

  return value as ClinicalCaseRubricDTO;
}

function requiredText(collector: ErrorCollector, field: string, value: string): string {
  if (isBlank(value)) {
    collector.add(field, DRAFT_COPY.required);
  }

  return value.trim();
}

/** The POST/PUT body of the draft and the errors the backend would answer (body null while there is any). */
export function toUpsertCase(draft: CaseDraft): UpsertMapping {
  const collector = new ErrorCollector();
  const eventKeys: string[] = [];
  const curveKeys: string[] = [];
  const title = requiredText(collector, "title", draft.title);
  const description = requiredText(collector, "description", draft.description);
  const mainDiagnosis = requiredText(collector, "mainDiagnosis", draft.mainDiagnosis);
  const educationalGoal = requiredText(collector, "educationalGoal", draft.educationalGoal);
  const patientAge = collector.number("patientAge", draft.patientAge, PATIENT_FIELDS.patientAge);
  const patientWeight = collector.number("patientWeight", draft.patientWeight, PATIENT_FIELDS.patientWeight);
  const patientHeightCm = collector.optionalNumber("patientHeightCm", draft.patientHeightCm, PATIENT_FIELDS.patientHeightCm);
  const relevantHistory = toLines(draft.relevantHistory);

  if (isBlank(draft.presentIllness) && relevantHistory.length > 0) {
    collector.add("history.presentIllness", DRAFT_COPY.presentIllnessRequired);
  }

  const body: UpsertClinicalCaseDTO = {
    title,
    description,
    patientAge: patientAge ?? 0,
    patientWeight: patientWeight ?? 0,
    mainDiagnosis,
    comorbidities: toLines(draft.comorbidities),
    difficulty: draft.difficulty,
    pathology: draft.pathology,
    educationalGoal,
    events: buildEvents(draft, collector, eventKeys),
  };
  const mechanics = buildMechanics(draft, collector, curveKeys);
  const initialState = buildInitialState(draft, collector);
  const initialVentilatorSettings = buildVentilator(draft, collector);
  const targets = buildTargets(draft, collector);
  const defaultRubric = buildRubric(draft, collector);

  if (!isBlank(draft.summary)) {
    body.summary = draft.summary.trim();
  }

  if (!isBlank(draft.presentIllness)) {
    body.history = { presentIllness: draft.presentIllness.trim(), relevantHistory };
  }

  if (draft.patientSex !== "") {
    body.patientSex = draft.patientSex;
  }

  if (typeof patientHeightCm === "number") {
    body.patientHeightCm = patientHeightCm;
  }

  if (mechanics) {
    body.mechanics = mechanics;
  }

  if (initialState) {
    body.initialState = initialState;
  }

  if (initialVentilatorSettings) {
    body.initialVentilatorSettings = initialVentilatorSettings;
  }

  if (targets) {
    body.targets = targets;
  }

  if (defaultRubric) {
    body.defaultRubric = defaultRubric;
  }

  if (draft.labData) {
    // The generated type of the free JSON object is `Record<string, never>`; the stored object goes back unchanged.
    body.labData = draft.labData as unknown as NonNullable<UpsertClinicalCaseDTO["labData"]>;
  }

  const errors = collector.errors;

  return { body: Object.keys(errors).length === 0 ? body : null, errors, eventKeys, curveKeys };
}

// ---- operations ---------------------------------------------------------------------------------------------------

export function addEvent(draft: CaseDraft, key: string): CaseDraft {
  const last = draft.events.at(-1);

  return {
    ...draft,
    events: [...draft.events, { key, timeSeconds: last ? last.timeSeconds : "0", type: CASE_EVENT_TYPES[0] as CaseEventType, params: { ...EMPTY_EVENT_PARAMS } }],
  };
}

export function updateEvent(draft: CaseDraft, key: string, patch: Partial<Omit<CaseEventDraft, "key">>): CaseDraft {
  return {
    ...draft,
    events: draft.events.map((event) => {
      if (event.key !== key) {
        return event;
      }

      // Another type keeps only the parameters it carries.
      const params = patch.type && patch.type !== event.type ? { ...EMPTY_EVENT_PARAMS } : event.params;

      return { ...event, params, ...patch };
    }),
  };
}

export function updateEventParameter(draft: CaseDraft, key: string, parameter: CaseEventParameter, value: string): CaseDraft {
  return {
    ...draft,
    events: draft.events.map((event) => (event.key === key ? { ...event, params: { ...event.params, [parameter]: value } } : event)),
  };
}

export function removeEvent(draft: CaseDraft, key: string): CaseDraft {
  return { ...draft, events: draft.events.filter((event) => event.key !== key) };
}

export function sortDraftEvents(draft: CaseDraft): CaseDraft {
  return { ...draft, events: sortEventsByTime(draft.events) };
}

export function addCurvePoint(draft: CaseDraft, key: string): CaseDraft {
  return { ...draft, recruitmentCurve: [...draft.recruitmentCurve, { key, peepCmH2O: "", shuntFraction: "" }] };
}

export function updateCurvePoint(draft: CaseDraft, key: string, patch: Partial<Omit<RecruitmentPointDraft, "key">>): CaseDraft {
  return { ...draft, recruitmentCurve: draft.recruitmentCurve.map((point) => (point.key === key ? { ...point, ...patch } : point)) };
}

export function removeCurvePoint(draft: CaseDraft, key: string): CaseDraft {
  return { ...draft, recruitmentCurve: draft.recruitmentCurve.filter((point) => point.key !== key) };
}

/** Settings after a configure-mode confirmation (engine setting changes); without settings, over the engine defaults. */
export function mergeVentilatorChanges(settings: VentilatorSettings | null, changes: Partial<VentilatorSettings>): VentilatorSettings {
  return { ...(settings ?? DEFAULT_VENTILATOR_SETTINGS), ...changes };
}

/** Writes a configure-mode confirmation into the draft settings. */
export function applyVentilatorChanges(draft: CaseDraft, changes: Partial<VentilatorSettings>): CaseDraft {
  return { ...draft, ventilator: mergeVentilatorChanges(draft.ventilator, changes) };
}

/** Predicted body weight (engine Devine formula) of the draft patient; null without a sex and a plausible height. */
export function draftPredictedBodyWeightKg(draft: CaseDraft): number | null {
  const height = parseNumber(draft.patientHeightCm);

  if (draft.patientSex === "" || isOutOfRange(PATIENT_FIELDS.patientHeightCm.parameter, height)) {
    return null;
  }

  return predictedBodyWeightKg(draft.patientSex, height);
}

/** Same content (the dirty check): the draft is plain data built in a fixed key order. */
export function sameDraft(a: CaseDraft, b: CaseDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
