/*
* Funcionalidad: AI chat conversation origin
* Descripción: Learning viewer deep link ("Ir a la lección") of a scoped conversation, built with the learning feature's public URL builders: MODULE → module page; LESSON → page 1 of the lesson (its module comes from GET /api/lessons/{id}); PAGE → page 1 of its lesson (module and lesson come from GET /api/pages/{id}; the 1-based position of the page inside the lesson is not known without another read). FREE conversations and unresolved owners have no link. Kept apart from the chat entity so the chat session and drawer do not pull the learning feature in. Depends on @features/learning (public index) and the AI chat entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { buildLessonPageUrl, buildModuleUrl } from "@features/learning";
import type { ConversationScope } from "./ai-chat.entity";

export type ConversationOrigin = {
  scope: ConversationScope
  refId: string | null
  // Owners resolved from the lesson (LESSON) or page (PAGE) read; MODULE needs none.
  moduleId?: string | null | undefined
  lessonId?: string | null | undefined
};

export const ORIGIN_LINK_LABEL: Record<Exclude<ConversationScope, "FREE">, string> = {
  LESSON: "Ir a la lección",
  MODULE: "Ir al módulo",
  PAGE: "Ir a la lección",
};

export function buildConversationOriginUrl({ scope, refId, moduleId, lessonId }: ConversationOrigin): string | null {
  if (!refId) {
    return null;
  }

  if (scope === "MODULE") {
    return buildModuleUrl(refId);
  }

  if (scope === "LESSON") {
    return moduleId ? buildLessonPageUrl(moduleId, refId) : null;
  }

  if (scope === "PAGE") {
    return moduleId && lessonId ? buildLessonPageUrl(moduleId, lessonId) : null;
  }

  return null;
}
