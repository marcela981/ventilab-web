/*
* Funcionalidad: useConversationList
* Descripción: One server page of the caller's AI conversations (`GET /api/tutor/conversations`, most recently active first) with an optional scope filter (FREE | LESSON | MODULE | PAGE; omitted = every scope) and the backend pagination (page, pages, limit, total). The title filter runs on the client over the loaded page only (BACKEND GAP: no title search; Decision 6), so `isFiltered` and `loadedCount` let the UI say it filters loaded conversations. Depends on @shared/api-client and the AI chat service, mapper, entity and config.
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
import { toConversationSummary } from "../../api/mappers/ai-chat.mapper";
import { conversationListQuery, CONVERSATIONS_PATH } from "../../api/services/ai-chat.service";
import { CONVERSATION_LIST_DEFAULT_LIMIT } from "../config/ai-chat.config";
import { matchesTitleFilter } from "../entities/ai-chat.entity";
import type { ConversationScope, ConversationSummary } from "../entities/ai-chat.entity";

export type ConversationListOptions = {
  scope?: ConversationScope | undefined
  page?: number | undefined
  limit?: number | undefined
  titleFilter?: string | undefined
};

export type ConversationPagination = {
  page: number
  pages: number
  limit: number
  total: number
};

export type UseConversationListResult = {
  // Loaded page after the client title filter.
  conversations: ConversationSummary[]
  // Conversations of the loaded page before the title filter.
  loadedCount: number
  isFiltered: boolean
  pagination: ConversationPagination | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useConversationList({
  scope,
  page = 1,
  limit = CONVERSATION_LIST_DEFAULT_LIMIT,
  titleFilter = "",
}: ConversationListOptions = {}): UseConversationListResult {
  const { data, error, isLoading, mutate } = useApiQuery(CONVERSATIONS_PATH, { query: conversationListQuery({ scope, page, limit }) });
  const loaded = useMemo(() => (data ? data.data.map(toConversationSummary) : []), [data]);
  const conversations = useMemo(() => loaded.filter((conversation) => matchesTitleFilter(conversation.title, titleFilter)), [loaded, titleFilter]);
  const raw = data?.pagination;
  const pagination = raw ? { page: raw.page, pages: raw.pages, limit: raw.limit, total: raw.total } : null;

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return {
    conversations,
    loadedCount: loaded.length,
    isFiltered: titleFilter.trim() !== "",
    pagination,
    isLoading,
    error: error ?? null,
    reload,
  };
}
