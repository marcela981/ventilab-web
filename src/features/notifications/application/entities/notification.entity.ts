/*
* Funcionalidad: Notification entities
* Descripción: Client model of the notifications feature: AppNotification, the discriminated union of the API notification variants (narrowing `type` types its `data`, null when the API sent none) plus `read` derived from readAt; NotificationType and NotificationOf<T>; one page of the list with its pagination, the list query, the sizes of the bell popover and the page and the unread count polling interval. Depends on the notifications DTOs (types only). v1.1 (B2 closure): typed by `type` with the generated discriminated union instead of a string type and an untyped `data` record.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { NotificationDTO } from "../../api/dtos/notifications.dto";

// Distributes over the variants so `type` keeps discriminating `data`.
type WithReadFlag<T> = T extends unknown ? T & { read: boolean } : never;

export type AppNotification = WithReadFlag<NotificationDTO>;

export type NotificationType = AppNotification["type"];

export type NotificationOf<T extends NotificationType> = Extract<AppNotification, { type: T }>;

export type NotificationsPage = {
  items: readonly AppNotification[]
  total: number
  page: number
  pages: number
};

export type NotificationsQuery = {
  page: number
  limit: number
  unreadOnly?: boolean
};

/** Latest notifications shown by the bell popover. */
export const BELL_NOTIFICATIONS_LIMIT = 8;

/** Rows per page of /notifications. */
export const NOTIFICATIONS_PAGE_SIZES = [10, 25, 50];

/** Polling of the unread count on top of the realtime refresh (a missed socket event heals within this time). */
export const UNREAD_COUNT_REFRESH_MS = 120_000;

/** Query of one page of /notifications (pageIndex is zero-based, the API page is one-based). */
export function toNotificationsQuery(pageIndex: number, limit: number, unreadOnly: boolean): NotificationsQuery {
  return unreadOnly ? { page: pageIndex + 1, limit, unreadOnly: true } : { page: pageIndex + 1, limit };
}
