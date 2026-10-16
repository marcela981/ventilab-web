/*
* Funcionalidad: useReservationsRealtime
* Descripción: Revalidates the cached reservation reads (current, mine and calendar) when the backend announces a change: `ventilator:availability` (broadcast when the active reservation starts or ends, and sent to each socket on authentication) and `reservation:preempted` (user and group rooms). It never emits ventilator:join. Depends on SWR, the api-client invalidation helper, the shared realtime hooks and the reservations service paths.
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
import { CURRENT_RESERVATION_PATH, MY_RESERVATIONS_PATH, RESERVATIONS_PATH } from "../../api/services/reservations.service";

const REALTIME_PATHS = [CURRENT_RESERVATION_PATH, MY_RESERVATIONS_PATH, RESERVATIONS_PATH] as const;

export function useReservationsRealtime(): void {
  const { mutate } = useSWRConfig();

  const refresh = useCallback(() => {
    void invalidateApiQueries(mutate, REALTIME_PATHS).catch(() => undefined);
  }, [mutate]);

  useSocketEvent("ventilator:availability", refresh);
  useSocketEvent("reservation:preempted", refresh);
}
