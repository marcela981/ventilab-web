/*
* Funcionalidad: NotificationsPage
* Descripción: Page /notifications (any authenticated role): the caller's notifications, newest first, paginated with the envelope pagination (10/25/50 rows), "Solo no leídas" toggle (unreadOnly), "Marcar todas como leídas", and per notification: open its deep link (marks it as read first; a failure does not block), "Marcar como leída" while unread and "Eliminar" behind a confirmation. A page emptied by a deletion or by marking with the unread filter moves back to the last available page. Skeleton, retryable error (or a stale-data warning when a refresh fails over shown data), empty states for all and for unread only; action errors are toasts. Depends on MUI, next/head, next/router, the design-system states, dialog and toast, the notifications hooks, config, entities, components and styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import TablePagination from "@mui/material/TablePagination";
import Tooltip from "@mui/material/Tooltip";
import Head from "next/head";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { NotificationSummary } from "../components/notification-summary";
import { resolveNotificationLink } from "../config/notification-links";
import { NOTIFICATIONS_PAGE_SIZES, toNotificationsQuery } from "../entities/notification.entity";
import type { AppNotification } from "../entities/notification.entity";
import { getNotificationsErrorMessage } from "../entities/notifications-error-messages";
import { useNotificationActions } from "../hooks/use-notification-actions";
import { useNotificationsList } from "../hooks/use-notifications-list";
import { useUnreadNotificationsCount } from "../hooks/use-unread-notifications-count";
import styles from "../../UI/notifications.module.css";

// TODO(i18n): move to a notifications namespace in src/i18n.
export const NOTIFICATIONS_PAGE_COPY = {
  documentTitle: "Notificaciones | VentyLab",
  title: "Notificaciones",
  subtitle: "Avisos de tus evaluaciones, reservas del ventilador y tu cuenta.",
  unreadOnly: "Solo no leídas",
  markAll: "Marcar todas como leídas",
  markAllDone: "Todas las notificaciones quedaron marcadas como leídas.",
  markRead: "Marcar como leída",
  remove: "Eliminar",
  open: (title: string) => `Abrir: ${title}`,
  loading: "Cargando notificaciones…",
  loadErrorTitle: "No se pudieron cargar las notificaciones",
  staleWarning: "No se pudieron actualizar las notificaciones. Los datos mostrados pueden estar desactualizados.",
  retry: "Reintentar",
  emptyTitle: "No tienes notificaciones",
  emptyDescription: "Aquí aparecerán los avisos de tus evaluaciones, calificaciones y reservas del ventilador.",
  emptyUnreadTitle: "No tienes notificaciones sin leer",
  emptyUnreadDescription: "Desactiva \"Solo no leídas\" para ver todas.",
  deleteTitle: "Eliminar notificación",
  deleteDescription: (title: string) => `Se eliminará la notificación "${title}". Esta acción no se puede deshacer.`,
  deleteConfirm: "Eliminar",
  deleted: "Notificación eliminada.",
  rowsPerPage: "Filas por página:",
} as const;

const PAGE_BUTTON_LABELS: Record<"first" | "last" | "next" | "previous", string> = {
  first: "Primera página",
  last: "Última página",
  next: "Página siguiente",
  previous: "Página anterior",
};

export type NotificationsPageProps = {
  // Reference instant of the relative times; tests pin it.
  now?: Date | undefined
};

export function NotificationsPage({ now }: NotificationsPageProps = {}) {
  const router = useRouter();
  const toast = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(NOTIFICATIONS_PAGE_SIZES[0] ?? 10);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AppNotification | null>(null);
  const [deleting, setDeleting] = useState(false);
  const query = useMemo(() => toNotificationsQuery(pageIndex, pageSize, unreadOnly), [pageIndex, pageSize, unreadOnly]);
  const { page, isLoading, error, reload } = useNotificationsList(query);
  const unreadCount = useUnreadNotificationsCount(true);
  const actions = useNotificationActions();
  // The server answered the requested page with no rows: it is beyond the last page (rows were removed meanwhile).
  const outOfRange = page !== null && page.page === pageIndex + 1 && pageIndex > 0 && page.items.length === 0;

  if (outOfRange) {
    // Adjusting state while rendering (React's documented pattern): the next query asks for the last available page.
    setPageIndex(Math.max(0, Math.min(pageIndex - 1, page.pages - 1)));
  }

  const openNotification = async(notification: AppNotification, link: string) => {
    if (!notification.read) {
      await actions.markRead(notification.id).catch(() => undefined);
    }

    await router.push(link).catch(() => undefined);
  };

  const markRead = async(notification: AppNotification) => {
    setBusyId(notification.id);

    try {
      await actions.markRead(notification.id);
    } catch (markError) {
      toast.error(getNotificationsErrorMessage(markError));
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async() => {
    setMarkingAll(true);

    try {
      await actions.markAllRead();
      toast.success(NOTIFICATIONS_PAGE_COPY.markAllDone);
    } catch (markError) {
      toast.error(getNotificationsErrorMessage(markError));
    } finally {
      setMarkingAll(false);
    }
  };

  const confirmDelete = async() => {
    if (!pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await actions.remove(pendingDelete.id);
      toast.success(NOTIFICATIONS_PAGE_COPY.deleted);
    } catch (deleteError) {
      toast.error(getNotificationsErrorMessage(deleteError));
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const renderItem = (notification: AppNotification) => {
    const link = resolveNotificationLink(notification);
    const busy = busyId === notification.id;

    return (
      <li key={notification.id} className={cx(styles.item)} data-read={notification.read ? "true" : "false"}>
        {link ? (
          <button
            type="button"
            className={cx(styles.itemMain, styles.itemLink)}
            aria-label={NOTIFICATIONS_PAGE_COPY.open(notification.title)}
            onClick={() => void openNotification(notification, link)}
          >
            <NotificationSummary notification={notification} now={now} />
          </button>
        ) : (
          <div className={cx(styles.itemMain)}>
            <NotificationSummary notification={notification} now={now} />
          </div>
        )}
        <div className={cx(styles.itemActions)}>
          {notification.read ? null : (
            <Tooltip title={NOTIFICATIONS_PAGE_COPY.markRead}>
              <span>
                <IconButton aria-label={NOTIFICATIONS_PAGE_COPY.markRead} disabled={busy} onClick={() => void markRead(notification)}>
                  <MarkEmailReadOutlinedIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title={NOTIFICATIONS_PAGE_COPY.remove}>
            <span>
              <IconButton aria-label={NOTIFICATIONS_PAGE_COPY.remove} disabled={busy} onClick={() => setPendingDelete(notification)}>
                <DeleteOutlineIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </li>
    );
  };

  const renderList = () => {
    if (!page || outOfRange) {
      return null;
    }

    if (page.items.length === 0) {
      return unreadOnly ? (
        <EmptyState
          icon={<NotificationsNoneIcon />}
          title={NOTIFICATIONS_PAGE_COPY.emptyUnreadTitle}
          description={NOTIFICATIONS_PAGE_COPY.emptyUnreadDescription}
        />
      ) : (
        <EmptyState
          icon={<NotificationsNoneIcon />}
          title={NOTIFICATIONS_PAGE_COPY.emptyTitle}
          description={NOTIFICATIONS_PAGE_COPY.emptyDescription}
        />
      );
    }

    return (
      <div className={cx(styles.results)}>
        <ul className={cx(styles.list)}>{page.items.map(renderItem)}</ul>
        <TablePagination
          component="div"
          count={page.total}
          page={Math.min(pageIndex, Math.max(0, page.pages - 1))}
          rowsPerPage={pageSize}
          rowsPerPageOptions={NOTIFICATIONS_PAGE_SIZES}
          onPageChange={(_event, next) => setPageIndex(next)}
          onRowsPerPageChange={(event) => {
            setPageSize(Number(event.target.value));
            setPageIndex(0);
          }}
          labelRowsPerPage={NOTIFICATIONS_PAGE_COPY.rowsPerPage}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          getItemAriaLabel={(type) => PAGE_BUTTON_LABELS[type]}
        />
      </div>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{NOTIFICATIONS_PAGE_COPY.documentTitle}</title>
      </Head>
      <PageHeader
        title={NOTIFICATIONS_PAGE_COPY.title}
        subtitle={NOTIFICATIONS_PAGE_COPY.subtitle}
        actions={(
          <Button
            variant="outlined"
            startIcon={<DoneAllIcon />}
            disabled={markingAll || unreadCount === 0}
            onClick={() => void markAll()}
          >
            {NOTIFICATIONS_PAGE_COPY.markAll}
          </Button>
        )}
      />
      <div className={cx(styles.content)}>
        <div className={cx(styles.toolbar)}>
          <FormControlLabel
            control={(
              <Switch
                checked={unreadOnly}
                onChange={(event) => {
                  setUnreadOnly(event.target.checked);
                  setPageIndex(0);
                }}
              />
            )}
            label={NOTIFICATIONS_PAGE_COPY.unreadOnly}
          />
        </div>
        {page && error ? (
          <Alert
            severity="warning"
            action={<Button color="inherit" size="small" onClick={() => void reload()}>{NOTIFICATIONS_PAGE_COPY.retry}</Button>}
          >
            {NOTIFICATIONS_PAGE_COPY.staleWarning} {getNotificationsErrorMessage(error)}
          </Alert>
        ) : null}
        {renderList()}
        {!page && isLoading ? <ListSkeleton rows={4} label={NOTIFICATIONS_PAGE_COPY.loading} /> : null}
        {!page && !isLoading && error ? (
          <ErrorState
            title={NOTIFICATIONS_PAGE_COPY.loadErrorTitle}
            description={getNotificationsErrorMessage(error)}
            onRetry={() => void reload()}
          />
        ) : null}
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={NOTIFICATIONS_PAGE_COPY.deleteTitle}
        description={pendingDelete ? NOTIFICATIONS_PAGE_COPY.deleteDescription(pendingDelete.title) : undefined}
        confirmLabel={NOTIFICATIONS_PAGE_COPY.deleteConfirm}
        destructive
        isPending={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
