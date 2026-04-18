/**
 * =============================================================================
 * httpClient — High-level HTTP facade for VentyLab services
 * =============================================================================
 * Wraps the shared Axios instance (api/http.ts) with:
 *   - Typed convenience methods (get, post, put, patch, delete)
 *   - Automatic retry with exponential back-off for network/5xx errors
 *   - Safe defaults: GET/PUT/DELETE retry on, POST/PATCH retry off (non-idempotent)
 *   - ApiError normalisation so callers never deal with raw AxiosError
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
// ApiError — typed wrapper for HTTP errors
// =============================================================================

/**
 * Thrown by httpClient whenever the server responds with a non-2xx status.
 * Maintains a `.response` shape compatible with code that checks
 * `err?.response?.status` so existing service error handlers don't break.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  /** Backward-compat shim: mirrors the AxiosError `.response` shape. */
  readonly response: { status: number; data: unknown };

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.response = { status, data };
  }

  get isForbidden()  { return this.status === 403; }
  get isNotFound()   { return this.status === 404; }
  get isRateLimit()  { return this.status === 429; }
  get isServerError(){ return this.status >= 500; }
}

// =============================================================================
// Internal helpers
// =============================================================================

interface RequestOptions {
  /** Override retry behaviour (defaults differ per method — see each method). */
  retry?: boolean;
  /** Axios signal for request cancellation. */
  signal?: AbortSignal;
  /** Extra Axios config merged into the request. */
  config?: AxiosRequestConfig;
}

/** Delays in ms between retries: instant → 500 ms → 2 000 ms */
const RETRY_DELAYS = [0, 500, 2000];

/**
 * Returns true if the error warrants a retry.
 * Network errors and 5xx server errors are retried.
 * 4xx client errors (including 429 — caller must handle backoff) are not.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof ApiUnavailableError) return true;
  if (error instanceof ApiError) return error.isServerError;
  const axiosErr = error as AxiosError;
  if (!axiosErr?.response) return true; // network error
  return axiosErr.response.status >= 500;
}

/** Converts an AxiosError to a typed ApiError; passes other errors through. */
function toApiError(error: unknown): unknown {
  const axiosErr = error as AxiosError<{ message?: string }>;
  if (axiosErr?.response) {
    return new ApiError(
      axiosErr.response.data?.message ?? axiosErr.message,
      axiosErr.response.status,
      axiosErr.response.data,
    );
  }
  return error;
}

async function withRetry<T>(fn: () => Promise<T>, shouldRetry: boolean): Promise<T> {
  if (!shouldRetry) {
    try {
      return await fn();
    } catch (e) {
      throw toApiError(e);
    }
  }

  let lastErr: unknown;
  for (const delay of RETRY_DELAYS) {
    if (delay) await new Promise(r => setTimeout(r, delay));
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isRetryable(e)) throw toApiError(e);
    }
  }
  throw toApiError(lastErr);
}

// =============================================================================
// Public API
// =============================================================================

export const httpClient = {
  /**
   * GET — retries on network/5xx (default: on).
   */
  async get<T = unknown>(url: string, opts?: RequestOptions): Promise<T> {
    const retry = opts?.retry ?? true;
    return withRetry(
      () => http.get<T>(url, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      retry,
    );
  },

  /**
   * POST — no retry by default (not idempotent; retrying could cause duplicates).
   * Pass `{ retry: true }` explicitly for idempotent POST endpoints.
   */
  async post<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T> {
    const retry = opts?.retry ?? false;
    return withRetry(
      () => http.post<T>(url, data, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      retry,
    );
  },

  /**
   * PUT — retries on network/5xx (PUT is idempotent; default: on).
   */
  async put<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T> {
    const retry = opts?.retry ?? true;
    return withRetry(
      () => http.put<T>(url, data, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      retry,
    );
  },

  /**
   * PATCH — no retry by default (not guaranteed idempotent; default: off).
   */
  async patch<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T> {
    const retry = opts?.retry ?? false;
    return withRetry(
      () => http.patch<T>(url, data, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      retry,
    );
  },

  /**
   * DELETE — retries on network/5xx (DELETE is idempotent; default: on).
   */
  async delete<T = unknown>(url: string, opts?: RequestOptions): Promise<T> {
    const retry = opts?.retry ?? true;
    return withRetry(
      () => http.delete<T>(url, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      retry,
    );
  },
} as const;

export default httpClient;
