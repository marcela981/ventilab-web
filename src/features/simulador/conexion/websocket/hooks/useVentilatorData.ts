import { useState, useEffect, useCallback, useRef } from 'react';

import { useSocket } from '@/shared/hooks/useSocket';
import type {
  VentilatorReading,
  VentilatorAlarm,
  VentilatorStatus,
  UseVentilatorDataReturn,
  AlarmType,
} from '@/contracts/simulator.contracts';

const BUFFER_SIZE = 300;
const UI_THROTTLE_MS = 333; // ~3 actualizaciones/seg para evitar re-renders a 60 Hz

/**
 * Subscribes to real-time ventilator telemetry via WebSocket.
 * Buffer en ref (no dispara re-renders); UI se actualiza con throttling.
 */
export function useVentilatorData(): UseVentilatorDataReturn {
  const { socket, isConnected } = useSocket();

  const [data, setData] = useState<VentilatorReading[]>([]);
  const [status, setStatus] = useState<VentilatorStatus>('DISCONNECTED');
  const [activeAlarms, setActiveAlarms] = useState<VentilatorAlarm[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const bufferRef = useRef<VentilatorReading[]>([]);
  const lastThrottleRef = useRef(0);

  useEffect(() => {
    if (!socket) return;

    const handleData = (reading: VentilatorReading) => {
      // Mutación in-place: evita crear un array nuevo por cada lectura a 60 Hz
      const buf = bufferRef.current;
      buf.push(reading);
      if (buf.length > BUFFER_SIZE) buf.splice(0, buf.length - BUFFER_SIZE);

      const now = Date.now();
      if (now - lastThrottleRef.current >= UI_THROTTLE_MS) {
        lastThrottleRef.current = now;
        setData([...buf]);
      }
    };

    const handleAlarm = (alarm: VentilatorAlarm) => {
      setActiveAlarms((prev) => {
        const idx = prev.findIndex((a) => a.type === alarm.type);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = alarm;
          return next;
        }
        return [...prev, alarm];
      });
    };

    const handleStatus = (incoming: VentilatorStatus) => {
      setStatus(incoming);
    };

    const handleConnectError = (err: Error) => {
      setError(err);
    };

    socket.on('ventilator:data', handleData);
    socket.on('ventilator:alarm', handleAlarm);
    socket.on('ventilator:status', handleStatus);
    socket.on('connect_error', handleConnectError);

    return () => {
      // Flush final: publicar el último batch antes de desmontar
      if (bufferRef.current.length > 0) {
        setData([...bufferRef.current]);
      }
      socket.off('ventilator:data', handleData);
      socket.off('ventilator:alarm', handleAlarm);
      socket.off('ventilator:status', handleStatus);
      socket.off('connect_error', handleConnectError);
    };
  }, [socket]);

  // ---------------------------------------------------------------------------
  // Derive connection status from socket state
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setStatus(isConnected ? 'CONNECTED' : 'DISCONNECTED');
    if (isConnected) setError(null);
  }, [isConnected]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const clearData = useCallback(() => {
    bufferRef.current = [];
    setData([]);
  }, []);

  const reconnect = useCallback(() => {
    socket?.disconnect();
    socket?.connect();
  }, [socket]);

  const acknowledgeAlarm = useCallback(
    (alarmId: AlarmType) => {
      socket?.emit('alarm:acknowledge', { alarmId });
      setActiveAlarms((prev) =>
        prev.map((a) =>
          a.type === alarmId ? { ...a, acknowledged: true } : a
        )
      );
    },
    [socket]
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    data,
    latest: data[data.length - 1] ?? null,
    isConnected,
    error,
    status,
    activeAlarms,
    actions: { clearData, reconnect, acknowledgeAlarm },
  };
}
