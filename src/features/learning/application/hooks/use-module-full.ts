/*
* Funcionalidad: useModuleFull
* Descripción: The whole module for the print view in ONE request (GET /api/modules/{id}/full through useApiQuery with the learning cache config), mapped to the print entity. No other learning query is involved. Depends on @shared/api-client, the curriculum service and the module print mapper.
* Versión: 1.0 (L7)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toPrintModule } from "../../api/mappers/module-print.mapper";
import { MODULE_FULL_PATH } from "../../api/services/curriculum.service";
import type { PrintModule } from "../entities/module-print.entity";
import { LEARNING_QUERY_CONFIG } from "../entities/learning-query-config";

export type UseModuleFullResult = {
  module: PrintModule | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useModuleFull(moduleId: string): UseModuleFullResult {
  const { data, error, isLoading, mutate } = useApiQuery(MODULE_FULL_PATH, { params: { id: moduleId } }, LEARNING_QUERY_CONFIG);
  const printModule = useMemo(() => (data ? toPrintModule(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { module: printModule, isLoading, error: error ?? null, reload };
}
