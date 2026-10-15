/*
* Funcionalidad: useEvaluationDetail
* Descripción: Reads one evaluation for the builder (`GET /api/evaluations/{id}`: metadata, scenarios, questions with their correct answers, readiness issues, usage and structureLocked) through useApiQuery and maps it to a BuilderEvaluation. A null id disables the request (the new-evaluation route). No focus revalidation: the builder holds local drafts over this data. Depends on React, @shared/api-client, the builder mapper and the authoring service.
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
import { toBuilderEvaluation } from "../../api/mappers/evaluation-builder.mapper";
import { EVALUATION_PATH } from "../../api/services/evaluation-authoring.service";
import type { BuilderEvaluation } from "../entities/evaluation-builder.entity";

export type UseEvaluationDetailResult = {
  evaluation: BuilderEvaluation | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const DETAIL_QUERY_CONFIG = { revalidateOnFocus: false } as const;

export function useEvaluationDetail(evaluationId: string | null): UseEvaluationDetailResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    evaluationId === null ? null : EVALUATION_PATH,
    { params: { id: evaluationId ?? "" } },
    DETAIL_QUERY_CONFIG,
  );
  const evaluation = useMemo(() => (data ? toBuilderEvaluation(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { evaluation, isLoading, error: error ?? null, reload };
}
