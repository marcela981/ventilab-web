/*
* Funcionalidad: Notification entities
* Descripción: Client model of the notifications feature: AppNotification (type kept as a string so an unknown future type still renders; `data` always an object, empty when the API sent null or a non-object; `read` derived from readAt), one page of the list with its pagination, the list query, the sizes of the bell popover and the page and the unread count polling interval. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type NotificationData = Readonly<Record<string, unknown>>;

export type AppNotification = {
  id: string
  type: string
  title: string
  body: string
  data: NotificationData
  read: boolean
  readAt: string | null
  createdAt: string
};

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
