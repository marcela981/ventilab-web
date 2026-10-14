/*
* Funcionalidad: useGroupSupervisions
* Descripción: Reads the student groups a teacher group supervises (`GET /api/groups/{id}/supervisions`, ADMIN only) through useApiQuery and maps them to GroupSupervision; the key is the GROUP_SUPERVISIONS_PATH that every group mutation invalidates. Only the admin view of a teacher group mounts it. Depends on @shared/api-client and the groups mappers/service.
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
import { toGroupSupervision } from "../../api/mappers/groups.mapper";
import { GROUP_SUPERVISIONS_PATH } from "../../api/services/groups.service";
import type { GroupSupervision } from "../entities/group.entity";

export type UseGroupSupervisionsResult = {
  supervisions: GroupSupervision[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useGroupSupervisions(teacherGroupId: string): UseGroupSupervisionsResult {
  const { data, error, isLoading, mutate } = useApiQuery(GROUP_SUPERVISIONS_PATH, { params: { id: teacherGroupId } });
  const supervisions = useMemo(() => (data ? data.data.map(toGroupSupervision) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { supervisions, isLoading, error: error ?? null, reload };
}
