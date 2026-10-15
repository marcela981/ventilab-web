/*
* Funcionalidad: Evaluation authoring test helpers
* Descripción: Shared fixtures of the evaluation authoring tests: backend envelope (with optional pagination) and error bodies, a factory of EvaluationSummaryDTO and a render helper that mounts a page inside an isolated SWR cache and the global ToastProvider (as pages/_app.js does). Test-only code. Depends on Testing Library, msw, SWR, the design-system toast provider and the authoring DTOs.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render } from "@testing-library/react";
import { HttpResponse } from "msw";
import type { ReactElement } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "@shared/design-system/components/toast-provider";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import type { EvaluationSummaryDTO } from "../../api/dtos/evaluation-authoring.dto";

export const apiUrl = (path: string): string => `${BACKEND_ORIGIN}${path}`;

export type TestPagination = { total: number, pages: number, page: number, limit: number };

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

export function evaluationSummaryDto(id: string, overrides: Partial<EvaluationSummaryDTO> = {}): EvaluationSummaryDTO {
  return {
    id,
    type: "QUIZ",
    title: `Evaluación ${id}`,
    status: "DRAFT",
    moduleId: null,
    levelId: null,
    lessonId: null,
    durationMinutes: 30,
    maxAttempts: 1,
    showResultsImmediately: true,
    createdById: "teacher-1",
    createdByName: "Laura Gómez",
    legacySource: null,
    questionCount: 5,
    scenarioCount: 0,
    assignmentCount: 0,
    canManage: true,
    createdAt: "2026-10-01T15:00:00.000Z",
    updatedAt: "2026-10-02T15:30:00.000Z",
    ...overrides,
  };
}

export function renderWithProviders(ui: ReactElement) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      <ToastProvider>{ui}</ToastProvider>
    </SWRConfig>,
  );
}
