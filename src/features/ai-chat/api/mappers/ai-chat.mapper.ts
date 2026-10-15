/*
* Funcionalidad: AI chat mapper
* Descripción: Maps the AI tutor conversation DTOs to the AI chat entities: summary (id, title, scope, refId, dates), stored messages (USER/ASSISTANT → user/assistant, isIncomplete → interrupted, server id as messageId, aiCallId kept for ratings, off-topic kind detected on the stored text; stored messages carry no sources) and the detail. Depends on the AI chat DTOs and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { messageKind } from "../../application/entities/ai-chat.entity";
import type { ChatMessage, ConversationDetail, ConversationSummary } from "../../application/entities/ai-chat.entity";
import type { AiConversationDetailDTO, AiConversationDTO, AiConversationMessageDTO } from "../dtos/ai-chat.dto";

export function toConversationSummary(dto: AiConversationDTO): ConversationSummary {
  return {
    id: dto.id,
    title: dto.title,
    scope: dto.scope,
    refId: dto.refId,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toChatMessage(dto: AiConversationMessageDTO): ChatMessage {
  const role = dto.role === "USER" ? "user" : "assistant";

  return {
    id: dto.id,
    role,
    content: dto.content,
    status: dto.isIncomplete ? "interrupted" : "complete",
    kind: messageKind(role, dto.content),
    aiCallId: dto.aiCallId,
    messageId: dto.id,
    sources: [],
    createdAt: dto.createdAt,
  };
}

export function toConversationDetail(dto: AiConversationDetailDTO): ConversationDetail {
  return { ...toConversationSummary(dto), messages: dto.messages.map(toChatMessage) };
}
