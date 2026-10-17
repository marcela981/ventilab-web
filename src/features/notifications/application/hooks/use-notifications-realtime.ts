/*
* Funcionalidad: useNotificationsRealtime
* Descripción: Refreshes every cached notifications read (list pages and unread count) when the socket delivers `notification:new` to the user room. Mounted by the bell, which the AppShell shows on every new page, so the bell, the navigation badge and /notifications stay current. Depends on SWR, @shared/api-client, @shared/realtime and the notifications service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { useSocketEvent } from "@shared/realtime/use-socket-event";
import { NOTIFICATIONS_QUERY_PATHS } from "../../api/services/notifications.service";

export function useNotificationsRealtime(): void {
  const { mutate } = useSWRConfig();

  useSocketEvent("notification:new", () => {
    void invalidateApiQueries(mutate, NOTIFICATIONS_QUERY_PATHS).catch(() => undefined);
  });
}
