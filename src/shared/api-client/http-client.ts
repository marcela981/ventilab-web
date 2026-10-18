/*
* Funcionalidad: Typed client HTTP transport
* Descripción: The single axios instance of the new code. Its baseURL is the backend ORIGIN because the OpenAPI paths already include `/api`. Request interceptor: Bearer token from token-storage and the fast/slow timeout (SLOW_ROUTES or the explicit per-call timeout). Response interceptor: centralized 401 handling through the shared single-flight refresh (each request retries at most once via `_retry`, auth endpoints never refresh) and normalization of every failure to ApiError (a 403 is only an ApiError, never a logout). Depends on axios, env, timeouts, token-storage, token-refresh and api-error. v1.1 (B5): every request sends Accept-Language: es (LANGUAGE_HEADERS) so the backend answers its messages in Spanish.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { toApiError } from "./api-error";
import { LANGUAGE_HEADERS } from "./request-language";
import { resolveTimeout } from "./timeouts";
import { refreshAccessToken } from "./token-refresh";
import { getAccessToken } from "./token-storage";

type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
};

export const REFRESH_EXEMPT_ROUTES: readonly RegExp[] = [/^\/api\/auth\/(login|google|refresh|logout)(\?|$)/];

export const httpClient = axios.create({
  baseURL: BACKEND_ORIGIN,
  withCredentials: true,
  headers: { Accept: "application/json", ...LANGUAGE_HEADERS },
});

function isRefreshExempt(url: string | undefined): boolean {
  return REFRESH_EXEMPT_ROUTES.some((pattern) => pattern.test(url ?? ""));
}

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // An explicit per-call timeout wins; otherwise the route registry decides.
  if (!config.timeout) {
    config.timeout = resolveTimeout(config.url);
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async(error: unknown) => {
    if (axios.isCancel(error)) {
      throw error;
    }

    const config = axios.isAxiosError(error) ? (error.config as RetriableConfig | undefined) : undefined;
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;

    if (status !== 401 || !config || config._retry || isRefreshExempt(config.url)) {
      throw toApiError(error);
    }

    config._retry = true;

    const sentToken = config.headers.Authorization;
    const currentToken = getAccessToken();

    // The token was already refreshed by a concurrent request: retry without another refresh.
    if (currentToken && sentToken !== `Bearer ${currentToken}`) {
      return httpClient(config);
    }

    try {
      await refreshAccessToken();
    } catch (refreshError) {
      throw toApiError(refreshError);
    }

    return httpClient(config);
  },
);
