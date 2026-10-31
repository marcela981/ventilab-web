/*
* Funcionalidad: useEvaluatedModuleIds
* Descripción: Curriculum modules that have at least one evaluation assigned to the signed-in student, read from ONE `GET /api/my-evaluations` (the same SWR key as the unfiltered student list, so a visit to /evaluations or the curriculum reuses the other's cache) instead of one request per module card. Null while loading, on error or when disabled (staff). Used by the "Quiz del módulo" link of the curriculum (Bloque 3, Ola 4). Depends on @shared/api-client and the evaluations mapper and service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toMyEvaluations } from "../../api/mappers/evaluations.mapper";
import { MY_EVALUATIONS_PATH } from "../../api/services/evaluations.service";

export function useEvaluatedModuleIds(enabled: boolean): ReadonlySet<string> | null {
  const { data } = useApiQuery(enabled ? MY_EVALUATIONS_PATH : null);

  return useMemo(() => {
    if (!enabled || !data) {
      return null;
    }

    return new Set(toMyEvaluations(data.data).flatMap((item) => (item.moduleId ? [item.moduleId] : [])));
  }, [enabled, data]);
}
