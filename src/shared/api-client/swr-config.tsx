/*
* Funcionalidad: SWR standard configuration
* Descripción: Cache-first / stale-while-revalidate defaults (C4) for the typed client: a fetcher bound to apiRequest for `[path, { params, query }]` keys, request deduplication, no focus revalidation, keepPreviousData and no retry for 4xx ApiErrors. ApiSWRProvider uses the DEFAULT SWR cache, so the legacy global `mutate` keeps working. Depends on swr and api-error; api-request is loaded lazily by the fetcher. `pages/_app.js` imports this module directly (not the index) to keep axios out of the app shell.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import type { SWRConfiguration } from "swr";
import { isApiError } from "./api-error";
import type { ApiPath, ApiResult, PathsWithMethod, RequestOptions } from "./api-types";

export type ApiQueryKey<P extends ApiPath = ApiPath> = readonly [path: P, options: Record<string, unknown>];

export function isApiQueryKey(key: unknown): key is ApiQueryKey {
  return Array.isArray(key) && typeof key[0] === "string" && key[0].startsWith("/");
}

// Loaded on demand so the app shell (which mounts the provider) does not ship axios and the
// request layer; hooks that query already import api-request, so the import resolves at once.
export async function apiFetcher(key: ApiQueryKey): Promise<ApiResult<unknown>> {
  const [path, options] = key;
  const { apiRequest } = await import("./api-request");

  return apiRequest("get", path as PathsWithMethod<"get">, options as RequestOptions<PathsWithMethod<"get">, "get">);
}

export function shouldRetryApiError(error: unknown): boolean {
  return !(isApiError(error) && error.status >= 400 && error.status < 500);
}

export const API_SWR_CONFIG: SWRConfiguration = {
  fetcher: apiFetcher,
  dedupingInterval: 5_000,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  keepPreviousData: true,
  shouldRetryOnError: shouldRetryApiError,
};

export type ApiSWRProviderProps = {
  children: ReactNode
};

export function ApiSWRProvider({ children }: ApiSWRProviderProps) {
  return <SWRConfig value={API_SWR_CONFIG}>{children}</SWRConfig>;
}
