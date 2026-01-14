/**
 * Cliente HTTP centralizado para comunicarse con el backend
 * Maneja autenticación, headers, errores y retry logic
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Configuración de retry
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

// Clave de localStorage consistente con authService.js
const TOKEN_KEY = 'ventilab_auth_token';

// Promise para evitar múltiples solicitudes de token simultáneas
let tokenRefreshPromise = null;

/**
 * Obtener token de autenticación
 * Primero intenta localStorage, luego el endpoint backend-token
 */
async function getAuthToken() {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    // Intentar obtener token desde localStorage
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      return storedToken;
    }

    // Si no hay token, intentar obtenerlo del endpoint backend-token
    return await refreshBackendToken();
  } catch (error) {
    console.error('[httpClient] Error al obtener token de autenticación:', error);
    return null;
  }
}

/**
 * Obtener token del backend a través de NextAuth
 */
async function refreshBackendToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  // Evitar múltiples solicitudes simultáneas
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  tokenRefreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/backend-token', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Usuario no autenticado en NextAuth, no es un error
          console.debug('[httpClient] Usuario no autenticado en NextAuth');
          return null;
        }
        throw new Error(`Backend token request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data?.success && data?.token) {
        // Guardar token en localStorage
        localStorage.setItem(TOKEN_KEY, data.token);
        
        // Guardar datos del usuario si están disponibles
        if (data.user) {
          try {
            localStorage.setItem('ventilab_user_data', JSON.stringify(data.user));
          } catch {
            // Ignorar errores de quota
          }
        }
        
        return data.token;
      }

      return null;
    } catch (error) {
      console.error('[httpClient] Error refreshing backend token:', error);
      return null;
    } finally {
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
}

/**
 * Delay para retry
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Realizar request con retry logic
 */
async function fetchWithRetry(url, options, retries = MAX_RETRIES, hasRetried401 = false) {
  try {
    const response = await fetch(url, options);
    
    // Si es un error 401 y no hemos intentado refrescar el token
    if (response.status === 401 && !hasRetried401) {
      const tokenRefreshed = await handleUnauthorized();
      
      if (tokenRefreshed) {
        // Token refrescado, reintentar con nuevo token
        const newToken = localStorage.getItem(TOKEN_KEY);
        if (newToken && options.headers) {
          options.headers['Authorization'] = `Bearer ${newToken}`;
        }
        return fetchWithRetry(url, options, retries, true);
      }
      
      throw new Error('No autenticado');
    }

    // Si es un error 5xx, intentar retry
    if (response.status >= 500 && retries > 0) {
      await delay(RETRY_DELAY);
      return fetchWithRetry(url, options, retries - 1, hasRetried401);
    }

    return response;
  } catch (error) {
    // Si es error de red y quedan retries, intentar de nuevo
    if (retries > 0 && (error.name === 'TypeError' || error.message.includes('fetch'))) {
      await delay(RETRY_DELAY);
      return fetchWithRetry(url, options, retries - 1, hasRetried401);
    }
    throw error;
  }
}

/**
 * Manejar error 401 (no autenticado)
 */
async function handleUnauthorized() {
  if (typeof window !== 'undefined') {
    // Intentar refrescar el token primero
    const newToken = await refreshBackendToken();
    
    if (newToken) {
      // Token refrescado exitosamente, no redirigir
      return true;
    }
    
    // Limpiar tokens locales
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('ventilab_user_data');
    
    // Disparar evento de sesión expirada
    try {
      window.dispatchEvent(new CustomEvent('auth:session-expired', {
        detail: { reason: 'Token inválido o expirado' }
      }));
    } catch {
      // Ignorar si CustomEvent no está disponible
    }
    
    // Redirigir a login
    window.location.href = '/auth/signin';
    return false;
  }
  return false;
}

/**
 * Clase de error personalizada para errores de API
 */
export class APIError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Realizar request HTTP
 */
async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  // Obtener token de autenticación
  const token = await getAuthToken();
  
  // Configurar headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Agregar token si está disponible
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Configurar opciones de fetch
  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include', // Incluir cookies para NextAuth
    mode: 'cors', // Asegurar modo CORS
  };

  try {
    const response = await fetchWithRetry(url, fetchOptions);

    // Parsear respuesta
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Si la respuesta no es exitosa, lanzar error
    if (!response.ok) {
      throw new APIError(
        data.error?.message || data.message || `Error ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    // Si ya es un APIError, re-lanzarlo
    if (error instanceof APIError) {
      throw error;
    }

    // Manejar errores de red
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      throw new APIError(
        'Error de conexión. Verifica tu conexión a internet.',
        0,
        { networkError: true }
      );
    }

    // Error desconocido
    throw new APIError(
      error.message || 'Error desconocido',
      500,
      { originalError: error }
    );
  }
}

/**
 * Métodos HTTP helpers
 */
export const httpClient = {
  get: (endpoint, options = {}) => {
    return request(endpoint, {
      ...options,
      method: 'GET',
    });
  },

  post: (endpoint, data, options = {}) => {
    return request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put: (endpoint, data, options = {}) => {
    return request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  patch: (endpoint, data, options = {}) => {
    return request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: (endpoint, options = {}) => {
    return request(endpoint, {
      ...options,
      method: 'DELETE',
    });
  },
};

/**
 * Función helper para guardar token de autenticación
 * @param {string} token - JWT token a guardar
 */
export function setAuthToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Función helper para remover token de autenticación
 */
export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('ventilab_user_data');
  }
}

/**
 * Función para forzar refresco del token del backend
 * Útil después de login con NextAuth
 */
export async function forceTokenRefresh() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    return await refreshBackendToken();
  }
  return null;
}

export default httpClient;

