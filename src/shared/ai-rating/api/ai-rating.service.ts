/*
* Funcionalidad: AI rating service
* Descripción: Backend calls of the rating widget through the typed api-client: `PUT /api/ai-ratings` (upsert, `data: null`) and the path of `GET /api/ai-ratings/mine` (read through useApiQuery). Failures reject with ApiError. Depends on api-client and the mapper.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPut } from "@shared/api-client/api-request";
import type { AiRatingCommand } from "../application/ai-rating.entity";
import { toUpsertBody } from "./ai-rating.mapper";

export class AiRatingService {
  public static readonly MINE_PATH = "/api/ai-ratings/mine";

  public static async upsert(command: AiRatingCommand): Promise<void> {
    await apiPut("/api/ai-ratings", { body: toUpsertBody(command) });
  }
}
