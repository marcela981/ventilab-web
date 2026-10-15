/*
* Funcionalidad: useMyEvaluations
* Descripción: Reads the evaluations assigned to the signed-in user (`GET /api/my-evaluations`, no filters or pagination: the pages filter by state and type on the client) through useApiQuery and maps them to MyEvaluation entities. Depends on @shared/api-client and the evaluations mappers/service.
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
import { toMyEvaluations } from "../../api/mappers/evaluations.mapper";
import { MY_EVALUATIONS_PATH } from "../../api/services/evaluations.service";
import type { MyEvaluation } from "../entities/evaluation.entity";

export type UseMyEvaluationsResult = {
  evaluations: MyEvaluation[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useMyEvaluations(): UseMyEvaluationsResult {
  const { data, error, isLoading, mutate } = useApiQuery(MY_EVALUATIONS_PATH);
  const evaluations = useMemo(() => (data ? toMyEvaluations(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { evaluations, isLoading, error: error ?? null, reload };
}
