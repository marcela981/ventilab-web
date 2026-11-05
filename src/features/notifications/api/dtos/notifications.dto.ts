/*
* Funcionalidad: Notifications DTOs
* Descripción: Aliases of the generated OpenAPI schemas used by the notifications feature: NotificationDTO is the discriminated union of the per-type variants the API documents (`oneOf` + discriminator on `type`), so `data` is narrowed by `type` (reservation ids, evaluation and assignment ids, attempt ids, feedback id, roles, offline reason) without any cast; plus the unread count and the read-all result. Depends on the generated api-client schema. v1.1 (B2 closure): the per-type discriminated union replaces the untyped `data`. v1.2 (Bloque 3): ATTEMPT_RESET joins the union (data {evaluationId}). v1.3 (ajustes D2): GROUP_MEMBER_ADDED.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type NotificationDTO =
  | Schemas["ReservationPreemptedNotificationDTO"]
  | Schemas["ReservationCancelledNotificationDTO"]
  | Schemas["EvaluationActivatedNotificationDTO"]
  | Schemas["GradePublishedNotificationDTO"]
  | Schemas["FeedbackReadyNotificationDTO"]
  | Schemas["AttemptResetNotificationDTO"]
  | Schemas["RoleChangedNotificationDTO"]
  | Schemas["GroupMemberAddedNotificationDTO"]
  | Schemas["VentilatorOfflineNotificationDTO"];
export type NotificationTypeDTO = NotificationDTO["type"];
export type UnreadNotificationsCountDTO = Schemas["UnreadNotificationsCountDTO"];
export type ReadAllNotificationsResultDTO = Schemas["ReadAllNotificationsResultDTO"];
