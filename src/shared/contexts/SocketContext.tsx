'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { getAuthToken } from '@/shared/services/authService';
import { BACKEND_URL } from '@/config/env';

// =============================================================================
// Types
// =============================================================================

export interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: Error | null;
  connect: () => void;
  disconnect: () => void;
}

// =============================================================================
// Context
// =============================================================================

export const SocketContext = createContext<SocketContextValue | null>(null);
SocketContext.displayName = 'SocketContext';

// =============================================================================
// Provider
// =============================================================================

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);
  // Force re-render to expose socket reference to context consumers
  const [, setTick] = useState(0);

  // Create socket once (on mount)
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;
    setTick((t) => t + 1);

    const onConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };
    const onDisconnect = () => setIsConnected(false);
    const onConnectError = (err: Error) => setConnectionError(err);
    const onAuthenticated = () => console.log('[Socket] WebSocket authenticated');
    const onAuthError = () => {
      console.warn('[Socket] Authentication failed — disconnecting');
      socket.disconnect();
      setConnectionError(new Error('WebSocket auth failed'));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('authenticated', onAuthenticated);
    socket.on('auth_error', onAuthError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('authenticated', onAuthenticated);
      socket.off('auth_error', onAuthError);
      socket.close();
      socketRef.current = null;
    };
  }, []);

  // Connect / disconnect based on auth state
  useEffect(() => {
    if (status === 'loading') return;

    const socket = socketRef.current;
    if (!socket) return;

    // Resolve token: NextAuth session users get token from localStorage
    // (set by the custom authService after login), or directly from getAuthToken.
    const token = getAuthToken();
    const isAuthenticated = status === 'authenticated' || !!token;

    if (isAuthenticated) {
      if (!socket.connected) {
        socket.connect();
      }
      // Send auth token once connected (or immediately if already connected)
      const sendAuth = () => {
        const t = getAuthToken();
        if (t) socket.emit('authenticate', t);
      };

      if (socket.connected) {
        sendAuth();
      } else {
        socket.once('connect', sendAuth);
      }

      return () => {
        socket.off('connect', sendAuth);
      };
    } else {
      // No session and no token — disconnect
      if (socket.connected) socket.disconnect();
    }
  }, [status, session]);

  const connect = useCallback(() => {
    socketRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        connectionError,
        connect,
        disconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
