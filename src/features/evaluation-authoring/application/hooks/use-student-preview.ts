/*
* Funcionalidad: useStudentPreview
* Descripción: Reads the saved evaluation (`GET /api/evaluations/{id}`, the same SWR key as the builder detail, so an open builder already has it cached) and maps it to the StudentPreview shown by the "Vista previa como estudiante" dialog. Depends on React, @shared/api-client, the preview mapper and the authoring service.
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
import { toStudentPreview } from "../../api/mappers/evaluation-preview.mapper";
import { EVALUATION_PATH } from "../../api/services/evaluation-authoring.service";
import type { StudentPreview } from "../entities/student-preview.entity";

export type UseStudentPreviewResult = {
  preview: StudentPreview | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const PREVIEW_QUERY_CONFIG = { revalidateOnFocus: false } as const;

export function useStudentPreview(evaluationId: string): UseStudentPreviewResult {
  const { data, error, isLoading, mutate } = useApiQuery(EVALUATION_PATH, { params: { id: evaluationId } }, PREVIEW_QUERY_CONFIG);
  const preview = useMemo(() => (data ? toStudentPreview(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { preview, isLoading, error: error ?? null, reload };
}
