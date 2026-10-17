/*
* Funcionalidad: useNotificationsList
* Descripción: Reads one page of the caller's notifications (`GET /api/notifications` with page, limit and unreadOnly; newest first) through useApiQuery and maps it to a NotificationsPage. The previous page stays on screen while the next one loads (keepPreviousData). A null query sends no request (the bell only reads while its popover is open). Depends on React, @shared/api-client and the notifications mapper, service and entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toNotificationsPage } from "../../api/mappers/notifications.mapper";
import { NOTIFICATIONS_PATH } from "../../api/services/notifications.service";
import type { NotificationsPage, NotificationsQuery } from "../entities/notification.entity";

export type UseNotificationsListResult = {
  page: NotificationsPage | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

const LIST_QUERY_CONFIG = { keepPreviousData: true, revalidateOnFocus: true } as const;

export function useNotificationsList(query: NotificationsQuery | null): UseNotificationsListResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    query ? NOTIFICATIONS_PATH : null,
    query ? { query } : undefined,
    LIST_QUERY_CONFIG,
  );
  const page = useMemo(() => (data ? toNotificationsPage(data.data, data.pagination) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { page, isLoading, error: error ?? null, reload };
}
