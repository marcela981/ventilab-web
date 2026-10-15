/*
* Funcionalidad: AI chat static configuration
* Descripción: Static data of the AI assistant: the message and rename title limits mirrored from the OpenAPI schema (generated types do not carry maxLength), the fixed off-topic reply mirrored from the backend (the only way to detect it, BACKEND GAP: no explicit signal), the default listing page size, the five suggested questions about mechanical ventilation, the scope text and the educational disclaimer. Plain Spanish copy; TODO(i18n): move it to an i18next namespace. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

// openapi/openapi.json → components.schemas.StartAiConversationDTO.properties.message.maxLength
// (and SendAiConversationMessageDTO.properties.message.maxLength).
export const AI_CHAT_MESSAGE_MAX_LENGTH = 4000;

// openapi/openapi.json → components.schemas.RenameAiConversationDTO.properties.title.maxLength
// (the backend collapses whitespace and stores up to 60 characters).
export const CONVERSATION_TITLE_MAX_LENGTH = 120;

// Default page size of the conversation listing (backend limit 1–100).
export const CONVERSATION_LIST_DEFAULT_LIMIT = 20;

// Exact copy of OFF_TOPIC_REPLY in ventylab-server src/features/ai-tutor/domain/services/topic-guard.ts.
// BACKEND GAP: a FREE question off topic answers HTTP 200 with this text as a normal delta + done;
// keep both strings identical or the notice stops showing.
export const OFF_TOPIC_REPLY =
  "Lo siento, solo puedo ayudarte con temas de ventilación mecánica, fisiología respiratoria y temas clínicos relacionados. ¿Tienes alguna pregunta sobre esos temas?";

export const SUGGESTED_QUESTIONS: readonly string[] = [
  "¿Qué diferencia hay entre ventilación controlada por volumen y por presión?",
  "¿Cómo se ajusta la PEEP en un paciente con SDRA?",
  "¿Qué es la presión meseta y por qué es importante medirla?",
  "¿Cuáles son los criterios para iniciar el destete de la ventilación mecánica?",
  "¿Cómo se interpreta una curva de flujo-tiempo con auto-PEEP?",
];

export const AI_CHAT_SCOPE_TEXT =
  "Puedo responder preguntas sobre medicina y el sistema respiratorio, en especial ventilación mecánica y fisiología respiratoria.";

export const AI_CHAT_DISCLAIMER = "Herramienta educativa. No usar para decisiones sobre pacientes reales.";
