/*
 * Funcionalidad: useRemoteVentilator
 * Descripción: Hook que gestiona el ciclo de vida completo de la conexión al
 *   ventilador físico (recurso único): reserva vía simulatorApi, telemetría de
 *   baja frecuencia por WebSocket, envío de comandos y liberación. Distingue la
 *   reserva propia (hasReservation) de la ocupación por otro usuario (occupiedBy)
 *   para que la UI refleje "Reservado por X / Disponible".
 * Versión: 1.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { BACKEND_API_URL } from '@/config/env';
import { getAuthToken, getUserData } from '@/shared/services/authService';
import { useSocket } from '@/shared/hooks/useSocket';
import { simulatorApi } from '@/features/simulador/compartido/api/simulator.api';
import type {
  VentilatorReading,
  VentilatorCommand,
  VentilatorStatus,
  VentilatorAlarm,
} from '@/features/simulador/compartido/tipos/simulator.types';

// =============================================================================
// Types
// =============================================================================

export interface RemoteVentilatorState {
  /** WebSocket connection to the backend */
  isSocketConnected: boolean;
  /** Backend ↔ physical ventilator connection state */
  ventilatorStatus: VentilatorStatus;
  /** Whether the current user holds an active reservation */
  hasReservation: boolean;
  /** Reserva activa de OTRO usuario (recurso ocupado) — null si está libre o es propia */
  occupiedBy: { userId: string; name: string | null; endTime: number | null } | null;
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
  /** Nombre visible (o email) del usuario que reservó — lo emite el backend */
  userName?: string | null;
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
  const [occupiedBy, setOccupiedBy] = useState<RemoteVentilatorState['occupiedBy']>(null);
  const [data, setData] = useState<VentilatorReading[]>([]);
  const [alarms, setAlarms] = useState<VentilatorAlarm[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Espejo de hasReservation para leerlo en callbacks estables (deps vacías)
  // sin recrearlos en cada cambio. Evita que checkStatus borre por error una
  // reserva que SÍ tenemos localmente cuando el backend reporta ownership ambiguo.
  const hasReservationRef = useRef(false);
  useEffect(() => {
    hasReservationRef.current = hasReservation;
  }, [hasReservation]);

  // ---------------------------------------------------------------------------
  // WebSocket event listeners
  //
  // NOTA: la telemetría de alta frecuencia (`ventilator:data`, ~30 Hz) NO se
  // escucha aquí. Vive en ventilatorStreamStore (useVentilatorData), que coalesce
  // las muestras en un único buffer y re-renderiza a ~12 fps vía rAF. Suscribirla
  // también aquí re-renderizaba la FSM de conexión (y todo el contexto que la
  // consume) 30 veces/seg, trabando la UI. Este hook sólo escucha eventos de baja
  // frecuencia: estado, alarmas y reserva.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!socket || !isSocketConnected) return;

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

    // Backend broadcasts to ALL clients — we receive it to update UI state.
    // El payload trae el userId del titular: solo si coincide con el usuario
    // logueado la tratamos como reserva PROPIA; si no, el recurso único quedó
    // ocupado por otro usuario (occupiedBy) y este cliente NO tiene reserva.
    const handleReserved = (payload: ReservedPayload) => {
      const currentUserId = (getUserData() as { id?: string } | null)?.id;
      const now = Date.now();

      if (currentUserId && payload.userId === currentUserId) {
        const remainingMinutes = Math.max(0, Math.floor((payload.endTime - now) / 60_000));
        setReservation({
          id: payload.reservationId,
          startTime: now,
          endTime: payload.endTime,
          remainingMinutes,
        });
        setHasReservation(true);
        setOccupiedBy(null);
        return;
      }

      setHasReservation(false);
      setReservation(null);
      setOccupiedBy({
        userId: payload.userId,
        name: payload.userName ?? null,
        endTime: payload.endTime,
      });
    };

    const handleReleased = (_payload: ReleasedPayload) => {
      setHasReservation(false);
      setReservation(null);
      setOccupiedBy(null);
    };

    socket.on('ventilator:alarm', handleAlarm);
    socket.on('ventilator:status', handleStatus);
    socket.on('ventilator:reserved', handleReserved);
    socket.on('ventilator:released', handleReleased);

    return () => {
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
      // currentUserName aún no está en el contrato local GetVentilatorStatusResponse;
      // se lee con un narrow puntual para no divergir el contrato compartido.
      const holderName =
        (status as unknown as { currentUserName?: string | null }).currentUserName ?? null;
      if (!status.isReserved) {
        setHasReservation(false);
        setReservation(null);
        setOccupiedBy(null);
      } else if (status.currentUser === currentUserId && status.reservationEndsAt) {
        // This user owns the active reservation — rehydrate it
        setHasReservation(true);
        setOccupiedBy(null);
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
      } else if (!hasReservationRef.current) {
        // El backend dice que está reservado pero no pudimos confirmar que sea
        // de ESTE usuario (id en otro formato, reservationEndsAt ausente, etc.).
        // Sólo lo tratamos como "de otro usuario" si NO tenemos ya una reserva
        // local; de lo contrario conservamos la nuestra para no autoliberarla.
        setHasReservation(false);
        setReservation(null);
        setOccupiedBy({
          userId: status.currentUser ?? '',
          name: holderName,
          endTime: status.reservationEndsAt ?? null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check status'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Hidratación inicial: al montar se consulta el estado para reflejar una
  // reserva ajena ya existente (antes de este efecto solo se conocía por el
  // broadcast en vivo, invisible para quien entra después).
  // ---------------------------------------------------------------------------

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  // Auto-refresco cuando la reserva ajena vence: pasado su endTime se reconsulta
  // el estado (el backend expira la fila) y el panel vuelve a "Disponible".
  useEffect(() => {
    if (!occupiedBy?.endTime) return;
    const delay = Math.max(0, occupiedBy.endTime - Date.now()) + 1_000;
    const timeout = setTimeout(() => {
      void checkStatus();
    }, delay);
    return () => clearTimeout(timeout);
  }, [occupiedBy?.endTime, checkStatus]);

  const connect = useCallback(async () => {
    if (!isSocketConnected) {
      throw new Error('WebSocket no conectado. Verifica tu conexión.');
    }
    if (!hasReservation) {
      throw new Error('Necesitas una reserva activa para conectar al ventilador.');
    }
    // NO se reconcilia con checkStatus aquí: hacerlo borraba la reserva recién
    // creada cuando la comparación de ownership del backend era ambigua, lo que
    // producía el falso "la reserva finalizó o fue liberada" justo al conectar.
    // El canal ya está abierto (socket autenticado + reserva activa); el estado
    // del ventilador llega por el evento WebSocket `ventilator:status`.
  }, [isSocketConnected, hasReservation]);

  const disconnect = useCallback(() => {
    setData([]);
    setAlarms([]);
  }, []);

  const requestReservation = useCallback(
    async (durationMinutes: number, purpose?: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await simulatorApi.reserve({
          durationMinutes,
          // Omit `purpose` entirely when undefined: exactOptionalPropertyTypes
          // forbids passing an explicit `undefined` to an optional field.
          ...(purpose !== undefined ? { purpose } : {}),
        });
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
        void checkStatus();
        return false;
      } catch (err) {
        // 409 del backend (otro usuario ganó la carrera): fetchApi lanza con el
        // mensaje del servidor. Se reconsulta el estado para hidratar occupiedBy.
        setError(err instanceof Error ? err : new Error('Error al reservar'));
        void checkStatus();
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [checkStatus]
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
    setData([]);
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    isSocketConnected,
    ventilatorStatus,
    hasReservation,
    occupiedBy,
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
