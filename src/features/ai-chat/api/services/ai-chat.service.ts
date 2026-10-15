/*
* Funcionalidad: AI chat service
* Descripción: Paths, queries, stream requests and writes of the AI assistant over the AI tutor conversation routes. A FREE conversation is created by the same streamed POST that carries its first message (`POST /api/tutor/conversations` {scope: "FREE", message} → text/event-stream; the conversationId arrives only in `done`); follow-ups stream from `POST /api/tutor/conversations/{conversationId}/messages`. Both are built as {path, body} for the shared useStreamingResponse. Reads (`GET /api/tutor/conversations` with page, limit and optional scope; `GET /api/tutor/conversations/{conversationId}`) go through useApiQuery with the paths exported here; fetchLatestFreeConversation reads the most recently active FREE conversation (`?scope=FREE&page=1&limit=1`) to recover the id of a first turn stopped before `done`. Rename (PATCH) and delete (DELETE) answer `data: null`. Lesson and page reads resolve the owners of a scoped conversation for its learning link. Depends on @shared/api-client and the AI chat DTOs, mapper and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiDelete, apiGet, apiPatch } from "@shared/api-client/api-request";
import type { StreamRequest } from "@shared/ai-conversation";
import type { ConversationScope, ConversationSummary } from "../../application/entities/ai-chat.entity";
import type {
  ConversationListQueryDTO,
  RenameAiConversationDTO,
  SendAiConversationMessageDTO,
  StartAiConversationDTO,
} from "../dtos/ai-chat.dto";
import { toConversationSummary } from "../mappers/ai-chat.mapper";

export const CONVERSATIONS_PATH = "/api/tutor/conversations";
export const CONVERSATION_PATH = "/api/tutor/conversations/{conversationId}";
export const LESSON_PATH = "/api/lessons/{id}";
export const PAGE_PATH = "/api/pages/{id}";

export type ConversationListInput = {
  scope?: ConversationScope | undefined
  page: number
  limit: number
};

// The scope is omitted (never sent as undefined) to list every scope.
export function conversationListQuery({ scope, page, limit }: ConversationListInput): ConversationListQueryDTO {
  return scope ? { scope, page, limit } : { page, limit };
}

export function startFreeConversationRequest(message: string): StreamRequest {
  const body: StartAiConversationDTO = { scope: "FREE", message };

  return { path: CONVERSATIONS_PATH, body };
}

export function sendConversationMessageRequest(conversationId: string, message: string): StreamRequest {
  const body: SendAiConversationMessageDTO = { message };

  return { path: `${CONVERSATIONS_PATH}/${encodeURIComponent(conversationId)}/messages`, body };
}

export async function fetchLatestFreeConversation(): Promise<ConversationSummary | null> {
  const result = await apiGet(CONVERSATIONS_PATH, { query: conversationListQuery({ scope: "FREE", page: 1, limit: 1 }) });
  const [latest] = result.data;

  return latest ? toConversationSummary(latest) : null;
}

export async function renameConversation(conversationId: string, title: string): Promise<void> {
  const body: RenameAiConversationDTO = { title };

  await apiPatch(CONVERSATION_PATH, { params: { conversationId }, body });
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiDelete(CONVERSATION_PATH, { params: { conversationId } });
}
