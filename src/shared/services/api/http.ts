// frontend/src/services/api/http.ts

import axios from 'axios';
import { BACKEND_API_URL } from '@/config/env';

// Re-export for other modules that need the resolved URL
export { BACKEND_API_URL };

export const http = axios.create({
  // Use absolute backend API URL resolved from env
  // Example (dev): http://localhost:4000/api
  // Example (prod): https://ventylab-server.example.com/api
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

// Interceptor para agregar token de autenticación
http.interceptors.request.use(
  config => {
    // Agregar token de autenticación si está disponible
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ventilab_auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  error => Promise.reject(error)
);

http.interceptors.response.use(
  res => res,
  err => {
    if (axios.isCancel(err)) return Promise.reject(err);

    // Only treat NETWORK ERRORS as ApiUnavailable (no response received at all)
    // HTTP errors (401, 403, 404, 429, 500) are passed through so callers can
    // handle them properly (e.g. retry on 401, rate-limit on 429).
    if (!err.response) {
      const offline = typeof navigator !== 'undefined' && navigator && !navigator.onLine;
      const msg = offline
        ? 'Sin conexión a internet.'
        : `No se pudo conectar con el backend en ${http.defaults.baseURL}`;
      return Promise.reject(new ApiUnavailableError(msg));
    }

    // Pass through HTTP errors (4xx, 5xx) with original error context
    return Promise.reject(err);
  }
);

export async function get<T>(url: string, { signal }: { signal?: AbortSignal } = {}) {
  // Reintentos exponenciales: 0, 300, 1200 ms (3 intentos máx)
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

