/*
* Funcionalidad: api-client public API
* Descripción: Public surface of the typed backend client: request helpers, ApiError, token storage, the auth event bus, the shared single-flight refresh, timeout categories and the SWR standard (provider and hooks). Generated OpenAPI types are re-exported as types. v1.1 (T0 learning): the SSE stream helper (postEventStream, runEventStream, createSseParser) and apiErrorFromResponse. v1.2 (O3 teacher-dashboard): the text file download helpers (apiGetText, saveTextFile) for CSV exports. v1.3 (O4b admin-console): isHeaderTrue and withCsvBom.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { apiGetText, filenameFromContentDisposition, isHeaderTrue, saveTextFile, withCsvBom } from "./api-download";
export type { ApiTextFile } from "./api-download";
export { ApiError, apiErrorFromResponse, CLIENT_ERROR_CODES, isApiError, toApiError } from "./api-error";
export type { ApiErrorInit, HttpErrorResponse } from "./api-error";
export { apiDelete, apiGet, apiPatch, apiPost, apiPut, apiRequest } from "./api-request";
export type {
  ApiPagination,
  ApiPath,
  ApiResult,
  HttpMethod,
  PathsWithMethod,
  RequestBody,
  RequestOptions,
  ResponseData,
} from "./api-types";
export { emitAuthEvent, onAuthEvent } from "./auth-events";
export type { AuthEvent, AuthEventListener } from "./auth-events";
export type { components, operations, paths } from "./generated/schema";
export { httpClient } from "./http-client";
export { API_SWR_CONFIG, ApiSWRProvider } from "./swr-config";
export type { ApiQueryKey } from "./swr-config";
export { createSseParser, postEventStream, runEventStream } from "./sse-stream";
export type {
  EventStreamEvent,
  EventStreamHandlers,
  EventStreamOptions,
  SseFrame,
  SseParser,
  TutorStreamDone,
} from "./sse-stream";
export { SLOW_ROUTES, TIMEOUTS } from "./timeouts";
export type { TimeoutCategory } from "./timeouts";
export { expireSession, refreshAccessToken } from "./token-refresh";
export {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getTokens,
  saveTokens,
  setAccessToken,
  subscribeTokens,
} from "./token-storage";
export type { TokenListener, TokenSnapshot } from "./token-storage";
export { apiQueryKey, invalidateApiQueries, useApiMutation, useApiQuery } from "./use-api-query";
export type { ApiMutationState, UseApiMutationConfig } from "./use-api-query";
