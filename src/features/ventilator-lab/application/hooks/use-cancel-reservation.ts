/*
* Funcionalidad: useCancelReservation / useCancelActor
* Descripción: useCancelReservation cancels a scheduled reservation (POST /api/reservations/{id}/cancel, 200 with data null) and then revalidates the current reservation, the caller's reservations and every cached calendar range; it also revalidates them after a failure, because a 404/409 means the list is stale. It never throws: it resolves with the ApiError. v1.1 (T4 review fix S3): it resolves as soon as the cancel answers; the revalidations run in the background. useCancelActor gathers what the client knows to mirror the backend cancel permission: the session user and role and the groups the caller leads (GET /api/groups/mine memberships with memberRole LEADER, shared SWR cache with the holder options). Teacher supervision is not readable by a teacher (GET /api/groups/{id}/supervisions is admin only), so supervisedGroupIds stays empty: a teacher's "mine" holds only reservations the teacher holds or created, which the creator/holder rule already covers. Depends on SWR, the session, the api-client query/error/invalidation helpers, the holders and reservations services and the create reservation mapper.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { toApiError } from "@shared/api-client/api-error";
import type { ApiError } from "@shared/api-client/api-error";
import { invalidateApiQueries, useApiQuery } from "@shared/api-client/use-api-query";
import { useSession } from "@shared/session/use-session";
import { leaderGroupIds } from "../../api/mappers/create-reservation.mapper";
import { MY_GROUPS_PATH, MY_GROUPS_PERMISSION } from "../../api/services/holders.service";
import {
  cancelReservation,
  CURRENT_RESERVATION_PATH,
  MY_RESERVATIONS_PATH,
  RESERVATIONS_PATH,
} from "../../api/services/reservations.service";
import type { CancelActor } from "../entities/my-reservations.entity";

const CANCEL_INVALIDATES = [RESERVATIONS_PATH, MY_RESERVATIONS_PATH, CURRENT_RESERVATION_PATH] as const;

const NO_GROUPS: ReadonlySet<string> = new Set<string>();

export type CancelReservationOutcome = { kind: "cancelled" } | { kind: "failed", error: ApiError };

export type UseCancelReservationResult = {
  cancel: (reservationId: string) => Promise<CancelReservationOutcome>
  isCancelling: boolean
};

export function useCancelReservation(): UseCancelReservationResult {
  const { mutate } = useSWRConfig();
  const [isCancelling, setIsCancelling] = useState(false);

  const cancel = useCallback(async(reservationId: string): Promise<CancelReservationOutcome> => {
    setIsCancelling(true);

    try {
      await cancelReservation(reservationId);

      return { kind: "cancelled" };
    } catch (caught) {
      return { kind: "failed", error: toApiError(caught) };
    } finally {
      // T4 review fix S3: the toast and the dialog close do not wait for the lists; they refresh in the background.
      void invalidateApiQueries(mutate, CANCEL_INVALIDATES).catch(() => undefined);
      setIsCancelling(false);
    }
  }, [mutate]);

  return { cancel, isCancelling };
}

export function useCancelActor(): CancelActor {
  const { user, role, hasPermission } = useSession();
  const myGroups = useApiQuery(hasPermission(MY_GROUPS_PERMISSION) ? MY_GROUPS_PATH : null);
  const leadGroupIds = useMemo(
    () => (myGroups.data ? new Set(leaderGroupIds(myGroups.data.data)) : NO_GROUPS),
    [myGroups.data],
  );

  return useMemo(
    () => ({ userId: user?.id ?? null, role, leadGroupIds, supervisedGroupIds: NO_GROUPS }),
    [user?.id, role, leadGroupIds],
  );
}
