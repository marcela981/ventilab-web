// Re-exports the hook defined in SocketContext so that both import paths work:
//   import { useSocket } from '@/shared/hooks/useSocket'
//   import { useSocket } from '@/shared/contexts/SocketContext'
export { useSocket, type SocketContextValue } from '@/shared/contexts/SocketContext';
