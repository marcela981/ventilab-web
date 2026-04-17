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
import { getAuthToken } from '@/shared/services/authService';

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
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  // Trigger re-render when socketRef is populated so consumers receive the instance.
  const [, setTick] = useState(0);

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
    const onAuthenticated = ({ userId }: { userId: string }) => {
      setIsAuthenticated(true);
    };
    const onAuthError = () => {
      console.warn('[Socket] Authentication failed — disconnecting');
      setIsAuthenticated(false);
      socket.disconnect();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('authenticated', onAuthenticated);
    socket.on('auth_error', onAuthError);

    return () => {
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
      (session as any)?.accessToken ?? getAuthToken();

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
