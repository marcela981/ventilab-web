/**
 * =============================================================================
 * Shared Axios instance — Single HTTP entry point for VentyLab
 * =============================================================================
 * - Base URL resolved from config/env.ts (BACKEND_API_URL)
 * - Request interceptor:  auto-attach Bearer token via authService.getAuthToken()
 * - Response interceptor: global 401 handling (refresh → retry → logout)
 * - Network error wrapping (ApiUnavailableError)
 * =============================================================================
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
// RESPONSE INTERCEPTOR — Global 401 handling + network errors
// =============================================================================

/** Flag to prevent infinite refresh loops. */
let isRefreshing = false;
/** Queue of requests waiting for token refresh. */
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(undefined);
    }
  });
  failedQueue = [];
}

http.interceptors.response.use(
  res => res,
  async err => {
    if (axios.isCancel(err)) return Promise.reject(err);

    // ── Network errors (no response at all) ──────────────────────────────
    if (!err.response) {
      const offline = typeof navigator !== 'undefined' && navigator && !navigator.onLine;
      const msg = offline
        ? 'Sin conexión a internet.'
        : `No se pudo conectar con el backend en ${http.defaults.baseURL}`;
      return Promise.reject(new ApiUnavailableError(msg));
    }

    // ── 401 Unauthorized — attempt token refresh ─────────────────────────
    const originalRequest = err.config;

    if (err.response.status === 401 && !originalRequest._retry) {
      // Don't try to refresh if we're already on the auth/login path
      if (originalRequest.url?.includes('/auth/')) {
        return Promise.reject(err);
      }

      if (isRefreshing) {
        // Another request is already refreshing — queue this one
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          // Token was refreshed, retry with new token
          originalRequest.headers.Authorization = `Bearer ${getAuthToken()}`;
          return http(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the backend token via NextAuth bridge
        const response = await fetch('/api/auth/backend-token', {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const payload = await response.json();

        if (payload?.success && payload?.token) {
          // Dynamically import to avoid circular dependency at module level
          const { setAuthToken } = await import('@/shared/services/authService');
          setAuthToken(payload.token);
          authEvents.emit('auth:token-refreshed');

          // Retry queued requests
          processQueue(null);

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${payload.token}`;
          return http(originalRequest);
        }

        throw new Error('Token refresh response missing token');
      } catch (refreshError) {
        processQueue(refreshError);

        // Token irrecoverable → force logout
        removeAuthToken();
        authEvents.emit('auth:logout', { reason: 'token_refresh_failed' });

        // Redirect to login (only client-side)
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Other HTTP errors (4xx, 5xx) — pass through ─────────────────────
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
