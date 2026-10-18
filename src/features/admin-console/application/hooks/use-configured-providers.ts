/*
* Funcionalidad: useConfiguredProviders
* Descripción: Reads the AI providers catalog for the provider chain editor of /admin/settings (`GET /api/admin/ai/providers`: every known provider, whether its credentials are configured on the server, never the credentials, and the models known to the AI feature). A false `enabled` (another tab) sends no request. Depends on React, @shared/api-client and the admin console mapper, service and entities. v1.1 (closure B2): the catalog endpoint replaces the providers of the system status, so unconfigured providers and the model lists are known.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { toAiProviderCatalog } from "../../api/mappers/platform-settings.mapper";
import { AI_PROVIDERS_PATH } from "../../api/services/platform-settings.service";
import type { ConfiguredProvider } from "../entities/provider-chain.entity";

export type UseConfiguredProvidersResult = {
  providers: ConfiguredProvider[] | null
  error: ApiError | null
};

const QUERY_CONFIG = { revalidateOnFocus: false } as const;

export function useConfiguredProviders(enabled: boolean): UseConfiguredProvidersResult {
  const { data, error } = useApiQuery(enabled ? AI_PROVIDERS_PATH : null, undefined, QUERY_CONFIG);
  const providers = useMemo(() => (data ? toAiProviderCatalog(data.data) : null), [data]);

  return { providers, error: error ?? null };
}
