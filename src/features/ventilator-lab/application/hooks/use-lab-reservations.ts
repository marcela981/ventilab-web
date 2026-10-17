/*
* Funcionalidad: Lab reservation hooks
* Descripción: useCurrentReservation (GET /api/reservations/current: the active reservation in the caller's projection and the backend control flag) and useMyReservations (GET /api/reservations/mine: current and upcoming reservations of the caller and the caller's group), both cached through useApiQuery and mapped to the lab entities. Depends on the api-client query hook, the reservations service paths and mapper. v1.1 (T9): useCurrentReservation also offers `read()`, a fresh read that resolves with the mapped result (the revoked modal decides the next action from it). v1.2 (T9 review fix W1): `read()` requests through the service (SWR's bound mutate resolves with the stale cache when the fetch fails), stores the answer in the SWR cache without revalidating, and rejects on a failed read.
* Versión: 1.2
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
import { CURRENT_RESERVATION_PATH, MY_RESERVATIONS_PATH, readCurrentReservationResult } from "../../api/services/reservations.service";
import type { CurrentReservation, LabReservation } from "../entities/reservation.entity";

export type LabQueryResult<T> = {
  data: T | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export type CurrentReservationQuery = LabQueryResult<CurrentReservation> & {
  /** Reads again and resolves with the fresh result (rejects on a failed read). */
  read: () => Promise<CurrentReservation>
};

export function useCurrentReservation(): CurrentReservationQuery {
  const { data, error, isLoading, mutate } = useApiQuery(CURRENT_RESERVATION_PATH);
  const current = useMemo(() => (data ? toCurrentReservation(data.data) : null), [data]);
  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);
  // W1: read through the service (SWR's bound mutate resolves with the stale cache on a failed fetch), then share the
  // fresh answer with every consumer without fetching again; a failed read rejects.
  const read = useCallback(async() => {
    const result = await readCurrentReservationResult();

    void mutate(result, { revalidate: false });

    return toCurrentReservation(result.data);
  }, [mutate]);

  return { data: current, isLoading, error: error ?? null, reload, read };
}

export function useMyReservations(): LabQueryResult<LabReservation[]> {
  const { data, error, isLoading, mutate } = useApiQuery(MY_RESERVATIONS_PATH);
  const mine = useMemo(() => (data ? data.data.map(toLabReservation) : null), [data]);
  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { data: mine, isLoading, error: error ?? null, reload };
}
