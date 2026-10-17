/*
* Funcionalidad: useReservationsCalendar
* Descripción: Reservations of a calendar range (GET /api/reservations?from&to, full or limited projection by role) mapped to the lab entities and cached through useApiQuery under the reservations path, so useReservationsRealtime and the create flow revalidate it. v1.1 (T2 review fix): the previous range is no longer kept while another range loads (it made every slot of the new range look free and hid a failed fetch): data is null until the requested range arrives, so the page shows the skeleton or the error of that range; a refresh of the same range keeps its data. Refreshes every CALENDAR_REFRESH_MS: the backend broadcasts ventilator:availability only when the active reservation changes, so other people's future bookings have no realtime event (backend gap). Depends on the api-client query hook, the reservations service and mapper.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import type { ReservationProjectionDTO } from "../../api/dtos/lab.dto";
import { toLabReservation } from "../../api/mappers/reservations.mapper";
import { calendarQuery, RESERVATIONS_PATH } from "../../api/services/reservations.service";
import type { LabReservation } from "../entities/reservation.entity";
import type { LabQueryResult } from "./use-lab-reservations";

export const CALENDAR_REFRESH_MS = 60_000;

export function useReservationsCalendar(from: Date, to: Date): LabQueryResult<LabReservation[]> {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const query = useMemo(() => calendarQuery(new Date(fromIso), new Date(toIso)), [fromIso, toIso]);
  // No keepPreviousData: data always belongs to the requested range.
  const { data, error, isLoading, mutate } = useApiQuery(RESERVATIONS_PATH, { query }, { refreshInterval: CALENDAR_REFRESH_MS });
  const reservations = useMemo(
    () => (data ? (data.data as ReservationProjectionDTO[]).map(toLabReservation) : null),
    [data],
  );
  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { data: reservations, isLoading, error: error ?? null, reload };
}
