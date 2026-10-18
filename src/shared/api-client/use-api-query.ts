/*
* Funcionalidad: Typed SWR query and mutation hooks
* Descripción: `useApiQuery(path, options, config)` reads a typed GET endpoint through SWR with the `[path, { params, query }]` key; a null path disables the query. `invalidateApiQueries(mutate, paths)` revalidates every cached query whose key starts with one of the given paths. v1.1 (B3.10): the unused `useApiMutation` hook (and its config/state types) is removed; writes call `apiRequest` and then `invalidateApiQueries`. Depends on swr, api-request, swr-config and api-error.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import useSWR from "swr";
import type { ScopedMutator, SWRConfiguration, SWRResponse } from "swr";
import type { ApiError } from "./api-error";
import type {
  ApiPath,
  ApiResult,
  PathsWithMethod,
  RequestOptions,
  ResponseData,
} from "./api-types";
import { apiFetcher, isApiQueryKey } from "./swr-config";
import type { ApiQueryKey } from "./swr-config";

type GetPath = PathsWithMethod<"get">;

type QueryKeyOptions<P extends GetPath> = Pick<RequestOptions<P, "get">, "params" | "query">;

export function apiQueryKey<P extends GetPath>(path: P, options?: QueryKeyOptions<P>): ApiQueryKey<P> {
  return [path, { params: options?.params, query: options?.query }];
}

export function useApiQuery<P extends GetPath>(
  path: P | null,
  options?: QueryKeyOptions<P>,
  config?: SWRConfiguration<ApiResult<ResponseData<P, "get">>, ApiError>,
): SWRResponse<ApiResult<ResponseData<P, "get">>, ApiError> {
  const key = path ? apiQueryKey(path, options) : null;

  return useSWR<ApiResult<ResponseData<P, "get">>, ApiError, ApiQueryKey<P> | null>(
    key,
    (queryKey: ApiQueryKey<P>) => apiFetcher(queryKey) as Promise<ApiResult<ResponseData<P, "get">>>,
    config,
  );
}

export function invalidateApiQueries(mutate: ScopedMutator, paths: readonly ApiPath[]): Promise<unknown[]> {
  return Promise.all(
    paths.map((path) => mutate((key: unknown) => isApiQueryKey(key) && key[0] === path)),
  );
}
