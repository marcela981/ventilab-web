/*
* Funcionalidad: AI chat feature (public API)
* Descripción: Public surface of the AI assistant feature (free chat about medicine and the respiratory system plus the caller's conversations): the chat session state machine shared by the /assistant pages and the global drawer, the conversation listing, detail, actions and origin-link hooks, the domain types, the URL builders and the static configuration (limits, off-topic reply mirror, suggested questions, scope text, disclaimer).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export {
  AI_CHAT_DISCLAIMER,
  AI_CHAT_MESSAGE_MAX_LENGTH,
  AI_CHAT_SCOPE_TEXT,
  CONVERSATION_LIST_DEFAULT_LIMIT,
  CONVERSATION_TITLE_MAX_LENGTH,
  OFF_TOPIC_REPLY,
  SUGGESTED_QUESTIONS,
} from "./application/config/ai-chat.config";
export {
  ASSISTANT_URL,
  buildConversationUrl,
  classifyChatError,
  isOffTopicReply,
  matchesTitleFilter,
  normalizeRenameTitle,
} from "./application/entities/ai-chat.entity";
export type {
  ChatError,
  ChatErrorKind,
  ChatMessage,
  ChatMessageKind,
  ChatMessageStatus,
  ConversationDetail,
  ConversationScope,
  ConversationSummary,
} from "./application/entities/ai-chat.entity";
export { buildConversationOriginUrl, ORIGIN_LINK_LABEL } from "./application/entities/conversation-origin";
export type { ConversationOrigin } from "./application/entities/conversation-origin";
export { useChatSession } from "./application/hooks/use-chat-session";
export type { ChatDone, ChatSession, ChatSessionOptions, ChatSessionStatus } from "./application/hooks/use-chat-session";
export { useConversation } from "./application/hooks/use-conversation";
export type { UseConversationResult } from "./application/hooks/use-conversation";
export { INVALID_TITLE_MESSAGE, useConversationActions } from "./application/hooks/use-conversation-actions";
export type { ConversationActionOutcome, UseConversationActionsResult } from "./application/hooks/use-conversation-actions";
export { useConversationList } from "./application/hooks/use-conversation-list";
export type { ConversationListOptions, ConversationPagination, UseConversationListResult } from "./application/hooks/use-conversation-list";
export { useConversationOrigin } from "./application/hooks/use-conversation-origin";
export type { ConversationOriginLink } from "./application/hooks/use-conversation-origin";
