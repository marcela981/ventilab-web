/*
* Funcionalidad: AI rating DTOs
* Descripción: Wire types of the AI rating endpoints taken from the generated OpenAPI schema: AiRatingDTO (GET /api/ai-ratings/mine) and UpsertAiRatingDTO (PUT /api/ai-ratings body).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

export type AiRatingDTO = components["schemas"]["AiRatingDTO"];

export type UpsertAiRatingDTO = components["schemas"]["UpsertAiRatingDTO"];
