/*
* Funcionalidad: AI rating entity
* Descripción: Domain types of the "¿Te fue útil?" rating: rated target (type + id), the user's rating (helpful + comment) and the command sent to the backend. The comment limit mirrors UpsertAiRatingDTO (at most 2000 characters). Depends only on the generated OpenAPI types. v1.1 (W7, Bloque 2): optional surface (POPUP | ACCORDION | ASSISTANT | NOTES_ANALYSIS, where the answer was shown) and scope (LESSON | MODULE | PAGE | FREE) of the rated answer, for the thesis analytics; for a tutor MESSAGE the backend derives the scope from the conversation and answers 422 on a different value, so callers send a consistent scope or none.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

export const AI_RATING_COMMENT_MAX = 2000;

export type AiRatingTargetType = components["schemas"]["UpsertAiRatingDTO"]["targetType"];

export type AiRatingSurface = NonNullable<components["schemas"]["UpsertAiRatingDTO"]["surface"]>;

export type AiRatingScope = NonNullable<components["schemas"]["UpsertAiRatingDTO"]["scope"]>;

// Where and about what the rated answer was shown; both optional.
export type AiRatingContext = {
  surface?: AiRatingSurface | undefined
  scope?: AiRatingScope | undefined
};

export type AiRatingTarget = {
  targetType: AiRatingTargetType
  targetId: string
};

export type AiRating = {
  helpful: boolean
  comment: string
};

export type AiRatingCommand = AiRatingTarget & AiRating & AiRatingContext;
