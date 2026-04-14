/*
 * Funcionalidad: useVentilatorData
 * Descripción: Hook para recibir y gestionar datos en tiempo real del ventilador
 *   físico vía WebSocket. Incluye throttle a 100ms para no saturar Chart.js.
 *   Depende de SocketContext y contracts/simulation.contracts.ts.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica
 *   ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/shared/contexts/SocketContext';

// =============================================================================
// Types
// =============================================================================

/**
 * Single reading emitted by the backend on the 'ventilator:data' event.
 * Shape is defined by WSGateway / simulation.contracts.ts on the server.
 */
export interface VentilatorReading {
  pressure: number;
  flow: number;
  volume: number;
  timestamp: number;
  deviceId: string;
  pco2?: number;
  spo2?: number;
}

export interface UseVentilatorDataReturn {
  /** Most recent reading received, or null before the first message. */
  latestReading: VentilatorReading | null;
  /** Rolling buffer capped at BUFFER_SIZE readings, ready for Chart.js. */
  readingsBuffer: VentilatorReading[];
  /** True while readings are arriving (resets 3 s after the last one). */
  isReceiving: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum readings kept in the buffer for chart display. */
const BUFFER_SIZE = 200;

/**
 * Minimum interval between React state updates.
 * Hardware sends 30-60 msg/s; Chart.js cannot re-render that fast.
 */
const THROTTLE_MS = 100;

/** isReceiving flips to false this many ms after the last reading arrives. */
const RECEIVING_TIMEOUT_MS = 3000;

// =============================================================================
// Hook
// =============================================================================

export function useVentilatorData(): UseVentilatorDataReturn {
  const { socket } = useSocket();

  // Only latestReading and isReceiving live in state — they are the only
  // values that need to trigger re-renders (readingsBuffer is derived from ref).
  const [latestReading, setLatestReading] = useState<VentilatorReading | null>(null);
  const [readingsBuffer, setReadingsBuffer] = useState<VentilatorReading[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);

  /**
   * Primary storage for the rolling buffer.
   * Mutated in-place on every incoming message to avoid creating a new array
   * at 60 Hz; copied into state only when the throttle window expires.
   */
  const bufferRef = useRef<VentilatorReading[]>([]);

  /**
   * Timestamp (ms) of the last time we flushed state from the buffer.
   * Stored in a ref so the event handler captures a stable reference and
   * never triggers the useEffect dependency array.
   */
  const lastFlushRef = useRef<number>(0);

  /**
   * Handle for the timeout that resets isReceiving after inactivity.
   * Cleared and rescheduled on every incoming reading.
   */
  const receivingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleData = (reading: VentilatorReading) => {
      // --- Update rolling buffer (no re-render here) ---
      const buf = bufferRef.current;
      buf.push(reading);
      if (buf.length > BUFFER_SIZE) {
        buf.splice(0, buf.length - BUFFER_SIZE);
      }

      // --- Keep isReceiving true while data flows ---
      setIsReceiving(true);
      if (receivingTimerRef.current !== null) {
        clearTimeout(receivingTimerRef.current);
      }
      receivingTimerRef.current = setTimeout(() => {
        setIsReceiving(false);
        receivingTimerRef.current = null;
      }, RECEIVING_TIMEOUT_MS);

      // --- Throttled state flush ---
      const now = Date.now();
      if (now - lastFlushRef.current >= THROTTLE_MS) {
        lastFlushRef.current = now;
        setLatestReading(reading);
        setReadingsBuffer([...buf]);
      }
    };

    socket.on('ventilator:data', handleData);

    return () => {
      socket.off('ventilator:data', handleData);
      // Cancel the inactivity timer so it cannot fire after unmount.
      if (receivingTimerRef.current !== null) {
        clearTimeout(receivingTimerRef.current);
        receivingTimerRef.current = null;
      }
    };
  }, [socket]);

  return { latestReading, readingsBuffer, isReceiving };
}
