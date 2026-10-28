/*
* Funcionalidad: AI chat routes entry point
* Descripción: Per-area public entry point of the AI assistant URLs for other features (W7, Bloque 2: the TutorAI popup's "Abrir en el asistente"). It re-exports only the dependency-free URL builder, so importing it never pulls the ai-chat barrel (hooks, shared conversation UI, learning link) into the caller's chunk. Depends on the ai-chat routes config.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { buildConversationUrl } from "./application/config/ai-chat.routes";
