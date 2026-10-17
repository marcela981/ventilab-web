/*
* Funcionalidad: usePlatformSettings
* Descripción: Reads every platform setting once (`GET /api/platform-settings`, no category filter) and groups them by category for the tabs of /admin/settings; save (`PATCH /{key} {value, version}`) and reset (`POST /{key}/reset {version}`) revalidate the list afterwards. Focus revalidation is off so an open form is not replaced while the admin edits it. Errors are rethrown as ApiError for the cards (409 version conflict, 422 field errors). Depends on React, SWR, @shared/api-client and the platform settings mapper and service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import { useSWRConfig } from "swr";
import type { ApiError } from "@shared/api-client/api-error";
import { invalidateApiQueries, useApiQuery } from "@shared/api-client/use-api-query";
import { groupSettingsByCategory, toPlatformSetting } from "../../api/mappers/platform-settings.mapper";
import { PLATFORM_SETTINGS_PATH, resetPlatformSetting, updatePlatformSetting } from "../../api/services/platform-settings.service";
import type { SettingCategory } from "../config/admin-console.config";
import type { PlatformSetting } from "../entities/platform-setting.entity";

export type UsePlatformSettingsResult = {
  settings: Record<SettingCategory, PlatformSetting[]> | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
  save: (setting: PlatformSetting, value: unknown) => Promise<void>
  reset: (setting: PlatformSetting) => Promise<void>
};

const QUERY_CONFIG = { revalidateOnFocus: false } as const;
const AFTER_CHANGE_PATHS = [PLATFORM_SETTINGS_PATH] as const;

export function usePlatformSettings(): UsePlatformSettingsResult {
  const { mutate: mutateAll } = useSWRConfig();
  const { data, error, isLoading, mutate } = useApiQuery(PLATFORM_SETTINGS_PATH, undefined, QUERY_CONFIG);
  const settings = useMemo(() => (data ? groupSettingsByCategory(data.data.map(toPlatformSetting)) : null), [data]);

  const reload = useCallback(async() => {
    await mutate();
  }, [mutate]);

  const save = useCallback(async(setting: PlatformSetting, value: unknown) => {
    await updatePlatformSetting(setting.key, value, setting.version);
    await invalidateApiQueries(mutateAll, AFTER_CHANGE_PATHS);
  }, [mutateAll]);

  const reset = useCallback(async(setting: PlatformSetting) => {
    await resetPlatformSetting(setting.key, setting.version);
    await invalidateApiQueries(mutateAll, AFTER_CHANGE_PATHS);
  }, [mutateAll]);

  return { settings, isLoading, error: error ?? null, reload, save, reset };
}
