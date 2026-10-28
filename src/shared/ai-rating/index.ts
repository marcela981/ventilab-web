/*
* Funcionalidad: ai-rating public API
* Descripción: Public surface of the "¿Te fue útil?" module: the widget, its state hook, the domain types and the comment limit. The service, DTOs and mapper stay internal. v1.1 (W7, Bloque 2): the surface and scope types.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { AiRatingWidget } from "./application/ai-rating-widget";
export type { AiRatingWidgetProps } from "./application/ai-rating-widget";
export { AI_RATING_COMMENT_MAX } from "./application/ai-rating.entity";
export type { AiRating, AiRatingCommand, AiRatingScope, AiRatingSurface, AiRatingTarget, AiRatingTargetType } from "./application/ai-rating.entity";
export { useAiRating } from "./application/use-ai-rating";
export type { AiRatingState, UseAiRatingOptions } from "./application/use-ai-rating";
