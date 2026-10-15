/*
* Funcionalidad: useEvaluationsRealtime
* Descripción: Keeps the student evaluation views fresh: when the socket reports `evaluation:activated` (an evaluation opened for one of the user's groups) or `grade:published` (a grade of the user was published), it revalidates the SWR keys of my evaluations and my grades. A failed revalidation only leaves stale data on screen. Depends on SWR, @shared/realtime, @shared/api-client and the evaluations service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { useSocketEvent } from "@shared/realtime";
import { MY_EVALUATIONS_PATH, MY_GRADES_PATH } from "../../api/services/evaluations.service";

const REALTIME_PATHS = [MY_EVALUATIONS_PATH, MY_GRADES_PATH] as const;

export function useEvaluationsRealtime(): void {
  const { mutate } = useSWRConfig();

  const refresh = useCallback(() => {
    void invalidateApiQueries(mutate, REALTIME_PATHS).catch(() => undefined);
  }, [mutate]);

  useSocketEvent("evaluation:activated", refresh);
  useSocketEvent("grade:published", refresh);
}
