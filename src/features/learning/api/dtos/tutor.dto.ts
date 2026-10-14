/*
* Funcionalidad: AI tutor DTOs
* Descripción: Request and response shapes of the AI tutor routes used by the lesson viewer (deepen a page, start a lesson/module conversation, send a message, list and read conversations), taken from the generated OpenAPI schema. Depends on @shared/api-client/generated/schema.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type DeepenPageDTO = Schemas["DeepenPageDTO"];

export type StartAiConversationDTO = Schemas["StartAiConversationDTO"];

export type SendAiConversationMessageDTO = Schemas["SendAiConversationMessageDTO"];

export type AiConversationDTO = Schemas["AiConversationDTO"];

export type AiConversationDetailDTO = Schemas["AiConversationDetailDTO"];

export type AiConversationMessageDTO = Schemas["AiConversationMessageDTO"];
