/*
* Funcionalidad: useGradingQueue
* Descripción: Reads one page of the grading queue (`GET /api/evaluation-grading/queue` with evaluationId, groupId, sortOrder, page and limit; PENDING_REVIEW attempts of the caller's student groups) through useApiQuery and maps it to a GradingQueuePage. The previous page stays on screen while the next one loads (keepPreviousData) and the queue revalidates when the window regains focus, since other teachers may grade the same attempts. Depends on React, @shared/api-client and the grading mappers, service and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toGradingQueuePage } from "../../api/mappers/grading.mapper";
import { GRADING_QUEUE_PATH } from "../../api/services/grading.service";
import type { GradingQueuePage, GradingQueueQuery } from "../entities/grading.entity";

export type UseGradingQueueResult = {
  page: GradingQueuePage | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const QUEUE_QUERY_CONFIG = { keepPreviousData: true, revalidateOnFocus: true } as const;

export function useGradingQueue(query: GradingQueueQuery): UseGradingQueueResult {
  const { data, error, isLoading, mutate } = useApiQuery(GRADING_QUEUE_PATH, { query }, QUEUE_QUERY_CONFIG);
  const page = useMemo(() => (data ? toGradingQueuePage(data.data, data.pagination) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { page, isLoading, error: error ?? null, reload };
}
