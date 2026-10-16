/*
* Funcionalidad: useLabSettings
* Descripción: Effective lab settings for the current user. When the session holds settings:manage (ADMIN) it reads GET /api/platform-settings and exposes `source: "server"`; otherwise, while that read is pending, or when it fails, it exposes the vendored backend defaults with `source: "defaults"` (backend gap: the settings have no non-admin read). The backend stays the authority: its 4xx responses are shown by the features that submit. Depends on the session, the api-client query hook, the lab status service and the lab settings entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { useSession } from "@shared/session/use-session";
import { PLATFORM_SETTINGS_PATH, SETTINGS_READ_PERMISSION } from "../../api/services/lab-status.service";
import { resolveLabSettings } from "../entities/lab-settings.entity";
import type { ResolvedLabSettings } from "../entities/lab-settings.entity";

export type UseLabSettingsResult = ResolvedLabSettings & {
  /** The server read is in flight (only for callers allowed to read it); the defaults apply meanwhile. */
  isLoading: boolean
  error: ApiError | null
};

export function useLabSettings(): UseLabSettingsResult {
  const { hasPermission } = useSession();
  const canRead = hasPermission(SETTINGS_READ_PERMISSION);
  const { data, error, isLoading } = useApiQuery(canRead ? PLATFORM_SETTINGS_PATH : null);
  const resolved = useMemo(() => resolveLabSettings(data ? data.data : null), [data]);

  return { ...resolved, isLoading: canRead && !data && isLoading, error: error ?? null };
}
