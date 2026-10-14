/*
* Funcionalidad: AI tutor mapper
* Descripción: Maps the AI tutor conversation DTOs (summary, detail, message) to the learning tutor entities. Depends on the tutor DTOs and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { Conversation, ConversationMessage, ConversationSummary } from "../../application/entities/tutor.entity";
import type { AiConversationDetailDTO, AiConversationDTO, AiConversationMessageDTO } from "../dtos/tutor.dto";

export function toConversationSummary(dto: AiConversationDTO): ConversationSummary {
  return { id: dto.id, scope: dto.scope, refId: dto.refId, title: dto.title, updatedAt: dto.updatedAt };
}

export function toConversationSummaries(dtos: readonly AiConversationDTO[]): ConversationSummary[] {
  return dtos.map(toConversationSummary);
}

export function toConversationMessage(dto: AiConversationMessageDTO): ConversationMessage {
  return {
    id: dto.id,
    role: dto.role,
    content: dto.content,
    isIncomplete: dto.isIncomplete,
    aiCallId: dto.aiCallId,
    createdAt: dto.createdAt,
  };
}

export function toConversation(dto: AiConversationDetailDTO): Conversation {
  return { ...toConversationSummary(dto), messages: dto.messages.map(toConversationMessage) };
}
