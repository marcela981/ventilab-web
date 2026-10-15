/*
* Funcionalidad: AI conversation module (public API)
* Descripción: Public surface of the feature-agnostic streamed AI conversation UI shared by the learning tutor panels and the AI chat: the stream hook (rAF-batched deltas, abort, done metadata), the safe markdown renderer, the presentational pieces (MessageList, MessageBubble, StreamingMessage, Composer, TypingIndicator, SourceCitations), the generic AI error messages and the entity types. Test helpers stay internal.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { COMPOSER_COUNTER_THRESHOLD, isNearLimit, isSafeExternalUrl } from "./application/ai-conversation.entity";
export type { AiSourceCitation, MessageRole, StreamDoneMetadata } from "./application/ai-conversation.entity";
export {
  AI_ERROR_CODES,
  AI_FALLBACK_MESSAGES,
  AI_STREAM_ERROR_MESSAGES,
  formatResetTime,
  getAiErrorMessage,
  getGenericErrorMessage,
} from "./application/ai-error-messages";
export type { AiErrorMessageOptions, AiStreamErrorMessages } from "./application/ai-error-messages";
export { AiMarkdown } from "./application/ai-markdown";
export type { AiMarkdownProps } from "./application/ai-markdown";
export { Composer, COMPOSER_COPY } from "./application/composer";
export type { ComposerProps } from "./application/composer";
export { MessageBubble } from "./application/message-bubble";
export type { MessageBubbleProps } from "./application/message-bubble";
export { MessageList } from "./application/message-list";
export type { MessageListProps } from "./application/message-list";
export { SOURCE_CITATIONS_TITLE, SourceCitations } from "./application/source-citations";
export type { SourceCitationsProps } from "./application/source-citations";
export { announcementFragments, StreamingMessage } from "./application/streaming-message";
export type { StreamingMessageProps } from "./application/streaming-message";
export { TYPING_INDICATOR_LABEL, TypingIndicator } from "./application/typing-indicator";
export type { TypingIndicatorProps } from "./application/typing-indicator";
export { useStreamingResponse } from "./application/use-streaming-response";
export type {
  DefaultStreamDone,
  StreamingOutcome,
  StreamingResponse,
  StreamingResponseState,
  StreamingStatus,
  StreamRequest,
} from "./application/use-streaming-response";
