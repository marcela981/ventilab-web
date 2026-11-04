/*
* Funcionalidad: useApiVersion
* Descripción: SWR hook over fetchApiVersion that reads `GET /api/version` once per page session: a fixed key outside the OpenAPI keys, no revalidation on focus, reconnect or stale; a 4xx (the 404 of an older server) is final, while network and 5xx errors are retried with the app policy (shouldRetryApiError, at most 5 times), so a cold start of the backend clears the banner once it answers. `enabled=false` skips the request (non-admins never ask). Returns the version, the error and the contract check (evaluateApiContract). Depends on swr, the API error and the API contract entity and service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import useSWR from "swr";
import type { SWRConfiguration } from "swr";
import type { ApiError } from "../api-error";
import { shouldRetryApiError } from "../swr-config";
import { evaluateApiContract } from "./api-contract";
import type { ApiContractCheck, ApiVersion } from "./api-contract";
import { fetchApiVersion } from "./api-version.service";

export const API_VERSION_QUERY_KEY = "ventylab:api-version";

const ONCE_PER_SESSION: SWRConfiguration<ApiVersion, ApiError> = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  shouldRetryOnError: shouldRetryApiError,
  errorRetryCount: 5,
  dedupingInterval: Number.POSITIVE_INFINITY,
};

export type UseApiVersionResult = {
  version: ApiVersion | null
  error: ApiError | null
  check: ApiContractCheck
};

export function useApiVersion(enabled = true): UseApiVersionResult {
  const { data, error } = useSWR<ApiVersion, ApiError>(enabled ? API_VERSION_QUERY_KEY : null, fetchApiVersion, ONCE_PER_SESSION);
  const version = data ?? null;
  const failure = error ?? null;

  return { version, error: failure, check: evaluateApiContract({ version, error: failure }) };
}
