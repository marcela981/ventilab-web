/**
 * =============================================================================
 * Global Providers Component
 * =============================================================================
 * 
 * Configuración global para evitar revalidaciones agresivas y manejar
 * respuestas 304 correctamente.
 * 
 * - Configura fetch global con cache: 'no-store' para evitar 304 en dev
 * - Maneja respuestas 304 sin intentar parsear JSON vacío
 * - Proporciona configuración centralizada para fetch manuales
 */

import React from 'react';

/**
 * Configuración global de fetch para evitar cache y 304
 * Úsala en fetch manuales cuando necesites evitar revalidaciones agresivas
 */
export const fetchConfig = {
  cache: 'no-store',
  headers: {
    'cache-control': 'no-cache',
  },
};

/**
 * Wrapper de fetch con manejo de 304
 * 
 * @param {string} url - URL a fetch
 * @param {RequestInit} options - Opciones de fetch
 * @returns {Promise<Response>}
 */
export async function fetchWithNoCache(url, options = {}) {
  const res = await fetch(url, {
    ...fetchConfig,
    ...options,
    headers: {
      ...fetchConfig.headers,
      ...(options.headers || {}),
    },
  });

  // Manejar 304 sin intentar parsear JSON
  if (res.status === 304) {
    // Retornar undefined para indicar que no hay datos nuevos
    // El componente puede manejar esto según su lógica
    return undefined;
  }

  return res;
}

/**
 * Fetch con manejo completo de 304 y errores
 * 
 * @param {string} url - URL a fetch
 * @param {RequestInit} options - Opciones de fetch
 * @returns {Promise<any>} - Datos parseados o undefined si 304
 */
export async function fetchJSONWithNoCache(url, options = {}) {
  const res = await fetchWithNoCache(url, options);
  
  if (!res) {
    // 304 - no hay datos nuevos
    return undefined;
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  // Solo parsear JSON si el content-type lo indica
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }

  return res.text();
}

/**
 * Hook para evitar doble ejecución en StrictMode (dev)
 * Úsalo en useEffect que hacen fetch
 * 
 * @example
 * const fetched = useRef(false);
 * useEffect(() => {
 *   if (fetched.current) return;
 *   fetched.current = true;
 *   // ... tu fetch aquí
 * }, [userId]);
 */
export function useFetchOnce() {
  const fetchedRef = React.useRef(false);
  
  return {
    shouldFetch: () => {
      if (fetchedRef.current) {
        return false;
      }
      fetchedRef.current = true;
      return true;
    },
    reset: () => {
      fetchedRef.current = false;
    },
  };
}

/**
 * Componente Providers
 * 
 * Actualmente solo exporta utilidades, pero puede extenderse
 * para incluir SWRConfig o QueryClientProvider si se necesitan en el futuro.
 */
export default function Providers({ children }) {
  return <>{children}</>;
}

