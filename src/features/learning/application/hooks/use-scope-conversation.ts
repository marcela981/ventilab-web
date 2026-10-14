/*
* Funcionalidad: useScopeConversation
* Descripción: The caller's AI tutor conversation of one scope (LESSON | MODULE) and refId (lessonId | moduleId), reopened if it exists. BACKEND GAP: GET /api/tutor/conversations filters only by scope, so the listing (most recently active first, 100 per page) is searched client-side page by page until the refId is found or the pages run out (bounded to CONVERSATION_LOOKUP_MAX_PAGES). The lookup always refetches on mount (no dedupe) so a conversation created moments ago is found and never duplicated. Once known, GET /api/tutor/conversations/{id} loads its messages. `messages` is null while resolving, [] when there is no conversation yet (the first message creates it). `adopt(id)` takes the conversation created by the first streamed answer (seeding its cache first so the thread does not flash); `refresh()` revalidates the messages after a stream (or repeats the lookup when the id is still unknown, e.g. a first answer stopped before `done`). Depends on SWR, @shared/api-client, the tutor service, mapper and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import type { ApiError } from "@shared/api-client/api-error";
import { apiQueryKey, useApiQuery } from "@shared/api-client/use-api-query";
import { toConversation, toConversationSummaries } from "../../api/mappers/tutor.mapper";
import {
  CONVERSATION_LOOKUP_LIMIT,
  CONVERSATION_LOOKUP_MAX_PAGES,
  CONVERSATION_PATH,
  CONVERSATIONS_PATH,
  getConversationResult,
} from "../../api/services/tutor.service";
import { findScopeConversation } from "../entities/tutor.entity";
import type { ConversationMessage, QuestionScope } from "../entities/tutor.entity";
import { LEARNING_QUERY_CONFIG } from "../entities/learning-query-config";

const LOOKUP_QUERY_CONFIG = { ...LEARNING_QUERY_CONFIG, dedupingInterval: 0, revalidateOnMount: true } as const;

export type ScopeConversation = {
  conversationId: string | null
  messages: ConversationMessage[] | null
  error: ApiError | null
  reload: () => Promise<void>
  refresh: () => Promise<void>
  adopt: (conversationId: string) => Promise<void>
};

export function useScopeConversation(scope: QuestionScope, refId: string): ScopeConversation {
  const { mutate: globalMutate } = useSWRConfig();
  const [lookupPage, setLookupPage] = useState(1);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const listQuery = useApiQuery(
    createdId ? null : CONVERSATIONS_PATH,
    { query: { scope, page: lookupPage, limit: CONVERSATION_LOOKUP_LIMIT } },
    LOOKUP_QUERY_CONFIG,
  );
  const listData = listQuery.isValidating ? undefined : listQuery.data;
  const found = useMemo(
    () => (listData ? findScopeConversation(toConversationSummaries(listData.data), scope, refId) : null),
    [listData, scope, refId],
  );
  const lastPage = Math.min(listData?.pagination?.pages ?? 1, CONVERSATION_LOOKUP_MAX_PAGES);
  const hasMorePages = listData !== undefined && found === null && lookupPage < lastPage;
  const conversationId = createdId ?? found?.id ?? null;
  const isNew = conversationId === null && listData !== undefined && !hasMorePages;
  const detailQuery = useApiQuery(
    conversationId ? CONVERSATION_PATH : null,
    { params: { conversationId: conversationId ?? "" } },
    LEARNING_QUERY_CONFIG,
  );
  const conversation = useMemo(() => (detailQuery.data ? toConversation(detailQuery.data.data) : null), [detailQuery.data]);
  const conversationIdRef = useRef(conversationId);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Next listing page while the refId is not found (state update during render: React re-renders at once
  // with the new key, whose data is not loaded yet, so this runs once per page).
  if (hasMorePages) {
    setLookupPage(lookupPage + 1);
  }

  const { mutate: mutateList } = listQuery;
  const { mutate: mutateDetail } = detailQuery;

  const reload = useCallback(async() => {
    await Promise.all([mutateList(), mutateDetail()]);
  }, [mutateList, mutateDetail]);

  const refresh = useCallback(async() => {
    if (conversationIdRef.current) {
      await mutateDetail();
    } else {
      setLookupPage(1);
      await mutateList();
    }
  }, [mutateList, mutateDetail]);

  const adopt = useCallback(async(id: string) => {
    const key = apiQueryKey(CONVERSATION_PATH, { params: { conversationId: id } });

    try {
      await globalMutate(key, getConversationResult(id), { revalidate: false });
    } catch {
      // The detail query fetches it (and reports its error) once the id is adopted.
    }

    setCreatedId(id);
  }, [globalMutate]);

  let messages: ConversationMessage[] | null = null;

  if (conversation && conversation.id === conversationId) {
    ({ messages } = conversation);
  } else if (isNew) {
    messages = [];
  }

  const error = conversationId ? detailQuery.error : listQuery.error;

  return { conversationId, messages, error: error ?? null, reload, refresh, adopt };
}
