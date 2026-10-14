/*
 * Funcionalidad: SocketContext
 * Descripción: Contexto React para la conexión WebSocket con el backend.
 *   Maneja la autenticación via JWT con WSGateway. Depende de next-auth session
 *   y socket.io-client.
 *   v1.1 (T8 coexistence): when a backend session exists (both tokens in
 *   @shared/api-client/token-storage) the legacy provider stays idle (no io()
 *   connection of its own) and exposes the RealtimeProvider socket through a 1:1
 *   adapter: socket = realtime socket, isConnected = status connecting|authenticated,
 *   isAuthenticated = status authenticated; re-auth after a token refresh comes from
 *   the new provider. NextAuth-bridge-only users keep the legacy socket unchanged.
 *   The socket instance is memoized per backend-session state (no ref read during render).
 * Versión: 1.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica
 *   ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import {
  getAuthToken,
  refreshBackendTokenFromSession,
} from '@/shared/services/authService';
import { authEvents } from '@/shared/services/authEvents';
import { handleSessionExpired } from '@/shared/services/sessionExpired';
// Direct module imports (not the indexes) so the app shell does not pull extra code.
import { getTokens, subscribeTokens } from '@shared/api-client/token-storage';
import { RealtimeContext } from '@shared/realtime/realtime-context';

// =============================================================================
// Types
// =============================================================================

export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
}

// =============================================================================
// Context
// =============================================================================

export const SocketContext = createContext<SocketContextValue | null>(null);
SocketContext.displayName = 'SocketContext';

// =============================================================================
// Backend-session detection (same rule as @shared/session: BOTH tokens stored)
// =============================================================================

function hasBackendSession(): boolean {
  const { accessToken, refreshToken } = getTokens();
  return !!accessToken && !!refreshToken;
}

function useHasBackendSession(): boolean {
  return useSyncExternalStore(subscribeTokens, hasBackendSession, () => false);
}

// =============================================================================
// Provider
// =============================================================================

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const backendSession = useHasBackendSession();
  const realtime = useContext(RealtimeContext);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Un solo reintento de re-autenticación tras 'auth_error' (JWT de backend
  // vencido con sesión NextAuth aún viva); al segundo fallo se cierra sesión.
  const reauthAttemptedRef = useRef(false);

  // The legacy socket instance exists only while there is no backend session (the
  // RealtimeProvider owns the connection then). autoConnect:false, so creating it opens
  // nothing; the effects below connect it. The fresh read covers hydration, where the
  // store still reports the server snapshot (false).
  const socket = useMemo<Socket | null>(() => {
    if (backendSession || hasBackendSession()) return null;

    return io(BACKEND_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }, [backendSession]);

  // Wire the legacy socket listeners; clean up when the instance changes.
  useEffect(() => {
    if (!socket) return;

    const legacySocket = socket;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => {
      setIsConnected(false);
      setIsAuthenticated(false);
    };
    const onAuthenticated = () => {
      reauthAttemptedRef.current = false;
      setIsAuthenticated(true);
    };
    const onAuthError = () => {
      setIsAuthenticated(false);
      legacySocket.disconnect();

      if (reauthAttemptedRef.current) {
        console.warn('[Socket] Token inválido tras reintento — cerrando sesión');
        handleSessionExpired('socket_auth_error');
        return;
      }

      // Primer 'auth_error': puede ser solo el JWT de backend vencido con la
      // sesión NextAuth aún viva — renovar el token una vez y reconectar.
      reauthAttemptedRef.current = true;
      void refreshBackendTokenFromSession().then((token) => {
        if (token) {
          legacySocket.once('connect', () => legacySocket.emit('authenticate', token));
          legacySocket.connect();
        } else {
          handleSessionExpired('socket_auth_error');
        }
      });
    };

    legacySocket.on('connect', onConnect);
    legacySocket.on('disconnect', onDisconnect);
    legacySocket.on('authenticated', onAuthenticated);
    legacySocket.on('auth_error', onAuthError);

    // Logout central (sesión expirada detectada por HTTP u otro módulo):
    // cerrar el socket para no dejarlo autenticado con una sesión muerta.
    const unsubscribeLogout = authEvents.on('auth:logout', () => {
      setIsAuthenticated(false);
      legacySocket.disconnect();
    });

    return () => {
      unsubscribeLogout();
      legacySocket.off('connect', onConnect);
      legacySocket.off('disconnect', onDisconnect);
      legacySocket.off('authenticated', onAuthenticated);
      legacySocket.off('auth_error', onAuthError);
      legacySocket.disconnect();
      setIsConnected(false);
      setIsAuthenticated(false);
    };
  }, [socket]);

  // Connect/disconnect based on session state; emit 'authenticate' after connect.
  useEffect(() => {
    if (status === 'loading') return;
    if (backendSession || !socket) return;

    // Resolve the JWT: prefer the NextAuth accessToken (if exposed by the
    // auth config), otherwise fall back to the backend JWT stored in localStorage
    // by the custom authService after credential login.
    const token =
      session?.accessToken ?? getAuthToken();

    const hasSession = status === 'authenticated' || !!token;

    if (hasSession && token) {
      const sendAuth = () => socket.emit('authenticate', token);

      if (!socket.connected) {
        // Listener first: identical with the async real client, never misses a sync connect.
        socket.once('connect', sendAuth);
        socket.connect();
      } else {
        sendAuth();
      }

      return () => {
        socket.off('connect', sendAuth);
      };
    } else {
      // No session — disconnect cleanly ('disconnect' resets isConnected and
      // isAuthenticated; an unconnected socket is never authenticated).
      if (socket.connected) socket.disconnect();
      return undefined;
    }
  }, [status, session, socket, backendSession]);

  const realtimeSocket = realtime?.socket ?? null;
  const realtimeStatus = realtime?.status ?? 'idle';

  const value = useMemo<SocketContextValue>(() => {
    if (backendSession) {
      // 1:1 adapter over the new provider: the typed realtime socket is the same
      // socket.io client; legacy consumers only use on/off/emit with their own events.
      return {
        socket: realtimeSocket as unknown as Socket | null,
        isConnected: realtimeStatus === 'connecting' || realtimeStatus === 'authenticated',
        isAuthenticated: realtimeStatus === 'authenticated',
      };
    }

    return { socket, isConnected, isAuthenticated };
  }, [backendSession, realtimeSocket, realtimeStatus, socket, isConnected, isAuthenticated]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a <SocketProvider>');
  }
  return context;
}
