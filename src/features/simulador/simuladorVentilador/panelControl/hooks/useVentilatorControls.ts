import { useState, useCallback, useRef, useEffect } from 'react';

import { BACKEND_API_URL } from '@/config/env';
import { getAuthToken } from '@/shared/services/authService';
import type {
  VentilatorCommand,
  SendCommandResponse,
} from '@/contracts/simulator.contracts';

// =============================================================================
// Types
// =============================================================================

const MAX_HISTORY = 20;

interface UseVentilatorControlsReturn {
  sendCommand: (command: VentilatorCommand) => Promise<void>;
  isSending: boolean;
  error: Error | null;
  lastCommand: VentilatorCommand | null;
  commandHistory: VentilatorCommand[];
  actions: {
    clearError: () => void;
    clearHistory: () => void;
    retryLast: () => Promise<void>;
  };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Sends ventilator commands to the backend REST endpoint.
 * - Cancels in-flight requests when a new command is issued
 * - Attaches JWT auth header from localStorage
 * - Keeps a capped history of the last 20 commands for retry
 */
export function useVentilatorControls(): UseVentilatorControlsReturn {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastCommand, setLastCommand] = useState<VentilatorCommand | null>(null);
  const [commandHistory, setCommandHistory] = useState<VentilatorCommand[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancel any in-flight request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Core send
  // ---------------------------------------------------------------------------

  const sendCommand = useCallback(async (command: VentilatorCommand): Promise<void> => {
    // Cancel any pending request before issuing a new one
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsSending(true);
    setError(null);

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${BACKEND_API_URL}/simulation/command`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ command }),
        signal: abortControllerRef.current.signal,
      });

      const data: SendCommandResponse = await response.json();

      if (!response.ok || !data.success) {
        const detail = data.errors?.join('; ') ?? data.message ?? 'Failed to send command';
        throw new Error(detail);
      }

      setLastCommand(command);
      setCommandHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), command]);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const wrapped = err instanceof Error ? err : new Error(String(err));
      setError(wrapped);
      throw wrapped;
    } finally {
      setIsSending(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const clearError = useCallback(() => setError(null), []);

  const clearHistory = useCallback(() => {
    setCommandHistory([]);
    setLastCommand(null);
  }, []);

  const retryLast = useCallback(async () => {
    if (lastCommand) {
      await sendCommand(lastCommand);
    }
  }, [lastCommand, sendCommand]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    sendCommand,
    isSending,
    error,
    lastCommand,
    commandHistory,
    actions: { clearError, clearHistory, retryLast },
  };
}
