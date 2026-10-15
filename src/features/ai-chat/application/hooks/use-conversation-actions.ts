/*
* Funcionalidad: useConversationActions
* Descripción: Rename (`PATCH /api/tutor/conversations/{conversationId}`, title with collapsed whitespace, 1–120 characters; an invalid title is rejected without a request) and delete (`DELETE`) of an AI conversation. After a success the listing and detail reads are revalidated (a failed refresh only leaves stale data). Errors come back as a Spanish message; one action at a time (`busy` otherwise). Depends on SWR, @shared/api-client and the AI chat service and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { CONVERSATION_PATH, CONVERSATIONS_PATH, deleteConversation, renameConversation } from "../../api/services/ai-chat.service";
import { classifyChatError, normalizeRenameTitle } from "../entities/ai-chat.entity";

export type ConversationActionOutcome =
  | { status: "success" }
  | { status: "invalid", message: string }
  | { status: "error", message: string }
  | { status: "busy" };

export type UseConversationActionsResult = {
  pending: boolean
  rename: (conversationId: string, title: string) => Promise<ConversationActionOutcome>
  remove: (conversationId: string) => Promise<ConversationActionOutcome>
};

export const INVALID_TITLE_MESSAGE = "El título debe tener entre 1 y 120 caracteres.";

export function useConversationActions(): UseConversationActionsResult {
  const { mutate } = useSWRConfig();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(async(action: () => Promise<void>): Promise<ConversationActionOutcome> => {
    if (pendingRef.current) {
      return { status: "busy" };
    }

    pendingRef.current = true;
    setPending(true);

    try {
      await action();
      // The deleted conversation's detail is not revalidated (it would answer 404); the caller leaves it.
      await invalidateApiQueries(mutate, [CONVERSATIONS_PATH]).catch(() => undefined);

      return { status: "success" };
    } catch (caught) {
      return { status: "error", message: classifyChatError(caught).message };
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [mutate]);

  const rename = useCallback(async(conversationId: string, title: string): Promise<ConversationActionOutcome> => {
    const normalized = normalizeRenameTitle(title);

    if (normalized === null) {
      return { status: "invalid", message: INVALID_TITLE_MESSAGE };
    }

    return run(async() => {
      await renameConversation(conversationId, normalized);
      await invalidateApiQueries(mutate, [CONVERSATION_PATH]).catch(() => undefined);
    });
  }, [mutate, run]);

  const remove = useCallback((conversationId: string) => run(() => deleteConversation(conversationId)), [run]);

  return { pending, rename, remove };
}
