/*
* Funcionalidad: AI chat feature (public API)
* Descripción: Public surface of the AI assistant feature (free chat about medicine and the respiratory system plus the caller's conversations): the chat session state machine shared by the /assistant pages and the global drawer, the conversation listing, detail and actions hooks, the domain types, the URL builders and the static configuration (limits, off-topic reply mirror, suggested questions, scope text, disclaimer). v1.1 (A2): the lazy AssistantPage of /assistant and /assistant/[conversationId] and the lazy ChatPanel (with its props and focusComposer handle types) for the global drawer; both are React.lazy entry points, so importing the barrel bundles neither. The learning origin link (useConversationOrigin, buildConversationOriginUrl, ORIGIN_LINK_LABEL) is no longer exported: only the conversation list uses it, and exporting it made every barrel import pull the learning barrel in. v1.2 (A3): the global drawer pieces: AiChatProvider (drawer state above the pages, lazy drawer), useAiChat and AiChatLauncher (top bar button); pages/_app.js imports them by their direct paths.
* Versión: 1.2
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
export type { ChatPanelHandle, ChatPanelProps } from "./application/components/chat-panel";
export { ChatPanel } from "./application/components/lazy-chat-panel";
export { AI_CHAT_DRAWER_ID, AiChatProvider, useAiChat } from "./application/components/ai-chat-provider";
export type { AiChatContextValue, AiChatProviderProps } from "./application/components/ai-chat-provider";
export { AI_CHAT_LAUNCHER_LABEL, AiChatLauncher } from "./application/components/ai-chat-launcher";
export type { AssistantPageProps } from "./application/pages/assistant.page";
export { AssistantPage } from "./application/pages/lazy-assistant-page";
export { useChatSession } from "./application/hooks/use-chat-session";
export type { ChatDone, ChatSession, ChatSessionOptions, ChatSessionStatus } from "./application/hooks/use-chat-session";
export { useConversation } from "./application/hooks/use-conversation";
export type { UseConversationResult } from "./application/hooks/use-conversation";
export { INVALID_TITLE_MESSAGE, useConversationActions } from "./application/hooks/use-conversation-actions";
export type { ConversationActionOutcome, UseConversationActionsResult } from "./application/hooks/use-conversation-actions";
export { useConversationList } from "./application/hooks/use-conversation-list";
export type { ConversationListOptions, ConversationPagination, UseConversationListResult } from "./application/hooks/use-conversation-list";
