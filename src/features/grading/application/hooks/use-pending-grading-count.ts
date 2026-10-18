/*
* Funcionalidad: usePendingGradingCount
* Descripción: Number of attempts waiting for review for the signed-in teacher or admin, read from `GET /api/evaluation-grading/queue/count` (`{ pending }`, same scope as the queue). Refreshes every 120 s and when the window regains focus; grading mutations refresh it too because the count path is one of GRADING_QUERY_PATHS. A false `enabled` (not staff) sends no request and returns null. Depends on React, @shared/api-client and the grading service. v1.1 (G1 review W2): the refresh interval goes from 60 s to 120 s, since each queue read also closes expired attempts on the backend. v1.2 (closure B2): the count endpoint replaces the one-row queue page whose envelope total was read as the count.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useApiQuery } from "@shared/api-client/use-api-query";
import { GRADING_QUEUE_COUNT_PATH } from "../../api/services/grading.service";

export const PENDING_COUNT_REFRESH_MS = 120_000;

const COUNT_QUERY_CONFIG = { refreshInterval: PENDING_COUNT_REFRESH_MS, revalidateOnFocus: true } as const;

export function usePendingGradingCount(enabled: boolean): number | null {
  const { data } = useApiQuery(enabled ? GRADING_QUEUE_COUNT_PATH : null, undefined, COUNT_QUERY_CONFIG);

  return data ? Math.max(0, data.data.pending) : null;
}
