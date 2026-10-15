/*
* Funcionalidad: useEvaluationAssignments
* Descripción: Reads the activations of one evaluation (`GET /api/evaluations/{id}/assignments`: group name, window, derived state and attempt counts, limited by the backend to the groups the caller manages) through useApiQuery and maps them to EvaluationAssignment sorted by start. Every authoring mutation invalidates this key (EVALUATION_AUTHORING_QUERY_PATHS). Depends on React, @shared/api-client, the assignment mapper and the authoring service.
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
import { toEvaluationAssignments } from "../../api/mappers/evaluation-assignment.mapper";
import { EVALUATION_ASSIGNMENTS_PATH } from "../../api/services/evaluation-authoring.service";
import type { EvaluationAssignment } from "../entities/evaluation-assignment.entity";

export type UseEvaluationAssignmentsResult = {
  assignments: EvaluationAssignment[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useEvaluationAssignments(evaluationId: string): UseEvaluationAssignmentsResult {
  const { data, error, isLoading, mutate } = useApiQuery(EVALUATION_ASSIGNMENTS_PATH, { params: { id: evaluationId } });
  const assignments = useMemo(() => (data ? toEvaluationAssignments(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { assignments, isLoading, error: error ?? null, reload };
}
