/*
* Funcionalidad: Simulator feature (public API)
* Descripción: Public surface of the simulator feature (T5, part 1): the /simulator catalog page with the "Mis sesiones" history, the URL builders of the simulator routes, the contract-derived time multipliers and labels, the entity types and the hooks a later task or another feature may reuse (catalog, history, start practice). v1.1 (T6): the running session console page (/simulator/sessions/[sessionId]) with its AI assist slot and end hook, the session store (an exam start may record its session for the console) and the session hooks. Pages and other features import only this index. v1.2 (T7): the assistance policy type the exam flow can pass to the console. v1.3 (T8): the result page (/simulator/sessions/[sessionId]/result) and the replay page (.../replay), the determinism comparison helper (local replay final metrics vs the server finalMetrics) and the exam return store the exam flow writes for "Volver al examen". Depends on the simulator application layer.
* Versión: 1.3
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
export { SESSION_PAGE_COPY, SessionConsolePage } from "./application/pages/session-console.page";
export type { AssistSlotContext, SessionConsolePageProps } from "./application/pages/session-console.page";
export type { SessionRecord } from "./application/entities/sim-session.entity";
export type { AssistancePolicyValue } from "./application/entities/sim-assist.entity";
export { sessionStore } from "./application/session/session-store";
export type { SessionStore } from "./application/session/session-store";
export { useSimSession } from "./application/hooks/use-sim-session";
export type { SimSessionView } from "./application/hooks/use-sim-session";
export { SessionResultPage, RESULT_PAGE_COPY } from "./application/pages/session-result.page";
export type { SessionResultPageProps } from "./application/pages/session-result.page";
export { SessionReplayPage, REPLAY_PAGE_COPY } from "./application/pages/session-replay.page";
export type { SessionReplayPageProps } from "./application/pages/session-replay.page";
export { compareFinalMetrics } from "./application/entities/sim-result.entity";
export type { MetricDifference, MetricsComparison, SessionSummary } from "./application/entities/sim-result.entity";
export { createExamReturnStore, examReturnStore } from "./application/session/exam-return-store";
export type { ExamReturn, ExamReturnStore } from "./application/session/exam-return-store";
