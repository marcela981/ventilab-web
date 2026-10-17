/*
* Funcionalidad: useNotificationActions
* Descripción: Writes of the notifications feature: markRead(id) (`PATCH /api/notifications/{id}/read`), markAllRead() (`PATCH /api/notifications/read-all`, resolves the number marked) and remove(id) (`DELETE /api/notifications/{id}`). Each one refreshes every cached list page and the unread count after the request, also when it fails (a notification deleted elsewhere answers not found and must leave the list). Errors are rethrown for the caller to show. Depends on React, SWR, @shared/api-client and the notifications service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_QUERY_PATHS,
} from "../../api/services/notifications.service";

export type NotificationActions = {
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<number>
  remove: (id: string) => Promise<void>
};

export function useNotificationActions(): NotificationActions {
  const { mutate } = useSWRConfig();

  const refresh = useCallback(async() => {
    await invalidateApiQueries(mutate, NOTIFICATIONS_QUERY_PATHS).catch(() => undefined);
  }, [mutate]);

  const markRead = useCallback(async(id: string) => {
    try {
      await markNotificationRead(id);
    } finally {
      void refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async() => {
    try {
      const result = await markAllNotificationsRead();

      return result.updated;
    } finally {
      void refresh();
    }
  }, [refresh]);

  const remove = useCallback(async(id: string) => {
    try {
      await deleteNotification(id);
    } finally {
      void refresh();
    }
  }, [refresh]);

  return useMemo(() => ({ markRead, markAllRead, remove }), [markRead, markAllRead, remove]);
}
