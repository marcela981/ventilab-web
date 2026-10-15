/*
* Funcionalidad: useConversationOrigin
* Descripción: Learning viewer link of a scoped AI conversation ("Ir a la lección" / "Ir al módulo"). MODULE links at once; LESSON reads `GET /api/lessons/{id}` for its moduleId and PAGE reads `GET /api/pages/{id}` for its moduleId and lessonId (SWR-cached, so repeated origins share one request). FREE conversations, pending reads and failed reads (e.g. 404 for unpublished content) have no link. Depends on @shared/api-client, the AI chat service and the conversation origin rules (learning public URL builders).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useApiQuery } from "@shared/api-client/use-api-query";
import { LESSON_PATH, PAGE_PATH } from "../../api/services/ai-chat.service";
import type { ConversationSummary } from "../entities/ai-chat.entity";
import { buildConversationOriginUrl, ORIGIN_LINK_LABEL } from "../entities/conversation-origin";

const ORIGIN_QUERY_CONFIG = { revalidateOnFocus: false, revalidateIfStale: false } as const;

export type ConversationOriginLink = {
  href: string | null
  label: string | null
};

export function useConversationOrigin(conversation: Pick<ConversationSummary, "scope" | "refId"> | null): ConversationOriginLink {
  const scope = conversation?.scope ?? "FREE";
  const refId = conversation?.refId ?? null;
  const lesson = useApiQuery(scope === "LESSON" && refId ? LESSON_PATH : null, { params: { id: refId ?? "" } }, ORIGIN_QUERY_CONFIG);
  const page = useApiQuery(scope === "PAGE" && refId ? PAGE_PATH : null, { params: { id: refId ?? "" } }, ORIGIN_QUERY_CONFIG);
  // keepPreviousData may still hold another conversation's owner: only the read of this refId counts.
  const lessonData = !lesson.error && lesson.data?.data.id === refId ? lesson.data.data : undefined;
  const pageData = !page.error && page.data?.data.id === refId ? page.data.data : undefined;
  const href = buildConversationOriginUrl({
    scope,
    refId,
    moduleId: scope === "PAGE" ? pageData?.moduleId : lessonData?.moduleId,
    lessonId: pageData?.lessonId,
  });

  return { href, label: href && scope !== "FREE" ? ORIGIN_LINK_LABEL[scope] : null };
}
