/*
* Funcionalidad: Simulator feature (public API)
* Descripción: Public surface of the simulator feature (T5, part 1): the /simulator catalog page with the "Mis sesiones" history, the URL builders of the simulator routes, the contract-derived time multipliers and labels, the entity types and the hooks a later task or another feature may reuse (catalog, history, start practice). Pages and other features import only this index. Depends on the simulator application layer.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export {
  CASE_DIFFICULTIES,
  CASE_PATHOLOGIES,
  DEFAULT_TIME_MULTIPLIER,
  DIFFICULTY_LABELS,
  PATHOLOGY_LABELS,
  SESSION_STATUS_LABELS,
  SIMULATION_MODE_LABELS,
  TIME_MULTIPLIER_LABELS,
  TIME_MULTIPLIERS,
} from "./application/config/simulator.config";
export type {
  CaseDifficulty,
  CasePathology,
  SessionStatus,
  SimulationMode,
  TimeMultiplier,
} from "./application/config/simulator.config";
export {
  buildSessionReplayUrl,
  buildSessionResultUrl,
  buildSessionUrl,
  SIMULATOR_URL,
} from "./application/config/simulator.routes";
export type {
  CaseCard,
  CatalogFilters,
  ListPagination,
  SessionHistoryItem,
  StartedSession,
} from "./application/entities/simulator.entity";
export { useCaseCatalog } from "./application/hooks/use-case-catalog";
export type { UseCaseCatalogResult } from "./application/hooks/use-case-catalog";
export { useSessionHistory } from "./application/hooks/use-session-history";
export type { SessionHistoryRow, UseSessionHistoryResult } from "./application/hooks/use-session-history";
export { useStartPractice } from "./application/hooks/use-start-practice";
export type { StartPracticeOutcome, UseStartPracticeResult } from "./application/hooks/use-start-practice";
export { SimulatorCatalogPage } from "./application/pages/simulator-catalog.page";
