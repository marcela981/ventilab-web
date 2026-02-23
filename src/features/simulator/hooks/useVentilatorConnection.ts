import { useState, useCallback, useMemo } from 'react';

import { useRemoteVentilator } from './useRemoteVentilator';
import type { VentilatorReading, VentilatorCommand, VentilatorStatus } from '../simulator.types';

// =============================================================================
// Types
// =============================================================================

export type ConnectionMode = 'local' | 'remote' | 'disconnected';

export interface ConnectionState {
  mode: ConnectionMode;
  isConnected: boolean;
  status: VentilatorStatus;
  error: Error | null;
}

export interface UseVentilatorConnectionProps {
  /** Return value of useSerialConnection (optional — only for local mode) */
  serialConnection?: {
    isConnected: boolean;
    disconnect: () => void | Promise<void>;
    /** serial send; signature differs from VentilatorCommand — adapter required */
    sendConfiguration?: (...args: unknown[]) => void | Promise<unknown>;
  };
  /** Data from the legacy JS hooks (optional — only for local mode) */
  localData?: {
    ventilatorData: { pressure?: number; flow?: number; volume?: number } | null;
    realTimeData: { pressure?: number[]; flow?: number[]; volume?: number[] } | null;
  };
}

export interface UseVentilatorConnectionReturn {
  connectionState: ConnectionState;
  data: { pressure: number; flow: number; volume: number; pco2?: number };
  readings: VentilatorReading[];
  reservation: {
    hasReservation: boolean;
    remainingMinutes: number;
    canRequest: boolean;
  };
  actions: {
    switchToLocal: () => Promise<void>;
    switchToRemote: () => Promise<void>;
    disconnect: () => void;
    requestReservation: (minutes: number, purpose?: string) => Promise<boolean>;
    releaseReservation: () => Promise<void>;
    sendCommand: (command: VentilatorCommand) => Promise<void>;
    checkStatus: () => Promise<void>;
  };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Unified abstraction over local (serial) and remote (WebSocket) data sources.
 * Consumers interact with a single stable interface regardless of the active mode.
 *
 * Destructure `remote.*` before using in dep arrays — the hook object itself is
 * recreated on each render and would invalidate every memo if used directly.
 */
export function useVentilatorConnection({
  serialConnection,
  localData,
}: UseVentilatorConnectionProps = {}): UseVentilatorConnectionReturn {
  const [mode, setMode] = useState<ConnectionMode>('disconnected');

  const remote = useRemoteVentilator();

  // Destructure stable values/callbacks to use in dep arrays
  const {
    isSocketConnected,
    hasReservation,
    ventilatorStatus,
    error: remoteError,
    latest: remoteLatest,
    data: remoteData,
    reservation: remoteReservation,
    connect: remoteConnect,
    disconnect: remoteDisconnect,
    requestReservation: remoteRequestReservation,
    releaseReservation: remoteReleaseReservation,
    sendCommand: remoteSendCommand,
    checkStatus: remoteCheckStatus,
  } = remote;

  // ---------------------------------------------------------------------------
  // Derived state — useMemo with granular deps (no `remote` object)
  // ---------------------------------------------------------------------------

  const connectionState = useMemo<ConnectionState>(() => {
    if (mode === 'remote') {
      return {
        mode: 'remote',
        isConnected: isSocketConnected && hasReservation,
        status: ventilatorStatus,
        error: remoteError,
      };
    }
    if (mode === 'local') {
      return {
        mode: 'local',
        isConnected: serialConnection?.isConnected ?? false,
        status: serialConnection?.isConnected ? 'CONNECTED' : 'DISCONNECTED',
        error: null,
      };
    }
    return { mode: 'disconnected', isConnected: false, status: 'DISCONNECTED', error: null };
  }, [mode, isSocketConnected, hasReservation, ventilatorStatus, remoteError, serialConnection]);

  const data = useMemo(() => {
    if (mode === 'remote' && remoteLatest) {
      return {
        pressure: remoteLatest.pressure,
        flow: remoteLatest.flow,
        volume: remoteLatest.volume,
        pco2: remoteLatest.pco2,
      };
    }
    if (mode === 'local' && localData?.ventilatorData) {
      return {
        pressure: localData.ventilatorData.pressure ?? 0,
        flow: localData.ventilatorData.flow ?? 0,
        volume: localData.ventilatorData.volume ?? 0,
      };
    }
    return { pressure: 0, flow: 0, volume: 0 };
  }, [mode, remoteLatest, localData?.ventilatorData]);

  const readings = useMemo<VentilatorReading[]>(() => {
    if (mode === 'remote') return remoteData;

    if (mode === 'local' && localData?.realTimeData) {
      const { pressure = [], flow = [], volume = [] } = localData.realTimeData;
      const len = Math.min(pressure.length, flow.length, volume.length);
      const now = Date.now();
      return Array.from({ length: len }, (_, i) => ({
        pressure: pressure[i] ?? 0,
        flow: flow[i] ?? 0,
        volume: volume[i] ?? 0,
        timestamp: now - (len - i) * 33, // synthetic timestamps at ~30 Hz
        deviceId: 'local',
      }));
    }
    return [];
  }, [mode, remoteData, localData?.realTimeData]);

  const reservation = useMemo(
    () => ({
      hasReservation: mode === 'remote' && hasReservation,
      remainingMinutes: remoteReservation?.remainingMinutes ?? 0,
      canRequest: mode === 'remote' && !hasReservation && isSocketConnected,
    }),
    [mode, hasReservation, remoteReservation?.remainingMinutes, isSocketConnected]
  );

  // ---------------------------------------------------------------------------
  // Actions — useCallback with granular deps
  // ---------------------------------------------------------------------------

  const switchToLocal = useCallback(async () => {
    if (mode === 'remote' && hasReservation) {
      await remoteReleaseReservation();
    }
    remoteDisconnect();
    setMode('local');
  }, [mode, hasReservation, remoteReleaseReservation, remoteDisconnect]);

  const switchToRemote = useCallback(async () => {
    if (serialConnection?.disconnect) {
      await serialConnection.disconnect();
    }
    setMode('remote');
    await remoteCheckStatus();
  }, [serialConnection, remoteCheckStatus]);

  const disconnect = useCallback(() => {
    remoteDisconnect();
    if (serialConnection?.disconnect) {
      serialConnection.disconnect();
    }
    setMode('disconnected');
  }, [remoteDisconnect, serialConnection]);

  const sendCommand = useCallback(
    async (command: VentilatorCommand) => {
      if (mode === 'remote') {
        await remoteSendCommand(command);
        return;
      }
      if (mode === 'local' && serialConnection?.sendConfiguration) {
        // Serial sendConfiguration(mode, waveType, parameters) has a different
        // signature — adaptation is the caller's responsibility for now.
        await serialConnection.sendConfiguration(command);
      }
    },
    [mode, remoteSendCommand, serialConnection]
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    connectionState,
    data,
    readings,
    reservation,
    actions: {
      switchToLocal,
      switchToRemote,
      disconnect,
      requestReservation: remoteRequestReservation,
      releaseReservation: remoteReleaseReservation,
      sendCommand,
      checkStatus: remoteCheckStatus,
    },
  };
}
