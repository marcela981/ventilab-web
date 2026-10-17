/*
* Funcionalidad: Notifications service
* Descripción: API path constants of the notifications feature (any authenticated role): the paginated list (`GET /api/notifications?page&limit&unreadOnly`, newest first) and the unread count (`GET /api/notifications/unread-count` → {count}), both read with useApiQuery, plus the writes through @shared/api-client: markNotificationRead (`PATCH /api/notifications/{id}/read`, idempotent), markAllNotificationsRead (`PATCH /api/notifications/read-all` → {updated}) and deleteNotification (`DELETE /api/notifications/{id}`). NOTIFICATIONS_QUERY_PATHS lists the cached reads every write and every `notification:new` must refresh. Depends on the api-client request helpers and the notifications DTOs.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiDelete, apiPatch } from "@shared/api-client/api-request";
import type { NotificationDTO, ReadAllNotificationsResultDTO } from "../dtos/notifications.dto";

export const NOTIFICATIONS_PATH = "/api/notifications";
export const UNREAD_NOTIFICATIONS_COUNT_PATH = "/api/notifications/unread-count";
export const NOTIFICATION_READ_PATH = "/api/notifications/{id}/read";
export const NOTIFICATIONS_READ_ALL_PATH = "/api/notifications/read-all";
export const NOTIFICATION_PATH = "/api/notifications/{id}";

// Any change of a notification changes the list pages and the unread count (bell, badge and page).
export const NOTIFICATIONS_QUERY_PATHS = [NOTIFICATIONS_PATH, UNREAD_NOTIFICATIONS_COUNT_PATH] as const;

export async function markNotificationRead(id: string): Promise<NotificationDTO> {
  const result = await apiPatch(NOTIFICATION_READ_PATH, { params: { id } });

  return result.data;
}

export async function markAllNotificationsRead(): Promise<ReadAllNotificationsResultDTO> {
  const result = await apiPatch(NOTIFICATIONS_READ_ALL_PATH);

  return result.data;
}

export async function deleteNotification(id: string): Promise<void> {
  await apiDelete(NOTIFICATION_PATH, { params: { id } });
}
