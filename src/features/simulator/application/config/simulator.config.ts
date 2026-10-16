/*
* Funcionalidad: Simulator config
* Descripción: Static configuration of the simulator feature. Every enumerated value comes from the generated OpenAPI types, never from UI constants: the time multipliers allowed by StartSimulationSessionDTO (decision 9: there is no endpoint for them), the pathology and difficulty filters of GET /api/clinical-cases and the session modes and statuses of the session history. The Spanish label maps are typed with `satisfies Record<Enum, string>`, so a value added to or removed from the contract breaks the type check until the map follows it; the option lists are the keys of those maps. Also the page sizes of the catalog and the history (backend limit 1–100). Depends on the simulator DTO types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ClinicalCasesQueryDTO, SimulationSessionsQueryDTO, StartSimulationSessionDTO } from "../../api/dtos/simulator.dto";

export type TimeMultiplier = StartSimulationSessionDTO["timeMultiplier"];
export type SimulationMode = StartSimulationSessionDTO["mode"];
export type CasePathology = NonNullable<ClinicalCasesQueryDTO["pathology"]>;
export type CaseDifficulty = NonNullable<ClinicalCasesQueryDTO["difficulty"]>;
export type SessionStatus = NonNullable<SimulationSessionsQueryDTO["status"]>;

/** Keys of a label map, typed as the enum it is exhaustive for. */
function keysOf<K extends string>(labels: Readonly<Record<K, string>>): readonly K[] {
  return Object.keys(labels) as K[];
}

// TODO(i18n): move the labels to a simulator namespace in src/i18n.
export const TIME_MULTIPLIER_LABELS = { 1: "×1", 2: "×2", 4: "×4" } as const satisfies Record<TimeMultiplier, string>;

/** Allowed slow-dynamics multipliers, in contract order (StartSimulationSessionDTO.timeMultiplier). */
export const TIME_MULTIPLIERS: readonly TimeMultiplier[] = Object.keys(TIME_MULTIPLIER_LABELS).map((key) => Number(key) as TimeMultiplier);

/** The contract default of StartSimulationSessionDTO.timeMultiplier. */
export const DEFAULT_TIME_MULTIPLIER: TimeMultiplier = 1;

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
  NORMAL: "Pulmón normal",
  OBESIDAD: "Obesidad",
  POSTOPERATORIO: "Postoperatorio",
} as const satisfies Record<CasePathology, string>;

export const CASE_PATHOLOGIES = keysOf<CasePathology>(PATHOLOGY_LABELS);

export const DIFFICULTY_LABELS = {
  BEGINNER: "Básico",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
} as const satisfies Record<CaseDifficulty, string>;

export const CASE_DIFFICULTIES = keysOf<CaseDifficulty>(DIFFICULTY_LABELS);

export const SESSION_STATUS_LABELS = {
  ACTIVE: "En curso",
  ENDED: "Finalizada",
  ABANDONED: "Abandonada",
} as const satisfies Record<SessionStatus, string>;

export const SIMULATION_MODE_LABELS = {
  FREE: "Práctica libre",
  EXAM: "Examen",
} as const satisfies Record<SimulationMode, string>;

export const CATALOG_PAGE_SIZE = 24;
export const SESSION_HISTORY_PAGE_SIZE = 10;
