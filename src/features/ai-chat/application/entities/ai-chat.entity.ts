/*
* Funcionalidad: AI chat entity
* Descripción: Domain types and pure rules of the AI assistant. Types: conversation scope (FREE | LESSON | MODULE | PAGE), conversation summary and detail, chat message (local or server id, role, content, status complete | streaming | interrupted | error, kind answer | off-topic, aiCallId and server messageId for ratings, optional sources) and the classified chat error. Rules: off-topic detection by exact trimmed match of the mirrored backend reply (BACKEND GAP: no explicit signal), the client title filter (case and accent insensitive, over loaded items only), rename title normalization (collapsed whitespace, 1–120 characters), error classification over the shared getAiErrorMessage (quota with the local reset time, provider unavailable, interrupted, not found, failed) and the assistant conversation URL. The learning deep link lives in conversation-origin.ts so the chat session does not pull the learning feature in. Depends on the shared AI conversation and api-client errors and the AI chat config. v1.1 (A3): ASSISTANT_URL and buildConversationUrl moved to config/ai-chat.routes (re-exported here) so the drawer provider stays out of the shared conversation UI.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import { AI_ERROR_CODES, getAiErrorMessage } from "@shared/ai-conversation";
import type { AiSourceCitation, MessageRole } from "@shared/ai-conversation";
import { CONVERSATION_TITLE_MAX_LENGTH, OFF_TOPIC_REPLY } from "../config/ai-chat.config";

export type ConversationScope = "FREE" | "LESSON" | "MODULE" | "PAGE";

export type ConversationSummary = {
  id: string
  title: string
  scope: ConversationScope
  // Lesson, module or page id of the scope; null for FREE.
  refId: string | null
  createdAt: string
  updatedAt: string
};

export type ChatMessageStatus = "complete" | "streaming" | "interrupted" | "error";

export type ChatMessageKind = "answer" | "off-topic";

export type ChatMessage = {
  // Server message id, or a local id for a turn sent in this session.
  id: string
  role: MessageRole
  content: string
  status: ChatMessageStatus
  kind: ChatMessageKind
  // AI call that produced an assistant answer (rating target); null for user messages and unfinished answers.
  aiCallId: string | null
  // Server id of the message once known (rating targetId); null for local messages.
  messageId: string | null
  sources: readonly AiSourceCitation[]
  createdAt: string | null
};

export type ConversationDetail = ConversationSummary & {
  messages: ChatMessage[]
};

export type ChatErrorKind = "quota" | "unavailable" | "interrupted" | "not-found" | "failed";

export type ChatError = {
  kind: ChatErrorKind
  message: string
  retryable: boolean
  // Seconds until the quota resets (Retry-After / resetAt); null when unknown or not a quota error.
  retryAfterSeconds: number | null
};

export function isOffTopicReply(content: string): boolean {
  return content.trim() === OFF_TOPIC_REPLY;
}

export function messageKind(role: MessageRole, content: string): ChatMessageKind {
  return role === "assistant" && isOffTopicReply(content) ? "off-topic" : "answer";
}

function foldText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Client-side filter (BACKEND GAP: no title search); it only sees the conversations already loaded.
export function matchesTitleFilter(title: string, filter: string): boolean {
  const needle = foldText(filter);

  return needle === "" || foldText(title).includes(needle);
}

// Same whitespace collapse as the backend; null when empty or over the schema limit.
export function normalizeRenameTitle(title: string): string | null {
  const normalized = title.replace(/\s+/g, " ").trim();

  return normalized === "" || normalized.length > CONVERSATION_TITLE_MAX_LENGTH ? null : normalized;
}

const CONVERSATION_NOT_FOUND = "La conversación no existe o ya no está disponible.";
const INTERRUPTED_CODES = new Set<string>(["network.stream_interrupted", AI_ERROR_CODES.streamInterrupted]);

// Session expiry is not handled here: the api-client refreshes once and then expires the session.
export function classifyChatError(error: unknown, now?: number): ChatError {
  const apiError = toApiError(error);
  const message = getAiErrorMessage(apiError, { notFound: CONVERSATION_NOT_FOUND, now });

  if (apiError.code === AI_ERROR_CODES.quotaExceeded) {
    return { kind: "quota", message, retryable: false, retryAfterSeconds: apiError.retryAfter ?? null };
  }

  if (apiError.code === AI_ERROR_CODES.providersUnavailable || apiError.status === 503) {
    return { kind: "unavailable", message, retryable: true, retryAfterSeconds: null };
  }

  if (INTERRUPTED_CODES.has(apiError.code) || apiError.status === 502) {
    return { kind: "interrupted", message, retryable: true, retryAfterSeconds: null };
  }

  if (apiError.status === 404) {
    return { kind: "not-found", message, retryable: false, retryAfterSeconds: null };
  }

  return { kind: "failed", message, retryable: true, retryAfterSeconds: null };
}

// The route builders live in a dependency-free module (used by the app-shell drawer provider).
export { ASSISTANT_URL, buildConversationUrl } from "../config/ai-chat.routes";
