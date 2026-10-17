/*
* Funcionalidad: useGroupDashboard
* Descripción: Reads the analytics dashboard of one group (`GET /api/analytics/groups/{groupId}/dashboard`, one row per student; cached 60 s by the backend) through useApiQuery and maps it to a GroupDashboard. A null group sends no request. A 403 (group outside the caller's scope) comes back as the error. v1.1 (O3 review): keepPreviousData is off, so another group never shows this group's rows. Depends on React, @shared/api-client and the teacher dashboard mapper and service.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toGroupDashboard } from "../../api/mappers/teacher-dashboard.mapper";
import { GROUP_DASHBOARD_PATH } from "../../api/services/teacher-dashboard.service";
import type { GroupDashboard } from "../entities/teacher-dashboard.entity";

/** Never show the previous group's data while another group loads (the app default keeps it). */
const NO_PREVIOUS_DATA = { keepPreviousData: false } as const;

export type UseGroupDashboardResult = {
  dashboard: GroupDashboard | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useGroupDashboard(groupId: string | null): UseGroupDashboardResult {
  const { data, error, isLoading, mutate } = useApiQuery(
    groupId ? GROUP_DASHBOARD_PATH : null,
    { params: { groupId: groupId ?? "" } },
    NO_PREVIOUS_DATA,
  );
  const dashboard = useMemo(() => (data ? toGroupDashboard(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { dashboard, isLoading, error: error ?? null, reload };
}
