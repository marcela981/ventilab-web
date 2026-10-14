/*
* Funcionalidad: AI rating entity
* Descripción: Domain types of the "¿Te fue útil?" rating: rated target (type + id), the user's rating (helpful + comment) and the command sent to the backend. The comment limit mirrors UpsertAiRatingDTO (at most 2000 characters). Depends only on the generated OpenAPI types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

export const AI_RATING_COMMENT_MAX = 2000;

export type AiRatingTargetType = components["schemas"]["UpsertAiRatingDTO"]["targetType"];

export type AiRatingTarget = {
  targetType: AiRatingTargetType
  targetId: string
};

export type AiRating = {
  helpful: boolean
  comment: string
};

export type AiRatingCommand = AiRatingTarget & AiRating;
