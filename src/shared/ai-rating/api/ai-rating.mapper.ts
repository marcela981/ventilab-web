/*
* Funcionalidad: AI rating mapper
* Descripción: Maps AiRatingDTO to the domain AiRating (missing comment -> empty string) and the domain command to the PUT body (trimmed comment, omitted when empty). The PUT replaces the whole rating, so callers always pass the comment they want to keep. v1.1 (W7, Bloque 2): surface and scope are sent only when given.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AiRating, AiRatingCommand } from "../application/ai-rating.entity";
import type { AiRatingDTO, UpsertAiRatingDTO } from "./ai-rating.dto";

export function toAiRating(dto: AiRatingDTO | null | undefined): AiRating | null {
  return dto ? { helpful: dto.helpful, comment: dto.comment ?? "" } : null;
}

export function toUpsertBody(command: AiRatingCommand): UpsertAiRatingDTO {
  const comment = command.comment.trim();

  return {
    targetType: command.targetType,
    targetId: command.targetId,
    helpful: command.helpful,
    ...(comment ? { comment } : {}),
    ...(command.surface ? { surface: command.surface } : {}),
    ...(command.scope ? { scope: command.scope } : {}),
  };
}
