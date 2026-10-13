/*
* Funcionalidad: Typed SWR query and mutation hooks
* Descripción: `useApiQuery(path, options, config)` reads a typed GET endpoint through SWR with the `[path, { params, query }]` key; a null path disables the query. `useApiMutation(method, path, { invalidates })` runs a typed write and then revalidates every cached query whose key starts with one of the given paths. `invalidateApiQueries(mutate, paths)` exposes the same invalidation. Depends on swr, api-request, swr-config and api-error.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import type { ScopedMutator, SWRConfiguration, SWRResponse } from "swr";
import type { ApiError } from "./api-error";
import { toApiError } from "./api-error";
import { apiRequest } from "./api-request";
import type {
  ApiPath,
  ApiResult,
  HttpMethod,
  PathsWithMethod,
  RequestArgs,
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

type MutationMethod = Exclude<HttpMethod, "get">;

export type UseApiMutationConfig = {
  invalidates?: readonly ApiPath[]
};

export type ApiMutationState<P extends ApiPath, M extends MutationMethod> = {
  trigger: (...args: RequestArgs<P, M>) => Promise<ApiResult<ResponseData<P, M>>>
  isMutating: boolean
  error: ApiError | null
  reset: () => void
};

export function useApiMutation<M extends MutationMethod, P extends PathsWithMethod<M>>(
  method: M,
  path: P,
  config?: UseApiMutationConfig,
): ApiMutationState<P, M> {
  const { mutate } = useSWRConfig();
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  // A joined key keeps `trigger` stable when callers pass a new array literal on every render.
  const invalidatesKey = (config?.invalidates ?? []).join(" ");
  const invalidates = useMemo(
    () => (invalidatesKey ? (invalidatesKey.split(" ") as ApiPath[]) : []),
    [invalidatesKey],
  );

  const trigger = useCallback(
    async(...args: RequestArgs<P, M>): Promise<ApiResult<ResponseData<P, M>>> => {
      setIsMutating(true);
      setError(null);

      try {
        const result = await apiRequest(method, path, ...args);

        await invalidateApiQueries(mutate, invalidates);

        return result;
      } catch (caught) {
        const apiError = toApiError(caught);

        setError(apiError);

        throw apiError;
      } finally {
        setIsMutating(false);
      }
    },
    [method, path, mutate, invalidates],
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { trigger, isMutating, error, reset };
}
