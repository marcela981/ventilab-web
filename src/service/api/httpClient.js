/**
 * Cliente HTTP centralizado para comunicarse con el backend
 * Maneja autenticación, headers, errores y retry logic
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Configuración de retry
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

/**
 * Obtener token de autenticación desde NextAuth
 * Nota: En Next.js con NextAuth, el token se maneja automáticamente
 * a través de cookies. Para requests desde el cliente, NextAuth
 * puede proporcionar el token JWT a través de getSession.
 * 
 * Por ahora, intentamos obtener desde localStorage o usar cookies.
 * En producción, deberías usar getSession de next-auth/react.
 */
async function getAuthToken() {
  try {
    if (typeof window !== 'undefined') {
      // Intentar obtener token desde localStorage (si se guarda ahí)
      const token = localStorage.getItem('authToken');
      if (token) {
        return token;
      }

      // Si usas NextAuth, el token puede estar en la sesión
      // Para obtenerlo, necesitarías usar getSession de next-auth/react
      // Por ahora, retornamos null y el backend manejará la autenticación
      // a través de cookies si NextAuth está configurado correctamente
    }
    return null;
  } catch (error) {
    console.error('Error al obtener token de autenticación:', error);
    return null;
  }
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
async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  try {
    const response = await fetch(url, options);
    
    // Si es un error 401, no hacer retry, redirigir a login
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('No autenticado');
    }

    // Si es un error 5xx, intentar retry
    if (response.status >= 500 && retries > 0) {
      await delay(RETRY_DELAY);
      return fetchWithRetry(url, options, retries - 1);
    }

    return response;
  } catch (error) {
    // Si es error de red y quedan retries, intentar de nuevo
    if (retries > 0 && (error.name === 'TypeError' || error.message.includes('fetch'))) {
      await delay(RETRY_DELAY);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

/**
 * Manejar error 401 (no autenticado)
 */
function handleUnauthorized() {
  if (typeof window !== 'undefined') {
    // Limpiar token local
    localStorage.removeItem('authToken');
    
    // Redirigir a login
    window.location.href = '/auth/signin';
  }
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
 * Función helper para obtener token desde NextAuth session
 * Debe ser llamada desde componentes que tengan acceso a useSession
 */
export function setAuthToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
  }
}

export default httpClient;

