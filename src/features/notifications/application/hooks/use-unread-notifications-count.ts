/*
* Funcionalidad: useUnreadNotificationsCount
* Descripción: Number of unread notifications of the signed-in user (`GET /api/notifications/unread-count` → {count}) through useApiQuery; refreshed every UNREAD_COUNT_REFRESH_MS, when the window regains focus and whenever a notification changes (every write and `notification:new` invalidate the path). The bell and the navigation badge share the same SWR key, so they show the same value with one request. A false `enabled` sends no request and returns null; null also while the first read is pending or failed. Depends on React, @shared/api-client and the notifications service, mapper and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toUnreadCount } from "../../api/mappers/notifications.mapper";
import { UNREAD_NOTIFICATIONS_COUNT_PATH } from "../../api/services/notifications.service";
import { UNREAD_COUNT_REFRESH_MS } from "../entities/notification.entity";

const COUNT_QUERY_CONFIG = { refreshInterval: UNREAD_COUNT_REFRESH_MS, revalidateOnFocus: true } as const;

export function useUnreadNotificationsCount(enabled: boolean): number | null {
  const { data } = useApiQuery(enabled ? UNREAD_NOTIFICATIONS_COUNT_PATH : null, undefined, COUNT_QUERY_CONFIG);

  return useMemo(() => (data ? toUnreadCount(data.data) : null), [data]);
}
