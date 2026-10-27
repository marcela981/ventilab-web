/*
* Funcionalidad: useCreateReservation
* Descripción: Books the ventilator (POST /api/reservations). The backend answers 201 with data null, so on success the hook revalidates the current reservation, the caller's reservations and every cached calendar range. A failure resolves (it never throws) with the ApiError and, for a 409 overlap, the parsed conflict details (`preemptable` and the overlapping reservations) so the staff preemption flow can plug in. Depends on SWR, the api-client error and invalidation helpers, the reservations service and the create reservation mapper and entities.
*   v1.1 (W7, Bloque 1): the created outcome carries the id of the new reservation (null when the backend does not return it).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import { toApiError } from "@shared/api-client/api-error";
import type { ApiError } from "@shared/api-client/api-error";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { toReservationConflict } from "../../api/mappers/create-reservation.mapper";
import {
  createReservation,
  CURRENT_RESERVATION_PATH,
  MY_RESERVATIONS_PATH,
  RESERVATIONS_PATH,
} from "../../api/services/reservations.service";
import type { CreateReservationRequest, ReservationConflict } from "../entities/create-reservation.entity";

const CREATE_INVALIDATES = [RESERVATIONS_PATH, MY_RESERVATIONS_PATH, CURRENT_RESERVATION_PATH] as const;

export type CreateReservationOutcome =
  | { kind: "created", reservationId: string | null }
  | { kind: "failed", error: ApiError, conflict: ReservationConflict | null };

export type UseCreateReservationResult = {
  submit: (request: CreateReservationRequest) => Promise<CreateReservationOutcome>
  isSubmitting: boolean
};

export function useCreateReservation(): UseCreateReservationResult {
  const { mutate } = useSWRConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async(request: CreateReservationRequest): Promise<CreateReservationOutcome> => {
    setIsSubmitting(true);

    try {
      const reservationId = await createReservation(request);
      await invalidateApiQueries(mutate, CREATE_INVALIDATES).catch(() => undefined);

      return { kind: "created", reservationId };
    } catch (caught) {
      const error = toApiError(caught);
      const conflict = error.status === 409 ? toReservationConflict(error.details) : null;

      return { kind: "failed", error, conflict };
    } finally {
      setIsSubmitting(false);
    }
  }, [mutate]);

  return { submit, isSubmitting };
}
