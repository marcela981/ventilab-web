/*
* Funcionalidad: useProfile
* Descripción: Reads the signed-in user's own profile (`GET /api/users/me`) through useApiQuery (SWR cache of the typed api-client) and maps it to the Profile entity. Exposes the loading flag, the load error and `reload`, which revalidates the cached profile (used after a save and by the retry button). Depends on @shared/api-client and the profile mappers/service.
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
import { toProfile } from "../../api/mappers/profile.mapper";
import { MY_PROFILE_PATH } from "../../api/services/profile.service";
import type { Profile } from "../entities/profile.entity";

export type UseProfileResult = {
  profile: Profile | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
};

export function useProfile(): UseProfileResult {
  const { data, error, isLoading, mutate } = useApiQuery(MY_PROFILE_PATH);
  const profile = useMemo(() => (data ? toProfile(data.data) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  return { profile, isLoading, error: error ?? null, reload };
}
