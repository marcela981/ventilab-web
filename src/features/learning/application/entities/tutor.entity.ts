/*
* Funcionalidad: AI tutor entity
* Descripción: Domain types of the AI tutor in the lesson viewer: question scope (LESSON | MODULE), conversation summary and detail, chat messages (USER | ASSISTANT, incomplete flag, aiCallId) and the stream request (path + JSON body) consumed by useAiStream. Pure helpers: find the caller's conversation of a scope + refId in a listing (the backend filters only by scope) and decide whether an assistant answer can be rated (ai-ratings MESSAGE target = assistant message id, only for messages produced by an AI call). No dependencies. v1.1 (W7, Bloque 2): canRateMessage also accepts an answer saved incomplete with text (a stopped answer has no aiCallId but the backend rates it through its aborted call).
* Versión: 1.1
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

// A complete answer has its AI call; a stopped one is saved incomplete without it but can still be rated when it has text.
export function canRateMessage(message: ConversationMessage): boolean {
  if (message.role !== "ASSISTANT") {
    return false;
  }

  return message.aiCallId !== null || (message.isIncomplete && message.content.trim() !== "");
}
