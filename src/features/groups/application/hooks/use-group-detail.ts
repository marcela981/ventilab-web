/*
* Funcionalidad: useGroupDetail
* Descripción: Reads one group with its members (`GET /api/groups/{id}`, GroupDetailDTO) through useApiQuery and maps it to the GroupDetail entity; the key is the GROUP_PATH that every group mutation invalidates. Depends on @shared/api-client and the groups mappers/service.
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
import { toGroupDetail } from "../../api/mappers/groups.mapper";
import { GROUP_PATH } from "../../api/services/groups.service";
import type { GroupDetail } from "../entities/group.entity";

export type UseGroupDetailResult = {
  group: GroupDetail | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useGroupDetail(groupId: string): UseGroupDetailResult {
  const { data, error, isLoading, mutate } = useApiQuery(GROUP_PATH, { params: { id: groupId } });
  const group = useMemo(() => (data ? toGroupDetail(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { group, isLoading, error: error ?? null, reload };
}
