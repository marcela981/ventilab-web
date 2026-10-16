/*
* Funcionalidad: AI chat routes
* Descripción: URLs of the AI assistant pages (/assistant and /assistant/[conversationId]). Kept in a dependency-free module so the global drawer provider and launcher (app shell bundle) can use them without pulling the entity and the shared conversation UI; the entity re-exports them. Depends on nothing.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const ASSISTANT_URL = "/assistant";

export function buildConversationUrl(conversationId: string): string {
  return `${ASSISTANT_URL}/${encodeURIComponent(conversationId)}`;
}
