/*
* Funcionalidad: AI tutor entity
* Descripción: Domain types of the AI tutor in the lesson viewer: question scope (LESSON | MODULE), conversation summary and detail, chat messages (USER | ASSISTANT, incomplete flag, aiCallId) and the stream request (path + JSON body) consumed by useAiStream. Pure helpers: find the caller's conversation of a scope + refId in a listing (the backend filters only by scope) and decide whether an assistant answer can be rated (ai-ratings MESSAGE target = assistant message id, only for messages produced by an AI call). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type QuestionScope = "LESSON" | "MODULE";

export type ConversationSummary = {
  id: string
  scope: string
  refId: string | null
  title: string
  updatedAt: string
};

export type ConversationMessage = {
  id: string
  role: "USER" | "ASSISTANT"
  content: string
  isIncomplete: boolean
  aiCallId: string | null
  createdAt: string
};

export type Conversation = ConversationSummary & {
  messages: ConversationMessage[]
};

export type TutorStreamRequest = {
  path: string
  body: Record<string, unknown>
};

export function findScopeConversation(
  conversations: readonly ConversationSummary[],
  scope: QuestionScope,
  refId: string,
): ConversationSummary | null {
  return conversations.find((conversation) => conversation.scope === scope && conversation.refId === refId) ?? null;
}

export function canRateMessage(message: ConversationMessage): boolean {
  return message.role === "ASSISTANT" && message.aiCallId !== null;
}
