/*
* Funcionalidad: useConversation
* Descripción: One AI conversation with its messages (`GET /api/tutor/conversations/{conversationId}`, chronological). A 404 (`ai-tutor.conversation_not_found`: missing or owned by someone else) is reported as `notFound`, not as an error. A null id fetches nothing. Depends on @shared/api-client and the AI chat service, mapper and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toConversationDetail } from "../../api/mappers/ai-chat.mapper";
import { CONVERSATION_PATH } from "../../api/services/ai-chat.service";
import type { ConversationDetail } from "../entities/ai-chat.entity";

export type UseConversationResult = {
  conversation: ConversationDetail | null
  isLoading: boolean
  notFound: boolean
  // Any failure other than 404.
  error: ApiError | null
  reload: () => Promise<void>
};

export function useConversation(conversationId: string | null | undefined): UseConversationResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    conversationId ? CONVERSATION_PATH : null,
    { params: { conversationId: conversationId ?? "" } },
  );
  const notFound = error?.status === 404;
  const conversation = useMemo(
    () => (data && !notFound && data.data.id === conversationId ? toConversationDetail(data.data) : null),
    [data, notFound, conversationId],
  );

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { conversation, isLoading, notFound, error: notFound ? null : error ?? null, reload };
}
