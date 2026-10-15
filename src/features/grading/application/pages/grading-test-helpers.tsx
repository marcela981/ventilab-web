/*
* Funcionalidad: Grading test helpers
* Descripción: Shared fixtures of the grading tests: backend envelope (with optional pagination) and error bodies, factories of GradingQueueItemDTO, EvaluationSummaryDTO and GroupDTO, and a render helper that mounts a tree inside an isolated SWR cache. Test-only code. Depends on Testing Library, msw, SWR and the grading DTOs.
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
import { BACKEND_ORIGIN } from "@shared/lib/env";
import type { EvaluationSummaryDTO, GradingQueueItemDTO, GroupDTO } from "../../api/dtos/grading.dto";

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

export function queueItemDto(attemptId: string, overrides: Partial<GradingQueueItemDTO> = {}): GradingQueueItemDTO {
  return {
    attemptId,
    assignmentId: "as-1",
    attemptNumber: 1,
    evaluationId: "ev-1",
    evaluationTitle: "Parcial de ventilación",
    evaluationType: "EXAM",
    legacy: false,
    maxScore: 10,
    score: 6,
    status: "PENDING_REVIEW",
    student: { id: `st-${attemptId}`, name: "Ana Gómez", email: "ana@ventylab.demo" },
    submittedAt: "2026-10-11T11:00:00.000Z",
    ...overrides,
  };
}

export function evaluationSummaryDto(id: string, title: string): EvaluationSummaryDTO {
  return {
    id,
    type: "QUIZ",
    title,
    status: "READY",
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
    assignmentCount: 1,
    canManage: true,
    createdAt: "2026-10-01T15:00:00.000Z",
    updatedAt: "2026-10-02T15:30:00.000Z",
  };
}

export function groupDto(id: string, name: string, overrides: Partial<GroupDTO> = {}): GroupDTO {
  return {
    id,
    name,
    type: "STUDENT",
    isActive: true,
    membersCount: 12,
    ...overrides,
  } as GroupDTO;
}

export function renderWithSwr(ui: ReactElement) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{ui}</SWRConfig>,
  );
}
