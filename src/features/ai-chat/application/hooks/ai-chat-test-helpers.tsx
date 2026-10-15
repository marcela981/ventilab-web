/*
* Funcionalidad: AI chat test helpers
* Descripción: Shared fixtures of the AI chat hook tests: backend URL builder, success envelope (with optional pagination), error response (with optional Retry-After header), AiConversationDTO / AiConversationMessageDTO factories and an isolated SWR cache wrapper (no dedupe, no retries). Test-only code. Depends on msw, SWR and the backend origin.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { HttpResponse } from "msw";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import type { AiConversationDTO, AiConversationMessageDTO } from "../../api/dtos/ai-chat.dto";

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

export const errorResponse = (code: string, status: number, headers: Record<string, string> = {}) => HttpResponse.json(
  { success: false, message: code, data: null, code, timestamp: "", traceId: "t", pagination: null },
  { status, headers },
);

export function conversationDto(id: string, overrides: Partial<AiConversationDTO> = {}): AiConversationDTO {
  return {
    id,
    scope: "FREE",
    refId: null,
    title: `Conversación ${id}`,
    createdAt: "2026-10-15T10:00:00.000Z",
    updatedAt: "2026-10-15T10:05:00.000Z",
    ...overrides,
  };
}

export function messageDto(id: string, role: "USER" | "ASSISTANT", content: string, overrides: Partial<AiConversationMessageDTO> = {}): AiConversationMessageDTO {
  return {
    id,
    role,
    content,
    aiCallId: role === "ASSISTANT" ? `call-${id}` : null,
    isIncomplete: false,
    createdAt: "2026-10-15T10:00:00.000Z",
    ...overrides,
  };
}

export function SwrWrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
      {children}
    </SWRConfig>
  );
}
