/*
* Funcionalidad: AI tutor service
* Descripción: Paths and stream requests of the AI tutor routes used by the lesson viewer. The streaming POSTs (`/api/tutor/pages/{pageId}/deepen`, `/api/tutor/conversations`, `/api/tutor/conversations/{conversationId}/messages`) are built as {path, body} for the shared SSE helper (useAiStream); the reads (`GET /api/tutor/conversations?scope=`, `GET /api/tutor/conversations/{conversationId}`) go through useApiQuery with the path templates exported here; getConversationResult reads one conversation to seed that cache right after it is created. Optional body fields are omitted, never sent as undefined. Depends on the tutor DTOs and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGet } from "@shared/api-client/api-request";
import type { ApiResult } from "@shared/api-client/api-types";
import type { QuestionScope, TutorStreamRequest } from "../../application/entities/tutor.entity";
import type { AiConversationDetailDTO, DeepenPageDTO, SendAiConversationMessageDTO, StartAiConversationDTO } from "../dtos/tutor.dto";

export const CONVERSATIONS_PATH = "/api/tutor/conversations";
export const CONVERSATION_PATH = "/api/tutor/conversations/{conversationId}";
// BACKEND GAP: the listing filters by scope only, so the scope + refId conversation is searched client-side,
// most recently active first, at most CONVERSATION_LOOKUP_MAX_PAGES pages of the backend maximum page size.
export const CONVERSATION_LOOKUP_LIMIT = 100;
export const CONVERSATION_LOOKUP_MAX_PAGES = 5;

// Raw result (same shape the useApiQuery cache stores) to seed the cache of a just-created conversation.
export function getConversationResult(conversationId: string): Promise<ApiResult<AiConversationDetailDTO>> {
  return apiGet(CONVERSATION_PATH, { params: { conversationId } });
}

export type DeepenInput = {
  question?: string | undefined
  conversationId?: string | null | undefined
};

export function deepenPageRequest(pageId: string, { question, conversationId }: DeepenInput = {}): TutorStreamRequest {
  const body: DeepenPageDTO = {};
  const trimmed = question?.trim() ?? "";

  if (trimmed !== "") {
    body.question = trimmed;
  }

  if (conversationId) {
    body.conversationId = conversationId;
  }

  return { path: `/api/tutor/pages/${encodeURIComponent(pageId)}/deepen`, body };
}

export type StartConversationInput = {
  scope: QuestionScope
  refId: string
  message: string
  currentPageId: string | null
};

export function startConversationRequest({ scope, refId, message, currentPageId }: StartConversationInput): TutorStreamRequest {
  const body: StartAiConversationDTO = { scope, refId, message };

  if (currentPageId) {
    body.currentPageId = currentPageId;
  }

  return { path: CONVERSATIONS_PATH, body };
}

export type SendMessageInput = {
  message: string
  currentPageId: string | null
};

export function sendMessageRequest(conversationId: string, { message, currentPageId }: SendMessageInput): TutorStreamRequest {
  const body: SendAiConversationMessageDTO = { message };

  if (currentPageId) {
    body.currentPageId = currentPageId;
  }

  return { path: `${CONVERSATIONS_PATH}/${encodeURIComponent(conversationId)}/messages`, body };
}
