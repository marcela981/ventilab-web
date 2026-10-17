/*
* Funcionalidad: usePreemptionNotice
* Descripción: Revalidation for the holder of a reservation preempted by a teacher or an admin, mounted by every /lab page. The notice itself is the notification toast of the notifications feature (NotificationToasts in pages/_app.js shows every notification:new, suppressed by focus mode on /lab/live where the "control revoked" modal is the notice). This hook revalidates the current reservation, the caller's reservations and the calendar on a notification-only preemption (RESERVATION_PREEMPTED notification:new), once per reservation and not when reservation:preempted already arrived for it (useReservationsRealtime revalidates that one). The backend no longer notifies the actor of a preemption, so there is no client-side self-notification filter. Depends on SWR, the api-client invalidation helper, the shared realtime hooks, the reservations service paths and the preemption notice entities. v1.1 (T3 review fix): toast auto-hide and `expectOwnPreemption`. v1.2 (O1 notifications): the toast moved to the notifications feature; `expectOwnPreemption` became a no-op. v1.3 (B2 closure): `expectOwnPreemption` and its API removed (the backend excludes the actor).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRef } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { useSocketEvent } from "@shared/realtime";
import { CURRENT_RESERVATION_PATH, MY_RESERVATIONS_PATH, RESERVATIONS_PATH } from "../../api/services/reservations.service";
import { noticeFromNotification } from "../entities/preemption-notice.entity";

const PREEMPTION_PATHS = [CURRENT_RESERVATION_PATH, MY_RESERVATIONS_PATH, RESERVATIONS_PATH] as const;

export function usePreemptionNotice(): void {
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
}
