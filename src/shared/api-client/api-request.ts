/*
* Funcionalidad: Typed request helpers
* Descripción: `apiRequest(method, path, options)` and the `apiGet/apiPost/apiPut/apiPatch/apiDelete` shortcuts over the generated OpenAPI paths. Substitutes `{param}` path segments, sends query/body, applies the per-call timeout category and returns the unwrapped envelope `{ data, pagination, message, traceId }`. Every failure rejects with ApiError (cancellations pass through). Depends on http-client, timeouts and api-error. v1.1: header re-encoded as UTF-8 (the accented header words were double-encoded).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import { ApiError, CLIENT_ERROR_CODES, normalizeMessage, toApiError } from "./api-error";
import type {
  ApiPagination,
  ApiResult,
  CallOptions,
  HttpMethod,
  PathsWithMethod,
  RequestArgs,
  ResponseData,
} from "./api-types";
import { httpClient } from "./http-client";
import { TIMEOUTS } from "./timeouts";

type LooseOptions = CallOptions & {
  params?: Record<string, unknown>
  query?: Record<string, unknown>
  body?: unknown
};

type Envelope = {
  success: boolean
  data?: unknown
  message?: unknown
  pagination?: ApiPagination | null
  traceId?: string | null
};

export function buildPath(path: string, params: Record<string, unknown> = {}): string {
  return path.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = params[name];

    if (value === undefined || value === null || value === "") {
      throw new ApiError({
        code: CLIENT_ERROR_CODES.unknown,
        message: `Missing path parameter "${name}" for ${path}`,
        status: 0,
      });
    }

    return encodeURIComponent(String(value));
  });
}

function isEnvelope(body: unknown): body is Envelope {
  return typeof body === "object" && body !== null && typeof (body as Envelope).success === "boolean";
}

export function unwrapResponse<T>(body: unknown): ApiResult<T> {
  if (!isEnvelope(body)) {
    return { data: body as T, pagination: null, message: null, traceId: null };
  }

  return {
    data: (body.data ?? null) as T,
    pagination: body.pagination ?? null,
    message: normalizeMessage(body.message),
    traceId: body.traceId ?? null,
  };
}

export async function apiRequest<M extends HttpMethod, P extends PathsWithMethod<M>>(
  method: M,
  path: P,
  ...args: RequestArgs<P, M>
): Promise<ApiResult<ResponseData<P, M>>> {
  const options = (args[0] ?? {}) as LooseOptions;

  try {
    const config: AxiosRequestConfig = { method, url: buildPath(path, options.params) };

    if (options.query) {
      config.params = options.query;
    }

    if (options.body !== undefined) {
      config.data = options.body;
    }

    if (options.signal) {
      config.signal = options.signal;
    }

    if (options.headers) {
      config.headers = options.headers;
    }

    if (options.timeout) {
      config.timeout = TIMEOUTS[options.timeout];
    }

    const response = await httpClient.request(config);

    return unwrapResponse<ResponseData<P, M>>(response.data);
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error;
    }

    throw toApiError(error);
  }
}

export function apiGet<P extends PathsWithMethod<"get">>(
  path: P,
  ...args: RequestArgs<P, "get">
): Promise<ApiResult<ResponseData<P, "get">>> {
  return apiRequest("get", path, ...args);
}

export function apiPost<P extends PathsWithMethod<"post">>(
  path: P,
  ...args: RequestArgs<P, "post">
): Promise<ApiResult<ResponseData<P, "post">>> {
  return apiRequest("post", path, ...args);
}

export function apiPut<P extends PathsWithMethod<"put">>(
  path: P,
  ...args: RequestArgs<P, "put">
): Promise<ApiResult<ResponseData<P, "put">>> {
  return apiRequest("put", path, ...args);
}

export function apiPatch<P extends PathsWithMethod<"patch">>(
  path: P,
  ...args: RequestArgs<P, "patch">
): Promise<ApiResult<ResponseData<P, "patch">>> {
  return apiRequest("patch", path, ...args);
}

export function apiDelete<P extends PathsWithMethod<"delete">>(
  path: P,
  ...args: RequestArgs<P, "delete">
): Promise<ApiResult<ResponseData<P, "delete">>> {
  return apiRequest("delete", path, ...args);
}
