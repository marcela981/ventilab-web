/**
 * =============================================================================
 * httpClient — High-level HTTP facade for VentyLab services
 * =============================================================================
 * Wraps the shared Axios instance (api/http.ts) with:
 *   - Typed convenience methods (get, post, put, patch, delete)
 *   - Automatic retry with exponential back-off for network/5xx errors
 *   - No retry for 4xx (validation/auth errors — already handled by interceptor)
 *
 * Usage:
 *   import { httpClient } from '@/shared/services/httpClient';
 *   const users = await httpClient.get<User[]>('/users');
 *   await httpClient.post('/users', { name: 'Ana' });
 *
 * All paths are relative to BACKEND_API_URL (e.g. '/users', '/admin/stats').
 * Token is auto-attached by the Axios request interceptor.
 * =============================================================================
 */

import http, { ApiUnavailableError } from '@/shared/services/api/http';
import type { AxiosRequestConfig, AxiosError } from 'axios';

// =============================================================================
// Types
// =============================================================================

interface RequestOptions {
  /** Disable automatic retry (default: true for GET, false for mutations). */
  retry?: boolean;
  /** Axios signal for request cancellation. */
  signal?: AbortSignal;
  /** Extra Axios config merged into the request. */
  config?: AxiosRequestConfig;
}

// =============================================================================
// Retry logic
// =============================================================================

/** Delays in ms between retries: instant → 500ms → 2000ms */
const RETRY_DELAYS = [0, 500, 2000];

/**
 * Returns true if the error is retryable (network error or 5xx server error).
 * 4xx errors (auth, validation) are NEVER retried.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof ApiUnavailableError) return true;
  const axiosErr = error as AxiosError;
  if (!axiosErr?.response) return true; // network error
  const status = axiosErr.response.status;
  return status >= 500;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: boolean
): Promise<T> {
  if (!shouldRetry) return fn();

  let lastErr: unknown;
  for (const delay of RETRY_DELAYS) {
    if (delay) await new Promise(r => setTimeout(r, delay));
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isRetryable(e)) throw e; // Don't retry 4xx
    }
  }
  throw lastErr;
}

// =============================================================================
// Public API
// =============================================================================

export const httpClient = {
  /**
   * GET request with automatic retry (3 attempts for network/5xx).
   */
  async get<T = unknown>(url: string, opts?: RequestOptions): Promise<T> {
    const retry = opts?.retry ?? true;
    return withRetry(
      () => http.get<T>(url, {
        signal: opts?.signal,
        ...opts?.config,
      }).then(r => r.data),
      retry
    );
  },

  /**
   * POST request with retry for network/5xx errors.
   */
  async post<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T> {
    const retry = opts?.retry ?? true;
    return withRetry(
      () => http.post<T>(url, data, {
        signal: opts?.signal,
        ...opts?.config,
      }).then(r => r.data),
      retry
    );
  },

  /**
   * PUT request with retry for network/5xx errors.
   */
  async put<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T> {
    const retry = opts?.retry ?? true;
    return withRetry(
      () => http.put<T>(url, data, {
        signal: opts?.signal,
        ...opts?.config,
      }).then(r => r.data),
      retry
    );
  },

  /**
   * PATCH request with retry for network/5xx errors.
   */
  async patch<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T> {
    const retry = opts?.retry ?? true;
    return withRetry(
      () => http.patch<T>(url, data, {
        signal: opts?.signal,
        ...opts?.config,
      }).then(r => r.data),
      retry
    );
  },

  /**
   * DELETE request with retry for network/5xx errors.
   */
  async delete<T = unknown>(url: string, opts?: RequestOptions): Promise<T> {
    const retry = opts?.retry ?? true;
    return withRetry(
      () => http.delete<T>(url, {
        signal: opts?.signal,
        ...opts?.config,
      }).then(r => r.data),
      retry
    );
  },
} as const;

export default httpClient;
