/*
* Funcionalidad: usePreemptionNotice
* Descripción: Real-time notice for the holder of a reservation preempted by a teacher or an admin, mounted by every /lab page: an info toast of the shared design-system ToastProvider on reservation:preempted (user room, and group room when joined) or, as a fallback, on a RESERVATION_PREEMPTED notification:new. Each reservation is announced once whichever events arrive. A notification-only preemption also revalidates the current reservation, the caller's reservations and the calendar (reservation:preempted already does it through useReservationsRealtime). The "control revoked" modal of the console is a separate flow. v1.1 (T3 review fix): the toast hides after PREEMPTION_NOTICE_AUTO_HIDE_MS (a sticky info toast would block the global toast queue), and `expectOwnPreemption(ids)` marks the reservations the caller is about to preempt as already announced (the backend notifies every holder without excluding the actor, so a staff caller holding one of them, or a member of its group, would be told "fue desplazada"); it returns an undo for a failed request. Depends on SWR, the api-client invalidation helper, the shared realtime and toast hooks, the reservations service paths and the preemption notice entities. v1.2 (O1 notifications): the toast moved to the notifications feature (NotificationToasts in pages/_app.js shows every notification:new, suppressed by focus mode on /lab/live where the revoked modal is the notice). This hook keeps only the revalidation of a notification-only preemption (RESERVATION_PREEMPTED notification:new → current reservation, my reservations and calendar), once per reservation and not when reservation:preempted already arrived for it (useReservationsRealtime revalidates that one). `expectOwnPreemption` stays as a no-op so its callers (lab-reservations page, preempt dialog, lab-live) keep compiling until they drop it. No longer depends on the toast hook.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo, useRef } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { useSocketEvent } from "@shared/realtime";
import { CURRENT_RESERVATION_PATH, MY_RESERVATIONS_PATH, RESERVATIONS_PATH } from "../../api/services/reservations.service";
import { noticeFromNotification } from "../entities/preemption-notice.entity";

const PREEMPTION_PATHS = [CURRENT_RESERVATION_PATH, MY_RESERVATIONS_PATH, RESERVATIONS_PATH] as const;

export type PreemptionNoticeApi = {
  /**
   * Kept for its callers: the notice of a preemption is now the notification toast of the notifications feature,
   * which this hook no longer controls. Returns a no-op undo.
   */
  expectOwnPreemption: (reservationIds: readonly string[]) => () => void
};

function noUndo() {}

export function usePreemptionNotice(): PreemptionNoticeApi {
  const { mutate } = useSWRConfig();
  // Reservations whose preemption was already revalidated (by the event or by a notification).
  const revalidated = useRef(new Set<string>());

  useSocketEvent("reservation:preempted", (event) => {
    revalidated.current.add(event.reservationId);
  });

  useSocketEvent("notification:new", (notification) => {
    const notice = noticeFromNotification(notification);

    if (notice && !revalidated.current.has(notice.reservationId)) {
      revalidated.current.add(notice.reservationId);
      void invalidateApiQueries(mutate, PREEMPTION_PATHS).catch(() => undefined);
    }
  });

  const expectOwnPreemption = useCallback((): (() => void) => noUndo, []);

  return useMemo(() => ({ expectOwnPreemption }), [expectOwnPreemption]);
}
