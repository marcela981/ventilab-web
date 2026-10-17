/*
* Funcionalidad: useConfiguredProviders
* Descripción: Reads the system status (`GET /api/system/status`, system:status) only while the AI tab is open and keeps the AI providers with credentials (`configured: true`), the only ones a provider chain may add. The settings API does not expose them (BACKEND GAP). Depends on React, @shared/api-client and the platform settings mapper and service.
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
import { toConfiguredProviders } from "../../api/mappers/platform-settings.mapper";
import { SYSTEM_STATUS_PATH } from "../../api/services/platform-settings.service";
import type { ConfiguredProvider } from "../entities/provider-chain.entity";

export type UseConfiguredProvidersResult = {
  providers: ConfiguredProvider[] | null
  error: ApiError | null
};

const QUERY_CONFIG = { revalidateOnFocus: false } as const;

export function useConfiguredProviders(enabled: boolean): UseConfiguredProvidersResult {
  const { data, error } = useApiQuery(enabled ? SYSTEM_STATUS_PATH : null, undefined, QUERY_CONFIG);
  const providers = useMemo(() => (data ? toConfiguredProviders(data.data) : null), [data]);

  return { providers, error: error ?? null };
}
