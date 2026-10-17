/*
* Funcionalidad: Notifications DTOs
* Descripción: Aliases of the generated OpenAPI schemas used by the notifications feature: NotificationDTO (id, type, title, body, data, readAt, createdAt; `data` is typed by the API as a plain object or null, the per-type ids are read defensively by the deep-link table), the unread count and the read-all result. Depends on the generated api-client schema.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type NotificationDTO = Schemas["NotificationDTO"];
export type NotificationTypeDTO = NotificationDTO["type"];
export type UnreadNotificationsCountDTO = Schemas["UnreadNotificationsCountDTO"];
export type ReadAllNotificationsResultDTO = Schemas["ReadAllNotificationsResultDTO"];
