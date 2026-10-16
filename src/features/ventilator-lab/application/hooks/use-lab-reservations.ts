/*
* Funcionalidad: Lab reservation hooks
* Descripción: useCurrentReservation (GET /api/reservations/current: the active reservation in the caller's projection and the backend control flag) and useMyReservations (GET /api/reservations/mine: current and upcoming reservations of the caller and the caller's group), both cached through useApiQuery and mapped to the lab entities. Depends on the api-client query hook, the reservations service paths and mapper.
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
import { toCurrentReservation, toLabReservation } from "../../api/mappers/reservations.mapper";
import { CURRENT_RESERVATION_PATH, MY_RESERVATIONS_PATH } from "../../api/services/reservations.service";
import type { CurrentReservation, LabReservation } from "../entities/reservation.entity";

export type LabQueryResult<T> = {
  data: T | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useCurrentReservation(): LabQueryResult<CurrentReservation> {
  const { data, error, isLoading, mutate } = useApiQuery(CURRENT_RESERVATION_PATH);
  const current = useMemo(() => (data ? toCurrentReservation(data.data) : null), [data]);
  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { data: current, isLoading, error: error ?? null, reload };
}

export function useMyReservations(): LabQueryResult<LabReservation[]> {
  const { data, error, isLoading, mutate } = useApiQuery(MY_RESERVATIONS_PATH);
  const mine = useMemo(() => (data ? data.data.map(toLabReservation) : null), [data]);
  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { data: mine, isLoading, error: error ?? null, reload };
}
