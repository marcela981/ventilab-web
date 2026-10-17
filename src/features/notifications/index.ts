/*
* Funcionalidad: Notifications feature barrel
* Descripción: Public surface of the notifications feature (any authenticated role): the NotificationBell of the AppShell top bar (lazy-loads its popover and requests), NotificationToasts (info toast per `notification:new`, dropped in focus mode), NotificationsBadgeSync (feeds the "notificationsUnread" navigation badge), the lazy NotificationsPage of /notifications, its URL and the deep-link resolver. The only import surface for pages and other features; pages/_app.js imports the three app-shell entries by their direct paths to keep the shell chunk small. Depends on the notifications components, pages and config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { NotificationBell } from "./application/components/notification-bell";
export { NotificationToasts } from "./application/components/notification-toasts";
export { NotificationsBadgeSync } from "./application/components/notifications-badge-sync";
export { NOTIFICATION_LINKS, resolveNotificationLink } from "./application/config/notification-links";
export type { NotificationLinkInput } from "./application/config/notification-links";
export { NOTIFICATIONS_URL } from "./application/config/notifications.routes";
export type { AppNotification } from "./application/entities/notification.entity";
export type { NotificationsPageProps } from "./application/pages/notifications.page";
export { NotificationsPage } from "./application/pages/lazy-notifications-page";
