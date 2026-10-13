/*
* Funcionalidad: Typed request helper types
* Descripción: Type-level helpers over the generated OpenAPI `paths`: paths per HTTP method, path/query params, request body, the success response body and its unwrapped `data`, plus the ApiResult shape `{ data, pagination, message, traceId }` returned by every helper. Types only; depends on generated/schema.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components, paths } from "./generated/schema";
import type { TimeoutCategory } from "./timeouts";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export type ApiPath = keyof paths;

export type ApiPagination = components["schemas"]["APIPagination"];

export type PathsWithMethod<M extends HttpMethod> = {
  [P in ApiPath]: paths[P][M] extends undefined ? never : P
}[ApiPath];

export type Operation<P extends ApiPath, M extends HttpMethod> = NonNullable<paths[P][M]>;

type ParameterSlot<P extends ApiPath, M extends HttpMethod, S extends "path" | "query"> =
  Operation<P, M> extends { parameters: infer Parameters }
    ? Parameters extends Partial<Record<S, infer Value>>
      ? Value
      : never
    : never;

export type PathParams<P extends ApiPath, M extends HttpMethod> = ParameterSlot<P, M, "path">;

export type QueryParams<P extends ApiPath, M extends HttpMethod> = ParameterSlot<P, M, "query">;

export type RequestBody<P extends ApiPath, M extends HttpMethod> =
  Operation<P, M> extends { requestBody?: { content: { "application/json": infer Body } } } ? Body : never;

type SuccessStatus = 200 | 201 | 202 | 204;

export type ResponseBody<P extends ApiPath, M extends HttpMethod> =
  Operation<P, M> extends { responses: infer Responses }
    ? Responses[Extract<keyof Responses, SuccessStatus>] extends infer Success
      ? Success extends { content: { "application/json": infer Body } }
        ? Body
        : undefined
      : undefined
    : undefined;

// Enveloped responses unwrap to their `data`; raw responses (e.g. /health) are returned as is.
export type ResponseData<P extends ApiPath, M extends HttpMethod> =
  ResponseBody<P, M> extends { success: boolean, data: infer Data } ? Data : ResponseBody<P, M>;

type IsEmpty<T> = [T] extends [never] ? true : [T] extends [undefined] ? true : false;

type ParamsOption<P extends ApiPath, M extends HttpMethod> =
  IsEmpty<PathParams<P, M>> extends true ? { params?: never } : { params: PathParams<P, M> };

type QueryOption<P extends ApiPath, M extends HttpMethod> =
  IsEmpty<QueryParams<P, M>> extends true ? { query?: never } : { query?: QueryParams<P, M> };

type BodyOption<P extends ApiPath, M extends HttpMethod> =
  IsEmpty<RequestBody<P, M>> extends true ? { body?: never } : { body?: RequestBody<P, M> };

export type CallOptions = {
  timeout?: TimeoutCategory | undefined
  signal?: AbortSignal | undefined
  headers?: Record<string, string> | undefined
};

export type RequestOptions<P extends ApiPath, M extends HttpMethod> =
  ParamsOption<P, M> & QueryOption<P, M> & BodyOption<P, M> & CallOptions;

export type RequestArgs<P extends ApiPath, M extends HttpMethod> =
  IsEmpty<PathParams<P, M>> extends true
    ? [options?: RequestOptions<P, M>]
    : [options: RequestOptions<P, M>];

export type ApiResult<T> = {
  data: T
  pagination: ApiPagination | null
  message: string | null
  traceId: string | null
};
