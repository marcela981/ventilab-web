// frontend/src/services/api/http.ts

import axios from 'axios';
import { BACKEND_API_URL } from '@/config/env';

export const http = axios.create({
  // Use absolute backend API URL resolved from env
  // Example (dev): http://localhost:3001/api
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
    // No spamear la consola si ya se manejó arriba
    if (axios.isCancel(err)) return Promise.reject(err);
    const offline = typeof navigator !== 'undefined' && navigator && !navigator.onLine;
    const msg = offline
      ? 'Sin conexión a internet.'
      : `No se pudo conectar con el backend en ${http.defaults.baseURL}`;
    return Promise.reject(new ApiUnavailableError(msg));
  }
);

export async function get<T>(url: string, { signal }: { signal?: AbortSignal } = {}) {
  // Reintentos exponenciales: 0, 300, 1200 ms (3 intentos máx)
  const delays = [0, 300, 1200];
  let lastErr: unknown;
  for (const d of delays) {
    if (d) await new Promise(r => setTimeout(r, d));
    try { return (await http.get<T>(url, { signal })).data; }
    catch (e) { lastErr = e; }
  }
  throw lastErr;
}

export default http;

