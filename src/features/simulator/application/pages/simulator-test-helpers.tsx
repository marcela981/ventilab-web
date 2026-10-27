/*
* Funcionalidad: Simulator test helpers
* Descripción: Shared fixtures of the simulator tests: backend URL builder, success envelope (with optional pagination), error response, ClinicalCaseListItemDTO / SimulationSessionDTO / StartedSimulationSessionDTO factories typed from the generated contract, an isolated SWR cache wrapper (no dedupe, no retries) and a render helper that uses it. Test-only code. Depends on msw, SWR, Testing Library and the backend origin. v1.1 (T8): SimulationSessionSummaryDTO and SimulationSessionReplayDTO factories (the contract types their opaque objects as `Record<string, never>`, so the factories cast them). v1.2 (B1 closure): the session factory carries the new caseTitle field. v1.3 (S8): fixtures carry the regenerated block 1 contract fields (session patient null).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render } from "@testing-library/react";
import { HttpResponse } from "msw";
import type { ReactElement, ReactNode } from "react";
import { SWRConfig } from "swr";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import type {
  ClinicalCaseListItemDTO,
  ClinicalCaseSummaryDTO,
  SimulationSessionDTO,
  SimulationSessionReplayDTO,
  SimulationSessionSummaryDTO,
  StartedSimulationSessionDTO,
} from "../../api/dtos/simulator.dto";

export const apiUrl = (path: string): string => `${BACKEND_ORIGIN}${path}`;

export type TestPagination = { page: number, pages: number, limit: number, total: number };

export const envelope = (data: unknown, pagination: TestPagination | null = null) => ({
  success: true,
  message: null,
  data,
  code: null,
  timestamp: "",
  traceId: "t",
  pagination: pagination ? { ...pagination, next: null, previous: null } : null,
});

export const errorResponse = (code: string, status: number) => HttpResponse.json(
  { success: false, message: code, data: null, code, timestamp: "", traceId: "t", pagination: null },
  { status },
);

export function caseItemDto(id: string, overrides: Partial<ClinicalCaseSummaryDTO> = {}): ClinicalCaseListItemDTO {
  return {
    clinicalCase: {
      id,
      title: `Caso ${id}`,
      description: `Descripción del caso ${id}`,
      educationalGoal: "Ventilación protectora",
      mainDiagnosis: "SDRA moderado",
      pathology: "SDRA",
      difficulty: "BEGINNER",
      patientAge: 54,
      patientWeight: 70,
      comorbidities: [],
      ...overrides,
    },
    userAttempts: { hasAttempted: false, bestScore: null, isSuccessful: false, lastAttempt: null },
  };
}

export function sessionDto(id: string, overrides: Partial<SimulationSessionDTO> = {}): SimulationSessionDTO {
  return {
    id,
    userId: "u1",
    caseId: "c1",
    caseTitle: "Caso c1",
    mode: "FREE",
    status: "ENDED",
    engineVersion: "1.0.0",
    timeMultiplier: 1,
    startedAt: "2026-10-15T14:00:00.000Z",
    endedAt: "2026-10-15T14:02:05.000Z",
    lastEventAt: "2026-10-15T14:02:05.000Z",
    lastSimTimeMs: 125_000,
    score: 0.82,
    attemptId: null,
    questionId: null,
    patient: null,
    ...overrides,
  };
}

export function startedSessionDto(id: string, overrides: Partial<StartedSimulationSessionDTO> = {}): StartedSimulationSessionDTO {
  return {
    id,
    seed: 42,
    engineVersion: "1.0.0",
    startedAt: "2026-10-15T14:00:00.000Z",
    expiresAt: null,
    timeMultiplier: 1,
    case: {},
    ...overrides,
  };
}

type OpaqueOverrides<T, K extends keyof T> = Partial<Omit<T, K>> & { [P in K]?: unknown };

export function summaryDto(overrides: OpaqueOverrides<SimulationSessionSummaryDTO, "targets" | "breakdown" | "finalMetrics"> = {}): SimulationSessionSummaryDTO {
  return {
    id: "s1",
    status: "ENDED",
    engineVersion: "1.0.0",
    simTimeMs: 8000,
    durationMs: 9000,
    finalMetrics: {},
    targets: [],
    score: 0.82,
    breakdown: [],
    aiHelpCount: 0,
    ...overrides,
  } as SimulationSessionSummaryDTO;
}

export function replayDto(overrides: OpaqueOverrides<SimulationSessionReplayDTO, "case" | "events"> = {}): SimulationSessionReplayDTO {
  return {
    id: "s1",
    case: {},
    seed: 42,
    events: [],
    engineVersion: "1.0.0",
    timeMultiplier: 1,
    currentEngineVersion: "1.0.0",
    engineVersionMismatch: false,
    warning: null,
    ...overrides,
  } as SimulationSessionReplayDTO;
}

export function SwrWrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      {children}
    </SWRConfig>
  );
}

export function renderWithSwr(ui: ReactElement) {
  return render(ui, { wrapper: SwrWrapper });
}
