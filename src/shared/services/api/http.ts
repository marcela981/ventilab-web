/*
 * Funcionalidad: Cliente HTTP compartido — instancias fast y slow
 * Descripción: Dos instancias Axios configuradas con interceptores de autenticación y manejo
 *              de errores de red para toda la app VentyLab.
 *              - http      → timeout 8 000 ms  (operaciones normales)
 *              - httpSlow  → timeout 60 000 ms (health/login/warm-up, primer request post-cold-start)
 *              Ambas instancias comparten la lógica de refresco de token y logout.
 *              v3.1: el refresco en 401 delega en refreshAccessToken() (single-flight de
 *              @shared/api-client) cuando hay refresh token del backend; si no, mantiene el
 *              puente NextAuth /api/auth/backend-token. Toda petición reintentada se marca
 *              _retry (sin loops) y todas comparten una sola promesa de refresco. Un 403 ya
 *              no cierra la sesión: se rechaza con el mensaje normalizado del backend.
 * Versión: 3.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import axios, { type AxiosInstance } from 'axios';
import { BACKEND_API_URL } from '@/config/env';
import { getAuthToken } from '@/shared/services/authService';
import { authEvents } from '@/shared/services/authEvents';
import { handleSessionExpired } from '@/shared/services/sessionExpired';
// Direct module imports (not the api-client index) so legacy chunks do not pull in SWR/React hooks.
import { refreshAccessToken } from '@shared/api-client/token-refresh';
import { getRefreshToken } from '@shared/api-client/token-storage';

export { BACKEND_API_URL };

// =============================================================================
// Error de indisponibilidad — sin respuesta HTTP (red/CORS/DNS/timeout)
// =============================================================================

export class ApiUnavailableError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ApiUnavailableError';
  }
}

// =============================================================================
// Instancias Axios
// =============================================================================

export const http = axios.create({
  baseURL: BACKEND_API_URL,
  timeout: 8_000,
  withCredentials: true,
});

/** Para endpoints que pueden tardar hasta 60 s: health, login, evaluación post-cold-start. */
export const httpSlow = axios.create({
  baseURL: BACKEND_API_URL,
  timeout: 60_000,
  withCredentials: true,
});

// =============================================================================
// Estado compartido de refresco de token (una sola operación activa a la vez)
// =============================================================================

let legacyRefresh: Promise<string> | null = null;

/** Puente NextAuth: /api/auth/backend-token responde { token } a secas — sin envelope {success}. */
async function refreshFromNextAuthBridge(): Promise<string> {
  const response = await fetch('/api/auth/backend-token', {
    method: 'GET',
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Token refresh failed');

  const payload = await response.json();
  const newToken: string | undefined = payload?.token;
  if (!newToken) throw new Error('Token refresh response missing token');

  const { setAuthToken } = await import('@/shared/services/authService');
  setAuthToken(newToken);
  return newToken;
}

/**
 * Una sola operación de refresco activa a la vez. Con refresh token del backend se
 * comparte el single-flight de @shared/api-client; sin él, el puente NextAuth.
 */
function refreshLegacyToken(): Promise<string> {
  if (!legacyRefresh) {
    const refresh = getRefreshToken() ? refreshAccessToken() : refreshFromNextAuthBridge();
    legacyRefresh = refresh
      .then(newToken => {
        // Una sola notificación por refresco (SocketContext re-autentica el socket).
        authEvents.emit('auth:token-refreshed');
        return newToken;
      })
      .finally(() => {
        legacyRefresh = null;
      });
  }
  return legacyRefresh;
}

// =============================================================================
// Fábrica de interceptores — aplica la misma lógica a cualquier instancia
// =============================================================================

function attachInterceptors(instance: AxiosInstance): void {
  // ── REQUEST: adjuntar token ─────────────────────────────────────────────
  instance.interceptors.request.use(
    config => {
      const token = getAuthToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    error => Promise.reject(error),
  );

  // ── RESPONSE: tres casos diferenciados ─────────────────────────────────
  // 1. Sin respuesta HTTP   → ApiUnavailableError (red, CORS, DNS, timeout)
  // 2. 401 Unauthorized     → intento de refresco de token
  // 3. 403 Forbidden        → error normalizado (sin logout)
  // 4. Otros 4xx/5xx        → normalizar mensaje del backend
  //
  // NUNCA lanza "No se pudo conectar" para respuestas HTTP recibidas.
  instance.interceptors.response.use(
    res => res,
    async err => {
      if (axios.isCancel(err)) return Promise.reject(err);

      const method = (err.config?.method ?? 'GET').toUpperCase();
      const url    = err.config?.url ?? '(unknown)';

      // ── Caso 1: Sin respuesta HTTP ──────────────────────────────────────
      if (!err.response) {
        const offline = typeof navigator !== 'undefined' && !navigator.onLine;
        const msg = offline
          ? 'Sin conexión a internet.'
          : 'No se pudo conectar con el servidor.';
        console.error(`[http] ${method} ${url} → sin respuesta HTTP (red/CORS/DNS):`, err.message);
        return Promise.reject(new ApiUnavailableError(msg));
      }

      const { status, data: body } = err.response;
      const originalRequest = err.config;

      console.error(`[http] ${method} ${url} → ${status}`, body);

      // ── Caso 2: 401 Unauthorized — intento de refresco de token ────────
      if (status === 401 && !originalRequest._retry) {
        if (originalRequest.url?.includes('/auth/')) return Promise.reject(err);

        // Toda petición reintentada (líder o en espera) se marca: un segundo 401 no refresca otra vez.
        originalRequest._retry = true;

        try {
          const newToken = await refreshLegacyToken();
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        } catch {
          handleSessionExpired('token_refresh_failed');
          return Promise.reject(new Error('Sesión expirada, vuelve a iniciar sesión.'));
        }
      }

      // ── Caso 3: 403 Forbidden — sin logout (los 403 por rol no expiran la sesión);
      //    cae al caso 4 y se rechaza con el mensaje normalizado del backend.

      // ── Caso 4: Otros 4xx/5xx — normalizar mensaje del backend ─────────
      const backendMsg =
        typeof (body as Record<string, unknown>)?.message === 'string'
          ? (body as { message: string }).message
          : null;
      err.message = backendMsg ?? `Error del servidor (${status})`;
      return Promise.reject(err);
    },
  );
}

attachInterceptors(http);
attachInterceptors(httpSlow);

// =============================================================================
// Legacy helper — kept for backward compat with existing `get()` consumers
// =============================================================================
export async function get<T>(url: string, { signal }: { signal?: AbortSignal } = {}) {
  const delays = [0, 300, 1200];
  let lastErr: unknown;
  for (const d of delays) {
    if (d) await new Promise(r => setTimeout(r, d));
    try { return (await http.get<T>(url, signal ? { signal } : {})).data; }
    catch (e) { lastErr = e; }
  }
  throw lastErr;
}

export default http;
