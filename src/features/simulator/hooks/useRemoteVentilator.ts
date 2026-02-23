import { useState, useEffect, useCallback, useRef } from 'react';

import { BACKEND_API_URL } from '@/config/env';
import { getAuthToken, getUserData } from '@/shared/services/authService';
import { useSocket } from '@/shared/hooks/useSocket';
import { simulatorApi } from '../simulator.api';
import type {
  VentilatorReading,
  VentilatorCommand,
  VentilatorStatus,
  VentilatorAlarm,
} from '../simulator.types';

// =============================================================================
// Types
// =============================================================================

const BUFFER_SIZE = 300;

export interface RemoteVentilatorState {
  /** WebSocket connection to the backend */
  isSocketConnected: boolean;
  /** Backend ↔ physical ventilator connection state */
  ventilatorStatus: VentilatorStatus;
  /** Whether the current user holds an active reservation */
  hasReservation: boolean;
  /** Reservation details — null when not reserved */
  reservation: {
    /** Reservation ID (empty string when hydrated from status check, which omits it) */
    id: string;
    /** Unix ms — 0 when hydrated from status check */
    startTime: number;
    endTime: number;
    remainingMinutes: number;
  } | null;
  data: VentilatorReading[];
  latest: VentilatorReading | null;
  alarms: VentilatorAlarm[];
  error: Error | null;
  isLoading: boolean;
}

export interface UseRemoteVentilatorReturn extends RemoteVentilatorState {
  connect: () => Promise<void>;
  disconnect: () => void;
  requestReservation: (durationMinutes: number, purpose?: string) => Promise<boolean>;
  releaseReservation: () => Promise<void>;
  sendCommand: (command: VentilatorCommand) => Promise<void>;
  clearData: () => void;
  checkStatus: () => Promise<void>;
}

// Payloads emitted by the backend simulation service
interface ReservedPayload {
  userId: string;
  reservationId: string;
  endTime: number;
}

interface ReleasedPayload {
  userId: string;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Manages the full lifecycle of a connection to the physical ventilator:
 *   reservation → WebSocket telemetry → command sending → release
 *
 * Must be used within a <SocketProvider> tree (already global in _app.js).
 */
export function useRemoteVentilator(): UseRemoteVentilatorReturn {
  const { socket, isConnected: isSocketConnected } = useSocket();

  const [ventilatorStatus, setVentilatorStatus] = useState<VentilatorStatus>('DISCONNECTED');
  const [hasReservation, setHasReservation] = useState(false);
  const [reservation, setReservation] = useState<RemoteVentilatorState['reservation']>(null);
  const [data, setData] = useState<VentilatorReading[]>([]);
  const [alarms, setAlarms] = useState<VentilatorAlarm[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const bufferRef = useRef<VentilatorReading[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // WebSocket event listeners
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!socket || !isSocketConnected) return;

    const handleData = (reading: VentilatorReading) => {
      bufferRef.current = [...bufferRef.current.slice(-(BUFFER_SIZE - 1)), reading];
      setData([...bufferRef.current]);
    };

    const handleAlarm = (alarm: VentilatorAlarm) => {
      setAlarms((prev) => {
        const idx = prev.findIndex((a) => a.type === alarm.type);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = alarm;
          return updated;
        }
        return [...prev, alarm];
      });
    };

    const handleStatus = (status: VentilatorStatus) => {
      setVentilatorStatus(status);
    };

    // Backend broadcasts to ALL clients — we receive it to update UI state
    const handleReserved = (payload: ReservedPayload) => {
      const now = Date.now();
      const remainingMinutes = Math.max(0, Math.floor((payload.endTime - now) / 60_000));
      setReservation({
        id: payload.reservationId,
        startTime: now,
        endTime: payload.endTime,
        remainingMinutes,
      });
      setHasReservation(true);
    };

    const handleReleased = (_payload: ReleasedPayload) => {
      setHasReservation(false);
      setReservation(null);
    };

    socket.on('ventilator:data', handleData);
    socket.on('ventilator:alarm', handleAlarm);
    socket.on('ventilator:status', handleStatus);
    socket.on('ventilator:reserved', handleReserved);
    socket.on('ventilator:released', handleReleased);

    return () => {
      socket.off('ventilator:data', handleData);
      socket.off('ventilator:alarm', handleAlarm);
      socket.off('ventilator:status', handleStatus);
      socket.off('ventilator:reserved', handleReserved);
      socket.off('ventilator:released', handleReleased);
    };
  }, [socket, isSocketConnected]);

  // ---------------------------------------------------------------------------
  // Reservation countdown timer
  // Dependency on endTime only — avoids restarting when remainingMinutes updates
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!reservation?.endTime) return;

    const endTime = reservation.endTime;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 60_000));
      setReservation((prev) => (prev ? { ...prev, remainingMinutes: remaining } : null));
      if (remaining <= 0) {
        setHasReservation(false);
        setReservation(null);
      }
    };

    timerRef.current = setInterval(tick, 60_000);
    tick(); // run immediately so display is accurate on mount

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [reservation?.endTime]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await simulatorApi.getStatus();
      setVentilatorStatus(status.status);

      // Sync alarms from status
      status.activeAlarms.forEach((alarm) => {
        setAlarms((prev) => {
          const idx = prev.findIndex((a) => a.type === alarm.type);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = alarm;
            return updated;
          }
          return [...prev, alarm];
        });
      });

      // Sync reservation flag.
      // Compare currentUser from status with the logged-in user to determine
      // if THIS user owns the reservation (vs someone else having it).
      const currentUserId = (getUserData() as { id?: string } | null)?.id;
      if (!status.isReserved) {
        setHasReservation(false);
        setReservation(null);
      } else if (status.currentUser === currentUserId && status.reservationEndsAt) {
        // This user owns the active reservation — rehydrate it
        setHasReservation(true);
        setReservation((prev) =>
          prev
            ? prev // keep full details already set via requestReservation / WS event
            : {
              id: status.reservationId ?? '',
              startTime: 0,
              endTime: status.reservationEndsAt!,
              remainingMinutes: Math.max(
                0,
                Math.floor((status.reservationEndsAt! - Date.now()) / 60_000)
              ),
            }
        );
      } else {
        // Reservation exists but belongs to another user
        setHasReservation(false);
        setReservation(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check status'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!isSocketConnected) {
      throw new Error('WebSocket no conectado. Verifica tu conexión.');
    }
    if (!hasReservation) {
      throw new Error('Necesitas una reserva activa para conectar al ventilador.');
    }
    await checkStatus();
  }, [isSocketConnected, hasReservation, checkStatus]);

  const disconnect = useCallback(() => {
    bufferRef.current = [];
    setData([]);
    setAlarms([]);
  }, []);

  const requestReservation = useCallback(
    async (durationMinutes: number, purpose?: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await simulatorApi.reserve({ durationMinutes, purpose });
        if (result.success && result.reservationId && result.endTime) {
          setHasReservation(true);
          setReservation({
            id: result.reservationId,
            startTime: result.startTime ?? Date.now(),
            endTime: result.endTime,
            remainingMinutes: durationMinutes,
          });
          return true;
        }
        setError(new Error(result.message ?? 'No se pudo reservar el ventilador'));
        return false;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error al reservar'));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const releaseReservation = useCallback(async () => {
    setIsLoading(true);
    try {
      await simulatorApi.release();
      setHasReservation(false);
      setReservation(null);
      disconnect();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al liberar reserva'));
    } finally {
      setIsLoading(false);
    }
  }, [disconnect]);

  const sendCommand = useCallback(
    async (command: VentilatorCommand) => {
      if (!hasReservation) {
        throw new Error('No tienes reserva activa');
      }
      const token = getAuthToken();
      const response = await fetch(`${BACKEND_API_URL}/simulation/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ command }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message ?? 'Error al enviar comando');
      }
    },
    [hasReservation]
  );

  const clearData = useCallback(() => {
    bufferRef.current = [];
    setData([]);
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    isSocketConnected,
    ventilatorStatus,
    hasReservation,
    reservation,
    data,
    latest: data[data.length - 1] ?? null,
    alarms,
    error,
    isLoading,
    connect,
    disconnect,
    requestReservation,
    releaseReservation,
    sendCommand,
    clearData,
    checkStatus,
  };
}
