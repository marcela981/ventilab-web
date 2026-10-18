/*
* Funcionalidad: Single-flight access token refresh
* Descripción: `refreshAccessToken()` calls `POST /api/auth/refresh { refreshToken }` on an un-intercepted axios instance and shares ONE in-flight promise between every caller (new client and legacy adapter). On success it stores the new access token and emits `token-refreshed`. When the session cannot be recovered (no refresh token, or a 4xx from refresh other than 408/429) it clears the tokens and emits `session-expired` once. Network/timeout/5xx refresh failures reject without logging out. Depends on axios, env, token-storage, auth-events and api-error. v1.1 (B5): the refresh call sends Accept-Language: es and its client-built messages are Spanish.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import axios from "axios";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { ApiError, CLIENT_ERROR_CODES, CLIENT_ERROR_MESSAGES, toApiError } from "./api-error";
import { LANGUAGE_HEADERS } from "./request-language";
import { emitAuthEvent } from "./auth-events";
import type { components } from "./generated/schema";
import { TIMEOUTS } from "./timeouts";
import { clearTokens, getAccessToken, getRefreshToken, setAccessToken } from "./token-storage";

type RefreshResponse = {
  data?: components["schemas"]["RefreshTokenResponseDTO"] | null
};

export const REFRESH_PATH = "/api/auth/refresh";

// Never intercepted, so a 401 from the refresh call itself cannot start another refresh.
const refreshClient = axios.create({
  baseURL: BACKEND_ORIGIN,
  timeout: TIMEOUTS.slow,
  withCredentials: true,
  headers: { "Content-Type": "application/json", Accept: "application/json", ...LANGUAGE_HEADERS },
});

let inFlightRefresh: Promise<string> | null = null;

export function expireSession(reason: string): void {
  const hadSession = getAccessToken() !== null || getRefreshToken() !== null;

  if (!hadSession) {
    return;
  }

  clearTokens();
  emitAuthEvent({ type: "session-expired", reason });
}

function isTerminalRefreshFailure(error: ApiError): boolean {
  return error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429;
}

async function performRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    expireSession("missing_refresh_token");

    throw new ApiError({
      code: CLIENT_ERROR_CODES.sessionExpired,
      message: CLIENT_ERROR_MESSAGES.sessionExpired,
      status: 401,
    });
  }

  let accessToken: string | undefined;

  try {
    const response = await refreshClient.post<RefreshResponse>(REFRESH_PATH, { refreshToken });

    accessToken = response.data?.data?.accessToken;
  } catch (error) {
    const apiError = toApiError(error);

    if (isTerminalRefreshFailure(apiError)) {
      expireSession(apiError.code);
    }

    throw apiError;
  }

  if (!accessToken) {
    expireSession("refresh_response_invalid");

    throw new ApiError({
      code: CLIENT_ERROR_CODES.sessionExpired,
      message: CLIENT_ERROR_MESSAGES.refreshWithoutToken,
      status: 401,
    });
  }

  setAccessToken(accessToken);
  emitAuthEvent({ type: "token-refreshed" });

  return accessToken;
}

export function refreshAccessToken(): Promise<string> {
  if (!inFlightRefresh) {
    inFlightRefresh = performRefresh().finally(() => {
      inFlightRefresh = null;
    });
  }

  return inFlightRefresh;
}
