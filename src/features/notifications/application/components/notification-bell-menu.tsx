/*
* Funcionalidad: NotificationBellMenu
* Descripción: Bell of the AppShell top bar (loaded lazily by NotificationBell): IconButton + MUI Badge with the unread count (useUnreadNotificationsCount; aria-label "Notificaciones: N sin leer"), and a popover (keyboard: focus moves in, Escape closes, items are buttons) that reads the latest BELL_NOTIFICATIONS_LIMIT notifications only while open: icon, title, body, relative time and read state. Clicking a notification marks it as read (`PATCH /api/notifications/{id}/read`, a failure does not block) and then navigates to its deep link (notification-links); one without a link only gets marked. "Marcar todas como leídas" (`PATCH /api/notifications/read-all`, error as a toast) and "Ver todas" → /notifications. Refreshes the count and the list on `notification:new` (useNotificationsRealtime). Loading skeleton, retryable error and empty state. Depends on MUI, next/link, next/router, the design-system skeleton and toast, the notifications hooks, config, entities, components and styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import Badge from "@mui/material/Badge";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import type { MouseEvent } from "react";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { resolveNotificationLink } from "../config/notification-links";
import { NOTIFICATIONS_URL } from "../config/notifications.routes";
import { BELL_NOTIFICATIONS_LIMIT } from "../entities/notification.entity";
import type { AppNotification } from "../entities/notification.entity";
import { getNotificationsErrorMessage } from "../entities/notifications-error-messages";
import { useNotificationActions } from "../hooks/use-notification-actions";
import { useNotificationsList } from "../hooks/use-notifications-list";
import { useNotificationsRealtime } from "../hooks/use-notifications-realtime";
import { useUnreadNotificationsCount } from "../hooks/use-unread-notifications-count";
import { NotificationSummary } from "./notification-summary";
import styles from "../../UI/notifications.module.css";

// TODO(i18n): move to a notifications namespace in src/i18n.
export const NOTIFICATION_BELL_COPY = {
  label: "Notificaciones",
  labelWithUnread: (count: number) => `Notificaciones: ${count} sin leer`,
  title: "Notificaciones",
  markAll: "Marcar todas como leídas",
  viewAll: "Ver todas",
  loading: "Cargando notificaciones…",
  empty: "No tienes notificaciones.",
  loadError: "No se pudieron cargar las notificaciones.",
  retry: "Reintentar",
} as const;

export const NOTIFICATION_BELL_POPOVER_ID = "notification-bell-popover";

const BELL_QUERY = { page: 1, limit: BELL_NOTIFICATIONS_LIMIT } as const;

export type NotificationBellMenuProps = {
  // Reference instant of the relative times; tests pin it.
  now?: Date | undefined
};

export function NotificationBellMenu({ now }: NotificationBellMenuProps = {}) {
  const router = useRouter();
  const toast = useToast();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const open = anchor !== null;
  const count = useUnreadNotificationsCount(true) ?? 0;
  const { page, isLoading, error, reload } = useNotificationsList(open ? BELL_QUERY : null);
  const actions = useNotificationActions();

  useNotificationsRealtime();

  const close = () => setAnchor(null);

  const openNotification = async(notification: AppNotification) => {
    const link = resolveNotificationLink(notification);

    if (link) {
      close();
    }

    if (!notification.read) {
      // Marking is a side effect: a failure must not keep the user from the target.
      await actions.markRead(notification.id).catch(() => undefined);
    }

    if (link) {
      await router.push(link).catch(() => undefined);
    }
  };

  const markAll = async() => {
    setMarkingAll(true);

    try {
      await actions.markAllRead();
    } catch (markError) {
      toast.error(getNotificationsErrorMessage(markError));
    } finally {
      setMarkingAll(false);
    }
  };

  const renderBody = () => {
    if (page) {
      return page.items.length === 0 ? (
        <p className={cx(styles.popoverMessage)}>{NOTIFICATION_BELL_COPY.empty}</p>
      ) : (
        <ul className={cx(styles.popoverList)}>
          {page.items.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                className={cx(styles.popoverItem)}
                data-read={notification.read ? "true" : "false"}
                onClick={() => void openNotification(notification)}
              >
                <NotificationSummary notification={notification} now={now} compact />
              </button>
            </li>
          ))}
        </ul>
      );
    }

    if (error && !isLoading) {
      return (
        <div className={cx(styles.popoverMessage)} role="alert">
          <p>{NOTIFICATION_BELL_COPY.loadError} {getNotificationsErrorMessage(error)}</p>
          <Button size="small" onClick={() => void reload()}>{NOTIFICATION_BELL_COPY.retry}</Button>
        </div>
      );
    }

    return <ListSkeleton rows={3} label={NOTIFICATION_BELL_COPY.loading} />;
  };

  return (
    <>
      <IconButton
        aria-label={count > 0 ? NOTIFICATION_BELL_COPY.labelWithUnread(count) : NOTIFICATION_BELL_COPY.label}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? NOTIFICATION_BELL_POPOVER_ID : undefined}
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
      >
        <Badge badgeContent={count} color="error" max={99} invisible={count === 0}>
          {count > 0 ? <NotificationsOutlinedIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>
      <Popover
        id={NOTIFICATION_BELL_POPOVER_ID}
        open={open}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { className: cx(styles.popover), "aria-label": NOTIFICATION_BELL_COPY.title } }}
      >
        <div className={cx(styles.popoverHeader)}>
          <Typography variant="subtitle1" component="h2">{NOTIFICATION_BELL_COPY.title}</Typography>
          <Button size="small" disabled={count === 0 || markingAll} onClick={() => void markAll()}>
            {NOTIFICATION_BELL_COPY.markAll}
          </Button>
        </div>
        {renderBody()}
        <div className={cx(styles.popoverFooter)}>
          <Button component={Link} href={NOTIFICATIONS_URL} size="small" onClick={close}>
            {NOTIFICATION_BELL_COPY.viewAll}
          </Button>
        </div>
      </Popover>
    </>
  );
}
