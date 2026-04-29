/*
 * Funcionalidad: Cliente HTTP compartido — punto de entrada único
 * Descripción: Instancia Axios configurada con interceptores de autenticación y
 *              manejo de errores de red para toda la app VentyLab. Distingue tres
 *              tipos de fallo: red/CORS (sin respuesta HTTP), sesión expirada
 *              (401/403), y errores del servidor (4xx/5xx).
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import axios from 'axios';
import { BACKEND_API_URL } from '@/config/env';
import { getAuthToken, removeAuthToken } from '@/shared/services/authService';
import { authEvents } from '@/shared/services/authEvents';

// Re-export for other modules that need the resolved URL
export { BACKEND_API_URL };

export const http = axios.create({
  baseURL: BACKEND_API_URL,
  timeout: 8000,
  withCredentials: true,
});

export class ApiUnavailableError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ApiUnavailableError';
  }
}

// =============================================================================
// REQUEST INTERCEPTOR — Attach token from authService (single source of truth)
// =============================================================================
http.interceptors.request.use(
  config => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// =============================================================================
// RESPONSE INTERCEPTOR — Tres casos bien diferenciados:
//   1. Sin respuesta HTTP   → ApiUnavailableError (red real, CORS, DNS)
//   2. 401/403              → intento de refresco de token / logout
//   3. Otros 4xx/5xx        → mensaje normalizado del backend
// NUNCA muestra "No se pudo conectar" para respuestas HTTP recibidas.
// Los TypeError de render NO llegan aquí (son errores de React, no de axios).
// =============================================================================

/** Flag para evitar bucles infinitos de refresco. */
let isRefreshing = false;
/** Cola de requests pendientes mientras se refresca el token. */
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(undefined);
  });
  failedQueue = [];
}

http.interceptors.response.use(
  res => res,
  async err => {
    if (axios.isCancel(err)) return Promise.reject(err);

    const method = (err.config?.method ?? 'GET').toUpperCase();
    const url    = err.config?.url ?? '(unknown)';

    // ── Caso 1: Sin respuesta HTTP (red real, CORS, DNS, timeout) ─────────
    // Nota: curl no tiene CORS — si curl funciona pero el browser no, es CORS.
    if (!err.response) {
      const offline = typeof navigator !== 'undefined' && navigator && !navigator.onLine;
      const msg = offline ? 'Sin conexión a internet.' : 'No se pudo conectar con el servidor.';
      console.error(`[http] ${method} ${url} → sin respuesta HTTP (red/CORS/DNS):`, err.message);
      return Promise.reject(new ApiUnavailableError(msg));
    }

    const { status, data: body } = err.response;
    const originalRequest = err.config;

    console.error(`[http] ${method} ${url} → ${status}`, body);

    // ── Caso 2: 401 Unauthorized — intento de refresco de token ──────────
    if (status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/')) {
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          originalRequest.headers.Authorization = `Bearer ${getAuthToken()}`;
          return http(originalRequest);
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
          return http(originalRequest);
        }

        throw new Error('Token refresh response missing token');
      } catch (refreshError) {
        processQueue(refreshError);
        removeAuthToken();
        authEvents.emit('auth:logout', { reason: 'token_refresh_failed' });
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        const sessionErr = new Error('Sesión expirada, vuelve a iniciar sesión.');
        return Promise.reject(sessionErr);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Caso 3: 403 Forbidden — acceso denegado, cerrar sesión ───────────
    if (status === 403) {
      removeAuthToken();
      authEvents.emit('auth:logout', { reason: 'forbidden' });
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      const sessionErr = new Error('Sesión expirada, vuelve a iniciar sesión.');
      return Promise.reject(sessionErr);
    }

    // ── Caso 4: Otros 4xx / 5xx — normalizar mensaje del backend ─────────
    const backendMsg = typeof (body as Record<string, unknown>)?.message === 'string'
      ? (body as { message: string }).message
      : null;
    err.message = backendMsg ?? `Error del servidor (${status})`;
    return Promise.reject(err);
  }
);

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
