/*
* Funcionalidad: Simulator own-patient entry point
* Descripción: Public entry point of the own simulated patient (W8, Bloque 1), lazy loaded by the Simular Paciente tab
*   of /simulador: the published case catalog with its filters ("Cargar caso"), the patient preset of a case detail,
*   the FREE start with an own patient (useStartPractice.startWithPatient), the contract type of the patient and the
*   July Spanish labels of its enumerations. Depends on the simulator application and api layers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type { SimulatedPatientDTO } from "./api/dtos/simulator.dto";
export { fetchCasePatientPreset } from "./api/services/clinical-cases.service";
export { CatalogFilters } from "./application/components/catalog-filters";
export { CASE_DIFFICULTIES, DIFFICULTY_LABELS, PATHOLOGY_LABELS } from "./application/config/simulator.config";
export type { CaseDifficulty, CasePathology } from "./application/config/simulator.config";
export {
  BREATHING_PATTERN_LABELS,
  PATIENT_CONDITION_LABELS,
  PATIENT_SEX_LABELS,
} from "./application/entities/sim-patient.entity";
export type {
  BreathingPattern,
  CasePatientPreset,
  CasePresetVitals,
  PatientCondition,
  PatientSex,
} from "./application/entities/sim-patient.entity";
export { useCaseCatalog } from "./application/hooks/use-case-catalog";
export { useStartPractice } from "./application/hooks/use-start-practice";
export type { StartPracticeOutcome, StartWithPatientOptions } from "./application/hooks/use-start-practice";
