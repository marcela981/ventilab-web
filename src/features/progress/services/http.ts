/**
 * Funcionalidad: Wrapper HTTP del feature progress — interfaz { res, data } estilo fetch
 * Descripción: Adapta el cliente axios compartido (http/httpSlow) a la interfaz { res, data }
 *              que espera progressService.ts. A diferencia de axios, NO lanza en 4xx/5xx:
 *              devuelve { res: { ok: false, status }, data } para que el llamador maneje
 *              429 (rate limit), 404, etc. de forma controlada. Solo relanza errores sin
 *              respuesta HTTP (red/timeout → ApiUnavailableError) o de sesión expirada.
 *              La opción `slow` usa httpSlow (timeout 60 s) para escrituras de progreso,
 *              que deben sobrevivir el cold start de Neon (>8 s).
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */
import axiosInstance, { httpSlow } from '@/shared/services/api/http';

interface HttpOptions {
  method?: string;
  body?: string;
  authToken?: string | null;
  /** true → usa la instancia httpSlow (timeout 60 s) para tolerar cold start del backend */
  slow?: boolean;
}

interface HttpResult {
  res: { ok: boolean; status: number; headers: { get(name: string): string | null } };
  data: unknown;
}

function toHeadersShim(headers: Record<string, unknown> | undefined) {
  return {
    get(name: string): string | null {
      const v = headers?.[name?.toLowerCase()];
      return v != null ? String(v) : null;
    },
  };
}

export async function http(
  path: string,
  options: HttpOptions = {}
): Promise<HttpResult> {
  const { method = 'GET', body, authToken, slow = false } = options;
  const config: Record<string, unknown> = {
    method: method.toLowerCase(),
    url: path,
  };
  if (authToken) {
    config.headers = { ...(config.headers as object), Authorization: `Bearer ${authToken}` };
  }
  if (body && (method === 'PUT' || method === 'POST' || method === 'PATCH')) {
    config.data = JSON.parse(body);
  }
  const instance = slow ? httpSlow : axiosInstance;
  try {
    const response = await instance.request(config);
    return {
      res: {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        headers: toHeadersShim(response.headers as Record<string, unknown>),
      },
      data: response.data,
    };
  } catch (error: unknown) {
    // El interceptor de axios rechaza en TODO status no-2xx. Para emular fetch
    // (que solo lanza en errores de red), convertimos las respuestas HTTP
    // recibidas en { res.ok: false } y dejamos que el llamador decida.
    const errWithResponse = error as { response?: { status: number; data: unknown; headers?: Record<string, unknown> } };
    if (errWithResponse?.response) {
      const { status, data, headers } = errWithResponse.response;
      return {
        res: { ok: false, status, headers: toHeadersShim(headers) },
        data,
      };
    }
    // Sin respuesta HTTP: red caída, timeout (ApiUnavailableError) o sesión
    // expirada (el interceptor ya disparó handleSessionExpired). Se relanza.
    throw error;
  }
}
