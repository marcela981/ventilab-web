/*
* Funcionalidad: Notifications mapper
* Descripción: Maps the notifications DTOs to the client entities: toAppNotification (a null or non-object `data` becomes an empty object, `read` from readAt), toNotificationsPage (pagination of the envelope, falling back to one page of the received items) and toUnreadCount (a missing, negative or non-finite count is 0). Depends on the notifications DTOs, the api-client pagination type and the notification entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ApiPagination } from "@shared/api-client/api-types";
import type { AppNotification, NotificationData, NotificationsPage } from "../../application/entities/notification.entity";
import type { NotificationDTO, UnreadNotificationsCountDTO } from "../dtos/notifications.dto";

function toData(data: unknown): NotificationData {
  return typeof data === "object" && data !== null && !Array.isArray(data) ? { ...(data as Record<string, unknown>) } : {};
}

export function toAppNotification(dto: NotificationDTO): AppNotification {
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    body: dto.body,
    data: toData(dto.data),
    read: dto.readAt !== null,
    readAt: dto.readAt,
    createdAt: dto.createdAt,
  };
}

export function toNotificationsPage(items: readonly NotificationDTO[], pagination: ApiPagination | null): NotificationsPage {
  return {
    items: items.map(toAppNotification),
    total: pagination?.total ?? items.length,
    page: pagination?.page ?? 1,
    pages: pagination?.pages ?? 1,
  };
}

export function toUnreadCount(dto: UnreadNotificationsCountDTO | null | undefined): number {
  const count = dto?.count;

  return typeof count === "number" && Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}
