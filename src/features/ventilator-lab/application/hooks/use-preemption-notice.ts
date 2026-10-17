/*
* Funcionalidad: usePreemptionNotice
* Descripción: Real-time notice for the holder of a reservation preempted by a teacher or an admin, mounted by every /lab page: an info toast of the shared design-system ToastProvider on reservation:preempted (user room, and group room when joined) or, as a fallback, on a RESERVATION_PREEMPTED notification:new. Each reservation is announced once whichever events arrive. A notification-only preemption also revalidates the current reservation, the caller's reservations and the calendar (reservation:preempted already does it through useReservationsRealtime). The "control revoked" modal of the console is a separate flow. v1.1 (T3 review fix): the toast hides after PREEMPTION_NOTICE_AUTO_HIDE_MS (a sticky info toast would block the global toast queue), and `expectOwnPreemption(ids)` marks the reservations the caller is about to preempt as already announced (the backend notifies every holder without excluding the actor, so a staff caller holding one of them, or a member of its group, would be told "fue desplazada"); it returns an undo for a failed request. Depends on SWR, the api-client invalidation helper, the shared realtime and toast hooks, the reservations service paths and the preemption notice entities.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo, useRef } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { useToast } from "@shared/design-system/components/use-toast";
import { useSocketEvent } from "@shared/realtime";
import { CURRENT_RESERVATION_PATH, MY_RESERVATIONS_PATH, RESERVATIONS_PATH } from "../../api/services/reservations.service";
import { noticeFromNotification, noticeFromPreemptedEvent } from "../entities/preemption-notice.entity";
import type { PreemptionNotice } from "../entities/preemption-notice.entity";

const PREEMPTION_PATHS = [CURRENT_RESERVATION_PATH, MY_RESERVATIONS_PATH, RESERVATIONS_PATH] as const;

/** Long enough to read the window and the reason, finite so later toasts are not blocked behind it. */
export const PREEMPTION_NOTICE_AUTO_HIDE_MS = 30_000;

export type PreemptionNoticeApi = {
  /**
   * Marks reservations the caller is preempting as already announced (call it BEFORE the request: the realtime event
   * may arrive before the response). Returns an undo for a failed request.
   */
  expectOwnPreemption: (reservationIds: readonly string[]) => () => void
};

export function usePreemptionNotice(): PreemptionNoticeApi {
  const toast = useToast();
  const { mutate } = useSWRConfig();
  const announced = useRef(new Set<string>());

  /** Shows the notice unless this reservation was already announced; true when it was shown. */
  const announce = useCallback((notice: PreemptionNotice | null): boolean => {
    if (!notice || announced.current.has(notice.reservationId)) {
      return false;
    }

    announced.current.add(notice.reservationId);
    toast.info(notice.message, { autoHideMs: PREEMPTION_NOTICE_AUTO_HIDE_MS });

    return true;
  }, [toast]);

  useSocketEvent("reservation:preempted", (event) => {
    announce(noticeFromPreemptedEvent(event));
  });

  useSocketEvent("notification:new", (notification) => {
    if (announce(noticeFromNotification(notification))) {
      void invalidateApiQueries(mutate, PREEMPTION_PATHS).catch(() => undefined);
    }
  });

  const expectOwnPreemption = useCallback((reservationIds: readonly string[]) => {
    const added = reservationIds.filter((id) => !announced.current.has(id));

    added.forEach((id) => announced.current.add(id));

    return () => {
      added.forEach((id) => announced.current.delete(id));
    };
  }, []);

  return useMemo(() => ({ expectOwnPreemption }), [expectOwnPreemption]);
}
