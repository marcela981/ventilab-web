import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { setAuthToken } from '../service/api/httpClient';

/**
 * Hook para configurar el cliente API con el token de NextAuth
 * Debe ser usado en componentes que necesiten hacer requests autenticados
 */
export function useApiClient() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Si hay una sesión activa y tiene un token, configurarlo
    if (session?.accessToken) {
      setAuthToken(session.accessToken);
    }
  }, [session]);

  return {
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    session,
  };
}

export default useApiClient;

