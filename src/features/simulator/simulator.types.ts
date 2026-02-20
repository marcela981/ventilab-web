/**
 * Core TypeScript interfaces for the ventilator simulator module.
 */

// --- Ventilator Data (the main state object) ---

export interface VentilatorData {
  pressure: number;
  flow: number;
  volume: number;
  fio2: number;
  volumen: number;
  qMax: number;
  peep: number;
  frecuencia: number;
  presionMax: number;
  volumenObjetivo: number;
  relacionIE1: number;
  relacionIE2: number;
  pausaInspiratoria: number;
  pausaEspiratoria: number;
  inspiracionEspiracion: number;
  tiempoInspiratorio: number;
  tiempoEspiratorio: number;
  presionTanque: number;
  relacionTexto: string;
}

export const DEFAULT_VENTILATOR_DATA: VentilatorData = {
  pressure: 0,
  flow: 0,
  volume: 0,
  fio2: 21,
  volumen: 500,
  qMax: 60,
  peep: 5,
  frecuencia: 12,
  presionMax: 20,
  volumenObjetivo: 500,
  relacionIE1: 1,
  relacionIE2: 2,
  pausaInspiratoria: 0.1,
  pausaEspiratoria: 0.1,
  inspiracionEspiracion: 0.5,
  tiempoInspiratorio: 2.5,
  tiempoEspiratorio: 2.5,
  presionTanque: 0,
  relacionTexto: 'Relación 1:2 [s]',
};

// --- Real-Time Data (chart arrays) ---

export interface RealTimeData {
  pressure: number[];
  flow: number[];
  volume: number[];
  integratedVolume: number[];
  time: number[];
}

export const EMPTY_REAL_TIME_DATA: RealTimeData = {
  pressure: [],
  flow: [],
  volume: [],
  integratedVolume: [],
  time: [],
};

// --- Max/Min Data (per 100 samples) ---

export interface MaxMinData {
  pressureMax: number;
  pressureMin: number;
  flowMax: number;
  flowMin: number;
  volumeMax: number;
  pressureAvg: number;
}

// --- System Status ---

export interface SystemStatus {
  lastMessage: string;
  connectionState: 'connected' | 'disconnected';
  lastError: {
    code: string;
    description: string;
    severity: string;
    timestamp: number;
  } | null;
  lastAck: {
    code: string;
    message: string;
    timestamp: number;
  } | null;
  configConfirmed: boolean;
}

// --- Compliance ---

export interface ComplianceAdjustment {
  oldCompliance?: number;
  newCompliance: number;
  averagePressure?: number;
  averagePEEP?: number;
  averageVolume?: number;
  error?: number;
  manual?: boolean;
  timestamp: Date;
}

export interface ComplianceCalculationStatus {
  isCalculating: boolean;
  currentCycle: number;
  totalCycles: number;
  lastError: number | null;
  lastAdjustment: ComplianceAdjustment | null;
  requiresRecalculation: boolean;
}

export interface ComplianceResult {
  compliance: number;
  calculationStatus: ComplianceCalculationStatus;
  resetComplianceCalculation: () => void;
  setComplianceManually: (value: number) => void;
  registerUpdateCallback: (cb: ComplianceUpdateCallback) => void;
  calculateParametersWithCompliance: (
    params: Partial<VentilatorData>,
    compliance?: number
  ) => { volumen: number; qMax: number; presionTanque: number; compliance: number };
  markRecalculationProcessed: () => void;
  debug: {
    cycleCount: number;
    sampleCount: number;
    pipArray: number[];
    peepArray: number[];
    volumeArray: number[];
  };
}

export type ComplianceUpdateCallback = (
  newCompliance: number,
  data: { averagePressure: number; averagePEEP: number; averageVolume: number; error: number }
) => void;

// --- Error Detection ---

export type ErrorSeverity = 'high' | 'medium';

export interface DetectedError {
  type: 'PIP_ERROR' | 'PEEP_ERROR' | 'VOLUME_ERROR' | 'FLOW_ERROR' | 'COMPLIANCE_WARNING';
  message: string;
  severity: ErrorSeverity;
  suggestedAdjustment: number | null;
  currentValue: number;
  targetValue: number;
  errorPercentage?: number;
  adjustmentReason: string;
}

export interface AdjustmentRecord {
  type: string;
  oldValue: number;
  newValue: number;
  reason: string;
  timestamp: Date;
  id: number;
}

export interface ErrorDetectionResult {
  errors: DetectedError[];
  hasErrors: boolean;
  hasHighSeverityErrors: boolean;
  adjustmentHistory: AdjustmentRecord[];
  applyAdjustment: (error: DetectedError, onParameterChange: (param: string, value: number) => void) => void;
  getHighSeverityErrors: () => DetectedError[];
  getAdjustmentSummary: () => Record<string, {
    current: number;
    suggested: number;
    error: number;
    reason: string;
  }>;
  suggestedAdjustments: number[];
  errorSummary: {
    total: number;
    high: number;
    medium: number;
    compliance: number;
  };
}

// --- Filtered Signal Data ---

export interface FilteredSignalData {
  pressure: { max: number; min: number; avg: number; filtered: number };
  flow: { max: number; min: number; avg: number; filtered: number };
  volume: { max: number; min: number; avg: number; filtered: number };
}

// --- Card Config ---

export interface CardConfigItem {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface CardDisplayData {
  id: string;
  label: string;
  value: string;
  unit: string;
  rawValue: number;
  isConfigured: boolean;
  config: CardConfigItem;
  onReset?: () => void;
  status?: ComplianceCalculationStatus;
  errors?: DetectedError[];
}

// --- Notification ---

export interface Notification {
  type: 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

// --- Ventilation Mode ---

export type VentilationMode = 'volume' | 'pressure';

// --- Data Source ---

export type DataSource = 'real' | 'simulated';
