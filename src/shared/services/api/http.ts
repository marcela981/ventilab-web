/*
 * Funcionalidad: Cliente HTTP compartido — instancias fast y slow
 * Descripción: Dos instancias Axios configuradas con interceptores de autenticación y manejo
 *              de errores de red para toda la app VentyLab.
 *              - http      → timeout 8 000 ms  (operaciones normales)
 *              - httpSlow  → timeout 60 000 ms (health/login/warm-up, primer request post-cold-start)
 *              Ambas instancias comparten la lógica de refresco de token y logout.
 * Versión: 3.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import axios, { type AxiosInstance } from 'axios';
import { BACKEND_API_URL } from '@/config/env';
import { getAuthToken, removeAuthToken } from '@/shared/services/authService';
import { authEvents } from '@/shared/services/authEvents';

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

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(undefined);
  });
  failedQueue = [];
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
  // 3. 403 Forbidden        → cerrar sesión
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

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => {
            originalRequest.headers.Authorization = `Bearer ${getAuthToken()}`;
            return instance(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const response = await fetch('/api/auth/backend-token', {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
            credentials: 'include',
          });

          if (!response.ok) throw new Error('Token refresh failed');

          const payload = await response.json();

          if (payload?.success && payload?.token) {
            const { setAuthToken } = await import('@/shared/services/authService');
            setAuthToken(payload.token);
            authEvents.emit('auth:token-refreshed');
            processQueue(null);
            originalRequest.headers.Authorization = `Bearer ${payload.token}`;
            return instance(originalRequest);
          }

          throw new Error('Token refresh response missing token');
        } catch (refreshError) {
          processQueue(refreshError);
          removeAuthToken();
          authEvents.emit('auth:logout', { reason: 'token_refresh_failed' });
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(new Error('Sesión expirada, vuelve a iniciar sesión.'));
        } finally {
          isRefreshing = false;
        }
      }

      // ── Caso 3: 403 Forbidden ───────────────────────────────────────────
      if (status === 403) {
        removeAuthToken();
        authEvents.emit('auth:logout', { reason: 'forbidden' });
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('Sesión expirada, vuelve a iniciar sesión.'));
      }

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
