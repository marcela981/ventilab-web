/*
* Funcionalidad: AI chat DTOs
* Descripción: Request and response shapes of the AI tutor conversation routes used by the AI assistant (list, detail, rename, delete, FREE start and follow-up message streams) and of the lesson and page reads that resolve a conversation origin, taken from the generated OpenAPI schema. Depends on @shared/api-client/generated/schema.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components, operations } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type AiConversationDTO = Schemas["AiConversationDTO"];

export type AiConversationDetailDTO = Schemas["AiConversationDetailDTO"];

export type AiConversationMessageDTO = Schemas["AiConversationMessageDTO"];

export type StartAiConversationDTO = Schemas["StartAiConversationDTO"];

export type SendAiConversationMessageDTO = Schemas["SendAiConversationMessageDTO"];

export type RenameAiConversationDTO = Schemas["RenameAiConversationDTO"];

export type ConversationListQueryDTO = NonNullable<operations["getConversations"]["parameters"]["query"]>;

export type ConversationScopeDTO = AiConversationDTO["scope"];
