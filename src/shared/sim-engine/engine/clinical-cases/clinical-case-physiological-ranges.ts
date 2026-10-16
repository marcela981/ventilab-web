/*
* Funcionalidad: Rangos fisiológicos de casos clínicos
* Descripción: GENERATED — do not edit; run node scripts/sync-sim-engine.mjs. Vendored copy of ventylab-server/src/features/clinical-cases/domain/clinical-case-physiological-ranges.ts. Mínimo, máximo, unidad y referencia bibliográfica de cada parámetro de la definición simulable de un caso clínico; un valor fuera de rango se rechaza como fisiológicamente implausible
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/
// @ts-nocheck -- vendored backend engine, type-checked by ventylab-server's tsc
export interface PhysiologicalRange {
  readonly min: number;
  readonly max: number;
  readonly unit: string;
  readonly reference: string;
}

export type PhysiologicalParameter =
  | "patientAgeYears"
  | "patientWeightKg"
  | "patientHeightCm"
  | "complianceMlPerCmH2O"
  | "resistanceCmH2OPerLps"
  | "deadSpaceMl"
  | "vco2MlPerMin"
  | "bicarbonateMmolPerL"
  | "hemoglobinGPerDl"
  | "arteriovenousO2DifferenceMlPerDl"
  | "shuntFraction"
  | "recruitmentPeepCmH2O"
  | "effortAmplitudeCmH2O"
  | "effortRateBpm"
  | "inspiratoryFraction"
  | "baselineMapMmHg"
  | "meanAirwayPressureThresholdCmH2O"
  | "mapDropPerCmH2O"
  | "paco2TimeConstantMin"
  | "oxygenTimeConstantS"
  | "deteriorationRatePerMin"
  | "maxComplianceLossFraction"
  | "maxShuntIncrease"
  | "paco2MmHg"
  | "pao2MmHg"
  | "tidalVolumeMl"
  | "respiratoryRateBpm"
  | "peepCmH2O"
  | "fio2"
  | "inspiratoryTimeS"
  | "inspiratoryPauseS"
  | "inspiratoryPressureCmH2O"
  | "pressureSupportCmH2O"
  | "flowTriggerLpm"
  | "pressureTriggerCmH2O"
  | "cycleOffPercent"
  | "apneaTimeS"
  | "spo2Percent"
  | "ph"
  | "plateauPressureMaxCmH2O"
  | "drivingPressureMaxCmH2O"
  | "tidalVolumePerKgPbw"
  | "autoPeepMaxCmH2O"
  | "eventTimeMs"
  | "eventResistanceFactor"
  | "eventComplianceFactor"
  | "eventShuntIncrease";

const HESS_KACMAREK: string = "Hess DR, Kacmarek RM. Essentials of Mechanical Ventilation, 4th ed. McGraw-Hill; 2019";
const WEST: string = "West JB, Luks AM. West's Respiratory Physiology: The Essentials, 10th ed. Wolters Kluwer; 2016";
const MARINI_DRIES: string = "Marini JJ, Dries DJ. Critical Care Medicine: The Essentials and More, 5th ed. Wolters Kluwer; 2019";
const ARDSNET: string = "ARDS Network. Ventilation with lower tidal volumes as compared with traditional tidal volumes for ALI and ARDS. N Engl J Med 2000;342:1301-8";
const GATTINONI_PESENTI: string = "Gattinoni L, Pesenti A. The concept of 'baby lung'. Intensive Care Med 2005;31:776-84";
const TOBIN_PRINCIPLES: string = "Tobin MJ. Principles and Practice of Mechanical Ventilation, 3rd ed. McGraw-Hill; 2013";
const ENGINE_LIMITS: string = `Ventilator setting limits of the simulation engine (1.0.0), within the adjustable ranges of ICU ventilators (${HESS_KACMAREK})`;
const SCENARIO_PARAMETER: string = "Scenario design parameter of the simulation model, not a measured physiological variable; bounded conservatively";

export const CLINICAL_CASE_PHYSIOLOGICAL_RANGES: Readonly<Record<PhysiologicalParameter, PhysiologicalRange>> = {
  patientAgeYears: { min: 0, max: 120, unit: "years", reference: "Plausibility bound of human age; the legacy catalog is not restricted to adults" },
  patientWeightKg: { min: 1, max: 350, unit: "kg", reference: `Plausibility bound of body weight; ventilation targets use predicted body weight from height (${ARDSNET})` },
  patientHeightCm: { min: 140, max: 215, unit: "cm", reference: `Adult heights for which the predicted body weight formula is applied (${ARDSNET})` },
  complianceMlPerCmH2O: {
    min: 5,
    max: 150,
    unit: "mL/cmH2O",
    reference: `Static compliance ~50-100 mL/cmH2O with normal lungs, ~10-20 in severe ARDS (${GATTINONI_PESENTI}; ${HESS_KACMAREK})`,
  },
  resistanceCmH2OPerLps: {
    min: 3,
    max: 60,
    unit: "cmH2O/L/s",
    reference: `Inspiratory resistance of intubated adults ~5-15 cmH2O/L/s, >20-50 in severe bronchospasm or COPD (${HESS_KACMAREK}; ${MARINI_DRIES})`,
  },
  deadSpaceMl: {
    min: 50,
    max: 500,
    unit: "mL",
    reference: "Anatomic dead space ~1 mL/lb of ideal body weight, ~150 mL (Radford EP. J Appl Physiol 1955;8:107-15); physiological dead space rises in ARDS (Nuckton TJ et al. N Engl J Med 2002;346:1281-6)",
  },
  vco2MlPerMin: { min: 100, max: 450, unit: "mL/min", reference: `Resting CO2 production ~200 mL/min, higher with fever or sepsis (${WEST})` },
  bicarbonateMmolPerL: { min: 10, max: 45, unit: "mmol/L", reference: `Normal 22-26 mmol/L; renal compensation of chronic hypercapnia raises it to ~35-40 (${WEST}; ${MARINI_DRIES})` },
  hemoglobinGPerDl: { min: 6, max: 20, unit: "g/dL", reference: "Normal 12-17 g/dL; restrictive ICU transfusion threshold 7 g/dL (Hebert PC et al. N Engl J Med 1999;340:409-17)" },
  arteriovenousO2DifferenceMlPerDl: { min: 2, max: 8, unit: "mL O2/dL", reference: `Normal arteriovenous O2 content difference ~5 mL/dL (${WEST})` },
  shuntFraction: {
    min: 0,
    max: 0.6,
    unit: "fraction",
    reference: `Normal shunt <=0.05; ~0.3-0.5 in severe ARDS (Dantzker DR et al. Am Rev Respir Dis 1979;120:1039-52; ${GATTINONI_PESENTI})`,
  },
  recruitmentPeepCmH2O: {
    min: 0,
    max: 25,
    unit: "cmH2O",
    reference: "PEEP explored in recruitability studies, 5-15 cmH2O (Gattinoni L et al. N Engl J Med 2006;354:1775-86), and higher PEEP/FiO2 tables up to 24 cmH2O (Brower RG et al. N Engl J Med 2004;351:327-36)",
  },
  effortAmplitudeCmH2O: { min: 0, max: 20, unit: "cmH2O", reference: `Inspiratory muscle pressure ~5-10 cmH2O in tidal breathing, higher in distress (${TOBIN_PRINCIPLES})` },
  effortRateBpm: { min: 0, max: 45, unit: "breaths/min", reference: `Spontaneous rate 12-20 normal, >35 signals distress (${TOBIN_PRINCIPLES})` },
  inspiratoryFraction: { min: 0.2, max: 0.6, unit: "Ti/Ttot", reference: "Duty cycle ~0.35-0.45 in healthy breathing (Tobin MJ et al. Chest 1983;84:202-5)" },
  baselineMapMmHg: { min: 50, max: 120, unit: "mmHg", reference: "Normal mean arterial pressure 70-105 mmHg; resuscitation target >=65 mmHg (Evans L et al. Surviving Sepsis Campaign 2021. Crit Care Med 2021;49:e1063-143)" },
  meanAirwayPressureThresholdCmH2O: {
    min: 5,
    max: 30,
    unit: "cmH2O",
    reference: `${SCENARIO_PARAMETER}; venous return falls as intrathoracic pressure rises (Pinsky MR. Chest 2005;128:592S-7S)`,
  },
  mapDropPerCmH2O: { min: 0, max: 5, unit: "mmHg/cmH2O", reference: `${SCENARIO_PARAMETER}; heart-lung interaction (Pinsky MR. Chest 2005;128:592S-7S)` },
  paco2TimeConstantMin: { min: 1, max: 30, unit: "min", reference: `${SCENARIO_PARAMETER}; body CO2 stores equilibrate over minutes after a ventilation change (${WEST})` },
  oxygenTimeConstantS: { min: 5, max: 300, unit: "s", reference: `${SCENARIO_PARAMETER}; arterial O2 settles within ~5-10 min after an FiO2 change (${HESS_KACMAREK})` },
  deteriorationRatePerMin: { min: 0, max: 0.1, unit: "fraction/min", reference: SCENARIO_PARAMETER },
  maxComplianceLossFraction: { min: 0, max: 0.8, unit: "fraction", reference: SCENARIO_PARAMETER },
  maxShuntIncrease: { min: 0, max: 0.4, unit: "fraction", reference: SCENARIO_PARAMETER },
  paco2MmHg: { min: 15, max: 120, unit: "mmHg", reference: `Normal PaCO2 35-45 mmHg; severe acute hypercapnia rarely exceeds 100 mmHg (${WEST})` },
  pao2MmHg: { min: 30, max: 600, unit: "mmHg", reference: `Severe hypoxemia ~40 mmHg; ceiling set by the alveolar gas equation at FiO2 1.0 at sea level (${WEST})` },
  tidalVolumeMl: { min: 200, max: 800, unit: "mL", reference: ENGINE_LIMITS },
  respiratoryRateBpm: { min: 5, max: 40, unit: "breaths/min", reference: ENGINE_LIMITS },
  peepCmH2O: { min: 0, max: 20, unit: "cmH2O", reference: ENGINE_LIMITS },
  fio2: { min: 0.21, max: 1, unit: "fraction", reference: ENGINE_LIMITS },
  inspiratoryTimeS: { min: 0.5, max: 3, unit: "s", reference: ENGINE_LIMITS },
  inspiratoryPauseS: { min: 0, max: 2, unit: "s", reference: ENGINE_LIMITS },
  inspiratoryPressureCmH2O: { min: 5, max: 40, unit: "cmH2O above PEEP", reference: ENGINE_LIMITS },
  pressureSupportCmH2O: { min: 0, max: 30, unit: "cmH2O above PEEP", reference: ENGINE_LIMITS },
  flowTriggerLpm: { min: 0.5, max: 10, unit: "L/min", reference: ENGINE_LIMITS },
  pressureTriggerCmH2O: { min: 0.5, max: 10, unit: "cmH2O", reference: ENGINE_LIMITS },
  cycleOffPercent: { min: 5, max: 80, unit: "% of peak flow", reference: ENGINE_LIMITS },
  apneaTimeS: { min: 10, max: 60, unit: "s", reference: ENGINE_LIMITS },
  spo2Percent: { min: 70, max: 100, unit: "%", reference: `SpO2 goals 88-95% in ARDS (${ARDSNET}) and 88-92% in hypercapnic COPD (GOLD 2024 report)` },
  ph: { min: 6.9, max: 7.7, unit: "pH", reference: `Range compatible with survival used for ventilation goals; ARDSNet tolerates pH >= 7.15-7.30 (${ARDSNET})` },
  plateauPressureMaxCmH2O: { min: 15, max: 40, unit: "cmH2O", reference: `Protective plateau pressure limit <=30 cmH2O (${ARDSNET})` },
  drivingPressureMaxCmH2O: { min: 5, max: 25, unit: "cmH2O", reference: "Driving pressure >15 cmH2O associated with mortality (Amato MBP et al. N Engl J Med 2015;372:747-55)" },
  tidalVolumePerKgPbw: { min: 3, max: 12, unit: "mL/kg PBW", reference: `Protective 4-8 mL/kg PBW; 12 mL/kg was the traditional arm (${ARDSNET})` },
  autoPeepMaxCmH2O: { min: 0, max: 15, unit: "cmH2O", reference: `Intrinsic PEEP in obstructive disease, commonly 5-15 cmH2O (${MARINI_DRIES}; ${HESS_KACMAREK})` },
  eventTimeMs: { min: 0, max: 14400000, unit: "ms", reference: "Scenario length bound of 4 hours of simulated time" },
  eventResistanceFactor: { min: 0.5, max: 5, unit: "multiplier", reference: `${SCENARIO_PARAMETER}; bronchospasm can multiply resistance several fold (${MARINI_DRIES})` },
  eventComplianceFactor: { min: 0.2, max: 2, unit: "multiplier", reference: `${SCENARIO_PARAMETER}; derecruitment lowers compliance (${GATTINONI_PESENTI})` },
  eventShuntIncrease: { min: 0, max: 0.4, unit: "fraction", reference: SCENARIO_PARAMETER },
};
