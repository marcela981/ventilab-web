/*
 * Funcionalidad: Cliente HTTP de alto nivel — facade con retry de cold start
 * Descripción: Wraps las instancias Axios (http / httpSlow) con:
 *              - Métodos tipados (get, post, put, patch, delete)
 *              - Retry con backoff de cold start: solo ante ApiUnavailableError (sin respuesta HTTP)
 *                Delays 5 000 ms y 10 000 ms (2 reintentos). NO reintenta en 4xx ni 5xx.
 *              - Eventos DOM en primer reintento ("ventilab:server:warming") y al resolver
 *                ("ventilab:server:warm") para que WarmupContext actualice el UI.
 *              - ApiError normalizado para callers que revisan err?.response?.status.
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import http, { httpSlow, ApiUnavailableError } from '@/shared/services/api/http';
import type { AxiosRequestConfig, AxiosError } from 'axios';

// =============================================================================
// ApiError — typed wrapper for HTTP errors
// =============================================================================

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly response: { status: number; data: unknown };

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.response = { status, data };
  }

  get isForbidden()   { return this.status === 403; }
  get isNotFound()    { return this.status === 404; }
  get isRateLimit()   { return this.status === 429; }
  get isServerError() { return this.status >= 500; }
}

// =============================================================================
// Tipos internos
// =============================================================================

interface RequestOptions {
  retry?: boolean;
  signal?: AbortSignal;
  config?: AxiosRequestConfig;
}

// =============================================================================
// Helpers de retry cold-start
// =============================================================================

/** Delays entre reintentos de cold start: 5 s luego 10 s (máx 2 reintentos). */
const COLD_START_DELAYS = [5_000, 10_000] as const;

function isColdStart(error: unknown): boolean {
  return error instanceof ApiUnavailableError;
}

function dispatchServerEvent(name: 'ventilab:server:warming' | 'ventilab:server:warm'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name));
  }
}

/** Convierte AxiosError con respuesta a ApiError; deja pasar el resto sin cambios. */
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

/**
 * Ejecuta fn() y, si falla con ApiUnavailableError y shouldRetry=true,
 * reintenta 2 veces con backoff de cold start (5 s, 10 s).
 * Emite eventos DOM para que WarmupContext actualice el UI:
 *   - "ventilab:server:warming"  → al detectar el primer cold start
 *   - "ventilab:server:warm"     → al resolver (éxito o error no-cold-start)
 * NO reintenta en 4xx ni 5xx (esos son errores reales del backend).
 */
async function withRetry<T>(fn: () => Promise<T>, shouldRetry: boolean): Promise<T> {
  try {
    return await fn();
  } catch (firstErr) {
    if (!shouldRetry || !isColdStart(firstErr)) throw toApiError(firstErr);
  }

  // Cold start detectado — notificar UI e iniciar backoff
  dispatchServerEvent('ventilab:server:warming');

  let lastErr: unknown = new ApiUnavailableError('Cold start: reintentos agotados');

  for (const delay of COLD_START_DELAYS) {
    await new Promise<void>(r => setTimeout(r, delay));
    try {
      const result = await fn();
      dispatchServerEvent('ventilab:server:warm');
      return result;
    } catch (e) {
      lastErr = e;
      if (!isColdStart(e)) {
        dispatchServerEvent('ventilab:server:warm');
        throw toApiError(e);
      }
    }
  }

  // Reintentos agotados — resetear UI y propagar el error
  dispatchServerEvent('ventilab:server:warm');
  throw toApiError(lastErr);
}

// =============================================================================
// httpClient — métodos fast (timeout 8 s)
// =============================================================================

export const httpClient = {
  async get<T = unknown>(url: string, opts?: RequestOptions): Promise<T> {
    return withRetry(
      () => http.get<T>(url, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      opts?.retry ?? true,
    );
  },

  /** POST no reintenta por defecto (no idempotente). */
  async post<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T> {
    return withRetry(
      () => http.post<T>(url, data, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      opts?.retry ?? false,
    );
  },

  async put<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T> {
    return withRetry(
      () => http.put<T>(url, data, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      opts?.retry ?? true,
    );
  },

  async patch<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T> {
    return withRetry(
      () => http.patch<T>(url, data, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      opts?.retry ?? false,
    );
  },

  async delete<T = unknown>(url: string, opts?: RequestOptions): Promise<T> {
    return withRetry(
      () => http.delete<T>(url, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      opts?.retry ?? true,
    );
  },
} as const;

// =============================================================================
// slowHttpClient — métodos slow (timeout 60 s)
// Para: health, evaluación post-login, primer request post-inactividad
// =============================================================================

export const slowHttpClient = {
  async get<T = unknown>(url: string, opts?: RequestOptions): Promise<T> {
    return withRetry(
      () => httpSlow.get<T>(url, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      opts?.retry ?? true,
    );
  },

  async post<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T> {
    return withRetry(
      () => httpSlow.post<T>(url, data, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      opts?.retry ?? false,
    );
  },

  async put<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T> {
    return withRetry(
      () => httpSlow.put<T>(url, data, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      opts?.retry ?? true,
    );
  },

  async patch<T = unknown>(url: string, data?: unknown, opts?: RequestOptions): Promise<T> {
    return withRetry(
      () => httpSlow.patch<T>(url, data, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      opts?.retry ?? false,
    );
  },

  async delete<T = unknown>(url: string, opts?: RequestOptions): Promise<T> {
    return withRetry(
      () => httpSlow.delete<T>(url, { signal: opts?.signal, ...opts?.config }).then(r => r.data),
      opts?.retry ?? true,
    );
  },
} as const;

export default httpClient;
