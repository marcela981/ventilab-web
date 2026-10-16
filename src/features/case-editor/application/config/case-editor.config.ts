/*
* Funcionalidad: Case editor config
* Descripción: Static configuration of the case editor (teachers and admins). The status, pathology, difficulty, sex
*   and event type keys come from the generated contract (label maps typed `satisfies Record<ContractEnum, string>`,
*   so a contract change breaks the build instead of drifting). Every numeric field of the definition names the
*   physiological parameter whose plausible range the backend enforces (the vendored
*   CLINICAL_CASE_PHYSIOLOGICAL_RANGES are the only source of min/max; nothing here bounds a value), its Spanish label
*   and its group. The event parameters per event type follow the contract field descriptions. Also the list page size
*   and the Spanish names of the backend units. Depends on the case editor DTOs and the sim-engine public types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { PhysiologicalParameter } from "@shared/sim-engine";
import type {
  ChangeClinicalCaseStatusDTO,
  ClinicalCaseEventDTO,
  ClinicalCasesQueryDTO,
  UpsertClinicalCaseDTO,
} from "../../api/dtos/case-editor.dto";

export type CaseStatus = ChangeClinicalCaseStatusDTO["status"];
export type CasePathology = UpsertClinicalCaseDTO["pathology"];
export type CaseDifficulty = UpsertClinicalCaseDTO["difficulty"];
export type CaseSex = NonNullable<UpsertClinicalCaseDTO["patientSex"]>;
export type CaseEventType = ClinicalCaseEventDTO["type"];
export type CaseListSortOrder = NonNullable<ClinicalCasesQueryDTO["sortOrder"]>;

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const STATUS_LABELS = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
} as const satisfies Record<CaseStatus, string>;

export const PATHOLOGY_LABELS = {
  EPOC: "EPOC",
  SDRA: "SDRA",
  NEUMONIA: "Neumonía",
  ASMA: "Asma",
  FIBROSIS_PULMONAR: "Fibrosis pulmonar",
  EDEMA_PULMONAR: "Edema pulmonar",
  EMBOLIA_PULMONAR: "Embolia pulmonar",
  TEP: "TEP",
  BRONQUIOLITIS: "Bronquiolitis",
  SINDROME_DE_DISTRES_RESPIRATORIO: "Síndrome de distrés respiratorio",
  OTRAS: "Otras",
  NORMAL: "Normal",
  OBESIDAD: "Obesidad",
  POSTOPERATORIO: "Postoperatorio",
} as const satisfies Record<CasePathology, string>;

export const DIFFICULTY_LABELS = {
  BEGINNER: "Básico",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
} as const satisfies Record<CaseDifficulty, string>;

export const SEX_LABELS = { MALE: "Masculino", FEMALE: "Femenino" } as const satisfies Record<CaseSex, string>;

export const EVENT_TYPE_LABELS = {
  BRONCHOSPASM: "Broncoespasmo",
  SECRETIONS: "Secreciones",
  DERECRUITMENT: "Desreclutamiento",
  DISCONNECTION: "Desconexión",
  RECONNECTION: "Reconexión",
  EFFORT_CHANGE: "Cambio de esfuerzo",
} as const satisfies Record<CaseEventType, string>;

export const CASE_STATUSES = Object.keys(STATUS_LABELS) as CaseStatus[];
export const CASE_PATHOLOGIES = Object.keys(PATHOLOGY_LABELS) as CasePathology[];
export const CASE_DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as CaseDifficulty[];
export const CASE_SEXES = Object.keys(SEX_LABELS) as CaseSex[];
export const CASE_EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as CaseEventType[];

export const CASE_LIST_PAGE_SIZE = 10;

/** One numeric field of the definition: the DTO path, its label and the physiological range the backend enforces. */
export type NumericFieldDefinition = {
  /** DTO path; also the field id of the draft and of the field errors. */
  path: string
  label: string
  parameter: PhysiologicalParameter
};

export type FieldGroup = { id: string, title: string, fields: readonly NumericFieldDefinition[] };

export const PATIENT_FIELDS = {
  patientAge: { path: "patientAge", label: "Edad (años)", parameter: "patientAgeYears" },
  patientHeightCm: { path: "patientHeightCm", label: "Talla (cm)", parameter: "patientHeightCm" },
  patientWeight: { path: "patientWeight", label: "Peso real (kg)", parameter: "patientWeightKg" },
} as const satisfies Record<string, NumericFieldDefinition>;

/** Mechanics fields of ClinicalCaseMechanicsDTO (every one is required once the block is sent). */
export const MECHANICS_GROUPS: readonly FieldGroup[] = [
  {
    id: "respiratory",
    title: "Mecánica respiratoria",
    fields: [
      { path: "mechanics.complianceMlPerCmH2O", label: "Distensibilidad estática (C)", parameter: "complianceMlPerCmH2O" },
      { path: "mechanics.resistanceCmH2OPerLps", label: "Resistencia de la vía aérea (R)", parameter: "resistanceCmH2OPerLps" },
      { path: "mechanics.deadSpaceMl", label: "Espacio muerto (VD)", parameter: "deadSpaceMl" },
      { path: "mechanics.basalShuntFraction", label: "Fracción de shunt basal", parameter: "shuntFraction" },
    ],
  },
  {
    id: "metabolism",
    title: "Metabolismo e intercambio gaseoso",
    fields: [
      { path: "mechanics.vco2MlPerMin", label: "Producción de CO2 (VCO2)", parameter: "vco2MlPerMin" },
      { path: "mechanics.bicarbonateMmolPerL", label: "Bicarbonato (HCO3)", parameter: "bicarbonateMmolPerL" },
      { path: "mechanics.hemoglobinGPerDl", label: "Hemoglobina", parameter: "hemoglobinGPerDl" },
      { path: "mechanics.arteriovenousO2DifferenceMlPerDl", label: "Diferencia arteriovenosa de O2", parameter: "arteriovenousO2DifferenceMlPerDl" },
      { path: "mechanics.gasTimeConstants.paco2TimeConstantMin", label: "Constante de tiempo de PaCO2", parameter: "paco2TimeConstantMin" },
      { path: "mechanics.gasTimeConstants.oxygenTimeConstantS", label: "Constante de tiempo de oxigenación", parameter: "oxygenTimeConstantS" },
    ],
  },
  {
    id: "effort",
    title: "Esfuerzo del paciente",
    fields: [
      { path: "mechanics.patientEffort.amplitudeCmH2O", label: "Amplitud del esfuerzo (0 = sin esfuerzo)", parameter: "effortAmplitudeCmH2O" },
      { path: "mechanics.patientEffort.rateBpm", label: "Frecuencia del esfuerzo", parameter: "effortRateBpm" },
      { path: "mechanics.patientEffort.inspiratoryFraction", label: "Fracción inspiratoria (Ti/Ttot)", parameter: "inspiratoryFraction" },
    ],
  },
  {
    id: "hemodynamics",
    title: "Efecto hemodinámico",
    fields: [
      { path: "mechanics.hemodynamics.baselineMapMmHg", label: "PAM basal", parameter: "baselineMapMmHg" },
      { path: "mechanics.hemodynamics.meanAirwayPressureThresholdCmH2O", label: "Umbral de presión media de vía aérea", parameter: "meanAirwayPressureThresholdCmH2O" },
      { path: "mechanics.hemodynamics.mapDropPerCmH2O", label: "Caída de PAM por cmH2O sobre el umbral", parameter: "mapDropPerCmH2O" },
    ],
  },
  {
    id: "deterioration",
    title: "Deterioro progresivo",
    fields: [
      { path: "mechanics.deterioration.ratePerMin", label: "Velocidad de deterioro", parameter: "deteriorationRatePerMin" },
      { path: "mechanics.deterioration.maxComplianceLossFraction", label: "Pérdida máxima de distensibilidad", parameter: "maxComplianceLossFraction" },
      { path: "mechanics.deterioration.maxShuntIncrease", label: "Aumento máximo de shunt", parameter: "maxShuntIncrease" },
    ],
  },
];

export const MECHANICS_FIELDS: readonly NumericFieldDefinition[] = MECHANICS_GROUPS.flatMap((group) => group.fields);

export const RECRUITMENT_FIELDS = {
  peepCmH2O: { path: "peepCmH2O", label: "PEEP", parameter: "recruitmentPeepCmH2O" },
  shuntFraction: { path: "shuntFraction", label: "Fracción de shunt", parameter: "shuntFraction" },
} as const satisfies Record<string, NumericFieldDefinition>;

export const INITIAL_STATE_FIELDS: readonly NumericFieldDefinition[] = [
  { path: "initialState.paco2MmHg", label: "PaCO2 inicial", parameter: "paco2MmHg" },
  { path: "initialState.pao2MmHg", label: "PaO2 inicial", parameter: "pao2MmHg" },
];

export type CaseEventParameter = "resistanceFactor" | "complianceFactor" | "shuntIncrease" | "effortAmplitudeCmH2O" | "effortRateBpm";

export const EVENT_PARAMETER_FIELDS = {
  resistanceFactor: { path: "resistanceFactor", label: "Multiplicador de resistencia", parameter: "eventResistanceFactor" },
  complianceFactor: { path: "complianceFactor", label: "Multiplicador de distensibilidad", parameter: "eventComplianceFactor" },
  shuntIncrease: { path: "shuntIncrease", label: "Shunt añadido", parameter: "eventShuntIncrease" },
  effortAmplitudeCmH2O: { path: "effortAmplitudeCmH2O", label: "Nueva amplitud del esfuerzo", parameter: "effortAmplitudeCmH2O" },
  effortRateBpm: { path: "effortRateBpm", label: "Nueva frecuencia del esfuerzo", parameter: "effortRateBpm" },
} as const satisfies Record<CaseEventParameter, NumericFieldDefinition>;

/** Parameters each event type carries, as the ClinicalCaseEventDTO field descriptions state. */
export const EVENT_PARAMETERS_BY_TYPE = {
  BRONCHOSPASM: ["resistanceFactor"],
  SECRETIONS: ["resistanceFactor"],
  DERECRUITMENT: ["complianceFactor", "shuntIncrease"],
  DISCONNECTION: [],
  RECONNECTION: [],
  EFFORT_CHANGE: ["effortAmplitudeCmH2O", "effortRateBpm"],
} as const satisfies Record<CaseEventType, readonly CaseEventParameter[]>;

/** The event time is edited in seconds; its range (eventTimeMs) comes in ms. */
export const EVENT_TIME_FIELD = { path: "simTimeMs", label: "Tiempo (s)", parameter: "eventTimeMs" } as const satisfies NumericFieldDefinition;
export const EVENT_TIME_SCALE = 1 / 1000;

export type TargetRangeKey = "spo2Percent" | "paco2MmHg" | "ph" | "tidalVolumePerKgPbw";
export type TargetMaxKey = "plateauPressureMaxCmH2O" | "drivingPressureMaxCmH2O" | "autoPeepMaxCmH2O";

export const TARGET_RANGE_FIELDS = {
  spo2Percent: { path: "targets.spo2Percent", label: "SpO2", parameter: "spo2Percent" },
  paco2MmHg: { path: "targets.paco2MmHg", label: "PaCO2", parameter: "paco2MmHg" },
  ph: { path: "targets.ph", label: "pH arterial", parameter: "ph" },
  tidalVolumePerKgPbw: { path: "targets.tidalVolumePerKgPbw", label: "Volumen corriente por kg de peso predicho", parameter: "tidalVolumePerKgPbw" },
} as const satisfies Record<TargetRangeKey, NumericFieldDefinition>;

export const TARGET_MAX_FIELDS = {
  plateauPressureMaxCmH2O: { path: "targets.plateauPressureMaxCmH2O", label: "Presión meseta máxima", parameter: "plateauPressureMaxCmH2O" },
  drivingPressureMaxCmH2O: { path: "targets.drivingPressureMaxCmH2O", label: "Presión de conducción máxima", parameter: "drivingPressureMaxCmH2O" },
  autoPeepMaxCmH2O: { path: "targets.autoPeepMaxCmH2O", label: "Auto-PEEP máxima", parameter: "autoPeepMaxCmH2O" },
} as const satisfies Record<TargetMaxKey, NumericFieldDefinition>;

export const TARGET_RANGE_KEYS = Object.keys(TARGET_RANGE_FIELDS) as TargetRangeKey[];
export const TARGET_MAX_KEYS = Object.keys(TARGET_MAX_FIELDS) as TargetMaxKey[];

/** Spanish names of the units the backend ranges carry (unknown units are shown as they come). */
export const UNIT_LABELS: Readonly<Record<string, string>> = {
  years: "años",
  "breaths/min": "resp/min",
  fraction: "fracción",
  multiplier: "×",
  "fraction/min": "fracción/min",
  "mL O2/dL": "mL O2/dL",
  "cmH2O above PEEP": "cmH2O sobre PEEP",
  "% of peak flow": "% del flujo pico",
  pH: "",
  ms: "ms",
};
