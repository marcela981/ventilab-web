/**
 * Frontend simulation contracts.
 * Mirrors the types emitted by the backend simulation module over WebSocket.
 * Keep in sync with: ventylab-server/contracts/simulation.contracts.ts
 */

// =============================================================================
// Enums
// =============================================================================

export type VentilatorStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR'
  | 'RESERVED';

export type AlarmSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlarmType =
  | 'HIGH_PRESSURE'
  | 'LOW_PRESSURE'
  | 'HIGH_VOLUME'
  | 'LOW_VOLUME'
  | 'APNEA'
  | 'DISCONNECTION'
  | 'POWER_FAILURE'
  | 'TECHNICAL_FAULT';

// =============================================================================
// Data shapes (match backend broadcast payloads)
// =============================================================================

/** Emitted as `ventilator:data` at 30-60 Hz from the device. */
export interface VentilatorReading {
  /** Airway pressure in cmH₂O */
  pressure: number;
  /** Flow rate in L/min */
  flow: number;
  /** Volume in ml */
  volume: number;
  /** Partial pressure of CO₂ in mmHg (optional sensor) */
  pco2?: number;
  /** SpO₂ percentage (optional sensor) */
  spo2?: number;
  /** Unix epoch in milliseconds */
  timestamp: number;
  /** Device identifier */
  deviceId: string;
}

/** Emitted as `ventilator:alarm` when a threshold is crossed. */
export interface VentilatorAlarm {
  type: AlarmType;
  severity: AlarmSeverity;
  message: string;
  currentValue?: number;
  thresholdValue?: number;
  timestamp: number;
  active: boolean;
  acknowledged: boolean;
}

// =============================================================================
// Commands (REST POST /api/simulation/command)
// =============================================================================

export const VentilationModeValues = {
  VCV: 'VCV',
  PCV: 'PCV',
  SIMV: 'SIMV',
  PSV: 'PSV',
} as const;

export type VentilationMode = (typeof VentilationModeValues)[keyof typeof VentilationModeValues];

/** Command sent to the ventilator via REST. */
export interface VentilatorCommand {
  mode: VentilationMode;
  /** Tidal volume in ml (200–800) */
  tidalVolume: number;
  /** Respiratory rate in breaths/min (5–40) */
  respiratoryRate: number;
  /** PEEP in cmH₂O (0–20) */
  peep: number;
  /** Fraction of inspired O₂ (0.21–1.0) */
  fio2: number;
  pressureLimit?: number;
  inspiratoryTime?: number;
  ieRatio?: string;
  sensitivity?: number;
  flowRate?: number;
  /**
   * Creation timestamp (ms). Optional on the client — the backend sets it
   * when persisting sessions. Do not rely on this field for display logic.
   */
  timestamp?: number;
}

/** Response from POST /api/simulation/command */
export interface SendCommandResponse {
  success: boolean;
  message: string;
  timestamp: number;
  commandId?: string;
  errors?: string[];
}

// =============================================================================
// REST API — request/response shapes
// =============================================================================

/** GET /api/simulation/status → { success, data: GetVentilatorStatusResponse } */
export interface GetVentilatorStatusResponse {
  status: VentilatorStatus;
  deviceId: string;
  isReserved: boolean;
  reservationId?: string;
  currentUser?: string;
  reservationEndsAt?: number;
  lastDataTimestamp?: number;
  activeAlarms: VentilatorAlarm[];
}

/**
 * POST /api/simulation/reserve body.
 * userId is omitted — the backend extracts it from the JWT.
 */
export interface ReserveVentilatorRequest {
  durationMinutes: number;
  purpose?: string;
}

/** POST /api/simulation/reserve response */
export interface ReserveVentilatorResponse {
  success: boolean;
  message: string;
  reservationId?: string;
  startTime?: number;
  endTime?: number;
  currentUser?: string;
}

/**
 * POST /api/simulation/session body — opens a new session record.
 * For simulated patients (isRealVentilator=false), patientData is required.
 * userId is omitted — the backend extracts it from the JWT.
 */
export interface CreateSimulatorSessionRequest {
  isRealVentilator: boolean;
  /** Required when isRealVentilator is false */
  patientData?: {
    demographics?: { age: number; gender: 'M' | 'F'; weight: number; height: number; name?: string };
    condition?: string;
    vitalSigns?: Record<string, number>;
    [key: string]: unknown;
  };
  parametersLog?: VentilatorCommand[];
  ventilatorData?: VentilatorReading[];
  notes?: string;
  clinicalCaseId?: string;
}

/** POST /api/simulation/session response */
export interface CreateSimulatorSessionResponse {
  success: boolean;
  sessionId: string;
  message: string;
  timestamp: number;
}

/**
 * POST /api/simulation/session/save body.
 * userId is omitted — the backend extracts it from the JWT.
 */
export interface SaveSimulatorSessionRequest {
  isRealVentilator: boolean;
  parametersLog: VentilatorCommand[];
  ventilatorData: VentilatorReading[];
  notes?: string;
  clinicalCaseId?: string;
}

/** POST /api/simulation/session/save response */
export interface SaveSimulatorSessionResponse {
  success: boolean;
  sessionId: string;
  message: string;
  timestamp: number;
}

/** Single saved simulator session (GET /api/simulation/sessions) */
export interface SimulatorSession {
  id: string;
  userId: string;
  isRealVentilator: boolean;
  parametersLog: VentilatorCommand[];
  ventilatorData: VentilatorReading[];
  notes: string | null;
  clinicalCaseId: string | null;
  startedAt: string;
  completedAt: string | null;
}

// =============================================================================
// Hook contract
// =============================================================================

export interface UseVentilatorDataReturn {
  /** Rolling buffer of the last N readings */
  data: VentilatorReading[];
  /** Most recent reading, or null if buffer is empty */
  latest: VentilatorReading | null;
  isConnected: boolean;
  error: Error | null;
  status: VentilatorStatus;
  activeAlarms: VentilatorAlarm[];
  actions: {
    clearData: () => void;
    reconnect: () => void;
    acknowledgeAlarm: (alarmId: AlarmType) => void;
  };
}
