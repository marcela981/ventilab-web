import { useContext } from 'react';
import { SocketContext, type SocketContextValue } from '@/shared/contexts/SocketContext';

/**
 * Accesses the global WebSocket connection managed by SocketProvider.
 * Must be used within a component tree wrapped by <SocketProvider>.
 *
 * @example
 * const { socket, isConnected } = useSocket();
 * useEffect(() => {
 *   socket?.on('ventilator:data', handler);
 *   return () => { socket?.off('ventilator:data', handler); };
 * }, [socket]);
 */
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a <SocketProvider>');
  }
  return context;
}
