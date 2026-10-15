/*
* Funcionalidad: usePendingGradingCount
* Descripción: Number of attempts waiting for review for the signed-in teacher or admin. The API has no count endpoint, so it reads a one-row page of the grading queue (`GET /api/evaluation-grading/queue?limit=1`) and takes `pagination.total` from the envelope. Refreshes every 120 s and when the window regains focus; grading mutations refresh it too because they invalidate the queue path. A false `enabled` (not staff) sends no request and returns null. Depends on React, @shared/api-client and the grading service and entities. v1.1 (G1 review W2): the refresh interval goes from 60 s to 120 s, since each queue read also closes expired attempts on the backend.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { GRADING_QUEUE_PATH } from "../../api/services/grading.service";
import { toPendingCount } from "../entities/grading.entity";

export const PENDING_COUNT_REFRESH_MS = 120_000;

const COUNT_QUERY = { page: 1, limit: 1 } as const;
const COUNT_QUERY_CONFIG = { refreshInterval: PENDING_COUNT_REFRESH_MS, revalidateOnFocus: true } as const;

export function usePendingGradingCount(enabled: boolean): number | null {
  const { data } = useApiQuery(enabled ? GRADING_QUEUE_PATH : null, { query: COUNT_QUERY }, COUNT_QUERY_CONFIG);

  return useMemo(() => (data ? toPendingCount(data.pagination, data.data.length) : null), [data]);
}
