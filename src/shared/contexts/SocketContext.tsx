/*
 * Funcionalidad: SocketContext
 * Descripción: Contexto React para la conexión WebSocket con el backend.
 *   Maneja la autenticación via JWT con WSGateway. Depende de next-auth session
 *   y socket.io-client.
 * Versión: 1.0
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
  useState,
  useRef,
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
// Provider
// =============================================================================

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  // Trigger re-render when socketRef is populated so consumers receive the instance.
  const [, setTick] = useState(0);
  // Un solo reintento de re-autenticación tras 'auth_error' (JWT de backend
  // vencido con sesión NextAuth aún viva); al segundo fallo se cierra sesión.
  const reauthAttemptedRef = useRef(false);

  // Create the socket once on mount; clean up on unmount.
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;
    setTick((t) => t + 1);

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
      socket.disconnect();

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
          socket.once('connect', () => socket.emit('authenticate', token));
          socket.connect();
        } else {
          handleSessionExpired('socket_auth_error');
        }
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('authenticated', onAuthenticated);
    socket.on('auth_error', onAuthError);

    // Logout central (sesión expirada detectada por HTTP u otro módulo):
    // cerrar el socket para no dejarlo autenticado con una sesión muerta.
    const unsubscribeLogout = authEvents.on('auth:logout', () => {
      setIsAuthenticated(false);
      socket.disconnect();
    });

    return () => {
      unsubscribeLogout();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('authenticated', onAuthenticated);
      socket.off('auth_error', onAuthError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Connect/disconnect based on session state; emit 'authenticate' after connect.
  useEffect(() => {
    if (status === 'loading') return;

    const socket = socketRef.current;
    if (!socket) return;

    // Resolve the JWT: prefer the NextAuth accessToken (if exposed by the
    // auth config), otherwise fall back to the backend JWT stored in localStorage
    // by the custom authService after credential login.
    const token =
      session?.accessToken ?? getAuthToken();

    const hasSession = status === 'authenticated' || !!token;

    if (hasSession && token) {
      const sendAuth = () => socket.emit('authenticate', token);

      if (!socket.connected) {
        socket.connect();
        socket.once('connect', sendAuth);
      } else {
        sendAuth();
      }

      return () => {
        socket.off('connect', sendAuth);
      };
    } else {
      // No session — disconnect cleanly.
      if (socket.connected) socket.disconnect();
      setIsAuthenticated(false);
    }
  }, [status, session]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        isAuthenticated,
      }}
    >
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
