import { BACKEND_API_URL } from '@/config/env';
import { getAuthToken } from '@/shared/services/authService';
import type {
  GetVentilatorStatusResponse,
  ReserveVentilatorRequest,
  ReserveVentilatorResponse,
  SaveSimulatorSessionRequest,
  SaveSimulatorSessionResponse,
  SimulatorSession,
} from '@/contracts/simulator.contracts';

// =============================================================================
// Internal fetch helper
// =============================================================================

/**
 * Thin wrapper around fetch that:
 * - Attaches JSON Content-Type and Bearer auth token
 * - Throws on non-2xx responses with the backend's message field
 * - Returns the raw parsed JSON (callers handle envelope unwrapping)
 */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options?.headers,
    },
  });

  // Parse JSON regardless of status (backend always returns JSON)
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? `HTTP ${response.status}`);
  }

  return data as T;
}

// =============================================================================
// Simulator API
// =============================================================================

export const simulatorApi = {
  /**
   * GET /api/simulation/status
   * Controller wraps result: { success, data: GetVentilatorStatusResponse }
   */
  getStatus: async (deviceId?: string): Promise<GetVentilatorStatusResponse> => {
    const qs = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : '';
    const envelope = await fetchApi<{ success: boolean; data: GetVentilatorStatusResponse }>(
      `/simulation/status${qs}`
    );
    return envelope.data;
  },

  /**
   * POST /api/simulation/reserve
   * Body: { durationMinutes, purpose? } — userId comes from JWT
   * Returns 409 when already reserved (backend sets success:false).
   */
  reserve: async (request: ReserveVentilatorRequest): Promise<ReserveVentilatorResponse> => {
    return fetchApi<ReserveVentilatorResponse>('/simulation/reserve', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * DELETE /api/simulation/reserve
   * Returns { success, message }.
   */
  release: async (): Promise<{ success: boolean; message: string }> => {
    return fetchApi('/simulation/reserve', { method: 'DELETE' });
  },

  /**
   * POST /api/simulation/session/save
   * Body: SaveSimulatorSessionRequest (minus userId).
   * Returns 201 on success.
   */
  saveSession: async (
    request: SaveSimulatorSessionRequest
  ): Promise<SaveSimulatorSessionResponse> => {
    return fetchApi<SaveSimulatorSessionResponse>('/simulation/session/save', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * GET /api/simulation/sessions
   * Controller wraps result: { success, data: SimulatorSession[], count }
   */
  getSessions: async (
    limit?: number
  ): Promise<{ sessions: SimulatorSession[]; total: number }> => {
    const qs = limit !== undefined ? `?limit=${limit}` : '';
    const envelope = await fetchApi<{
      success: boolean;
      data: SimulatorSession[];
      count: number;
    }>(`/simulation/sessions${qs}`);
    return { sessions: envelope.data, total: envelope.count };
  },
};
