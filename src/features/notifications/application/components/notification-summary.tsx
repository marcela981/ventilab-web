/*
* Funcionalidad: NotificationSummary
* Descripción: Presentational content of one notification, shared by the bell popover and /notifications: type icon, title, body, relative time (`<time>` with the full Bogota date as tooltip text) and, while unread, a dot plus the screen-reader text "Sin leer" (the meaning never depends on colour). Depends on the shared format helpers, the notification type icon, the notification entities and the feature styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { formatDateTime, formatRelativeAge } from "@shared/lib/format";
import type { AppNotification } from "../entities/notification.entity";
import { NotificationTypeIcon } from "./notification-type-icon";
import styles from "../../UI/notifications.module.css";

// TODO(i18n): move to a notifications namespace in src/i18n.
export const NOTIFICATION_SUMMARY_COPY = {
  unread: "Sin leer",
} as const;

export type NotificationSummaryProps = {
  notification: AppNotification
  // Reference instant of the relative time; tests pin it.
  now?: Date | undefined
  compact?: boolean
};

export function NotificationSummary({ notification, now, compact = false }: NotificationSummaryProps) {
  return (
    <span className={cx(styles.summary)} data-read={notification.read ? "true" : "false"}>
      <span className={cx(styles.typeIcon)}>
        <NotificationTypeIcon type={notification.type} />
      </span>
      <span className={cx(styles.text)}>
        <span className={cx(styles.title)}>
          {notification.read ? null : (
            <>
              <span className={cx(styles.unreadDot)} aria-hidden="true" />
              <span className={cx(styles.visuallyHidden)}>{NOTIFICATION_SUMMARY_COPY.unread}: </span>
            </>
          )}
          {notification.title}
        </span>
        <span className={cx(styles.body, compact && styles.bodyCompact)}>{notification.body}</span>
        <time className={cx(styles.time)} dateTime={notification.createdAt} title={formatDateTime(notification.createdAt)}>
          {formatRelativeAge(notification.createdAt, now)}
        </time>
      </span>
    </span>
  );
}
