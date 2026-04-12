/**
 * VENTYLAB - SIMULATOR MODULE CONTRACTS (Frontend)
 * Frontend contracts for ventilator simulator UI
 */

import {
  VentilatorCommand,
  VentilatorReading,
  VentilatorAlarm,
  VentilatorStatus,
  VentilationMode,
  AlarmSeverity,
} from '../../../ventylab-server/src/contracts/simulation.contracts';

// Re-export backend types for convenience
export {
  VentilatorCommand,
  VentilatorReading,
  VentilatorAlarm,
  VentilatorStatus,
  VentilationMode,
  AlarmSeverity,
};

// ============================================================================
// CHART DATA TYPES
// ============================================================================

/**
 * Single data point for charts
 */
export interface ChartDataPoint {
  /** Time in seconds (relative to start) */
  x: number;
  
  /** Value */
  y: number;
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  /** Chart color */
  color: string;
  
  /** Chart label */
  label: string;
  
  /** Unit of measurement */
  unit: string;
  
  /** Minimum value for Y axis */
  min: number;
  
  /** Maximum value for Y axis */
  max: number;
  
  /** Whether to show grid lines */
  showGrid?: boolean;
  
  /** Whether to animate transitions */
  animate?: boolean;
}

/**
 * Time range for charts
 */
export interface ChartTimeRange {
  /** Start time in seconds */
  start: number;
  
  /** End time in seconds */
  end: number;
  
  /** Duration in seconds */
  duration: number;
}

/**
 * Chart dataset
 */
export interface ChartDataset {
  /** Dataset label */
  label: string;
  
  /** Data points */
  data: ChartDataPoint[];
  
  /** Line color */
  borderColor: string;
  
  /** Fill color */
  backgroundColor?: string;
  
  /** Line width */
  borderWidth?: number;
  
  /** Whether to fill area under line */
  fill?: boolean;
  
  /** Tension for curved lines */
  tension?: number;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useVentilatorData hook
 * Manages WebSocket connection and real-time data buffering
 */
export interface UseVentilatorDataReturn {
  /** Array of ventilator readings (buffer) */
  data: VentilatorReading[];
  
  /** Latest reading */
  latest: VentilatorReading | null;
  
  /** Whether WebSocket is connected */
  isConnected: boolean;
  
  /** Connection error */
  error: Error | null;
  
  /** Current ventilator status */
  status: VentilatorStatus;
  
  /** Active alarms */
  activeAlarms: VentilatorAlarm[];
  
  /** Actions */
  actions: {
    /** Clear data buffer */
    clearData: () => void;
    
    /** Manually reconnect */
    reconnect: () => void;
    
    /** Acknowledge alarm */
    acknowledgeAlarm: (alarmId: string) => void;
  };
}

/**
 * Return type for useChartCalculations hook
 * Processes raw data into chart-ready format
 */
export interface UseChartCalculationsReturn {
  /** Pressure chart data points */
  pressurePoints: ChartDataPoint[];
  
  /** Flow chart data points */
  flowPoints: ChartDataPoint[];
  
  /** Volume chart data points */
  volumePoints: ChartDataPoint[];
  
  /** PCO2 chart data points (if available) */
  pco2Points: ChartDataPoint[];
  
  /** Time range being displayed */
  timeRange: ChartTimeRange;
  
  /** Whether data is being calculated */
  isCalculating: boolean;
  
  /** Actions */
  actions: {
    /** Set time window duration */
    setTimeWindow: (seconds: number) => void;
    
    /** Zoom in */
    zoomIn: () => void;
    
    /** Zoom out */
    zoomOut: () => void;
    
    /** Reset zoom */
    resetZoom: () => void;
  };
}

/**
 * Return type for useVentilatorControls hook
 * Manages sending commands to ventilator
 */
export interface UseVentilatorControlsReturn {
  /** Send command to ventilator */
  sendCommand: (command: VentilatorCommand) => Promise<void>;
  
  /** Whether command is being sent */
  isSending: boolean;
  
  /** Send error */
  error: Error | null;
  
  /** Last sent command */
  lastCommand: VentilatorCommand | null;
  
  /** Command history */
  commandHistory: VentilatorCommand[];
  
  /** Actions */
  actions: {
    /** Clear error */
    clearError: () => void;
    
    /** Clear command history */
    clearHistory: () => void;
    
    /** Retry last command */
    retryLast: () => Promise<void>;
  };
}

/**
 * Return type for useVentilatorReservation hook
 * Manages ventilator reservation
 */
export interface UseVentilatorReservationReturn {
  /** Whether ventilator is reserved */
  isReserved: boolean;
  
  /** Whether current user has reservation */
  hasReservation: boolean;
  
  /** Reservation end time */
  reservationEndsAt: number | null;
  
  /** Current user (if reserved by someone else) */
  currentUser: string | null;
  
  /** Reserve ventilator */
  reserve: (durationMinutes: number) => Promise<void>;
  
  /** Release reservation */
  release: () => Promise<void>;
  
  /** Whether reservation operation is in progress */
  isLoading: boolean;
  
  /** Reservation error */
  error: Error | null;
}

/**
 * Return type for useSimulatorSession hook
 * Manages simulator session state
 */
export interface UseSimulatorSessionReturn {
  /** Session ID */
  sessionId: string | null;
  
  /** Whether session is active */
  isActive: boolean;
  
  /** Whether using real ventilator */
  isRealVentilator: boolean;
  
  /** Session start time */
  startedAt: number | null;
  
  /** Session duration in minutes */
  duration: number;
  
  /** Start new session */
  startSession: (isRealVentilator: boolean) => Promise<void>;
  
  /** End session */
  endSession: () => Promise<void>;
  
  /** Save session */
  saveSession: (notes?: string) => Promise<void>;
  
  /** Whether operation is in progress */
  isLoading: boolean;
  
  /** Error */
  error: Error | null;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for VentilatorDashboard component
 */
export interface VentilatorDashboardProps {
  /** Whether using real ventilator */
  isRealVentilator?: boolean;
  
  /** Clinical case ID (if applicable) */
  clinicalCaseId?: string;
  
  /** Callback when session ends */
  onSessionEnd?: () => void;
  
  /** Whether to show controls */
  showControls?: boolean;
  
  /** Whether to show reservation panel */
  showReservation?: boolean;
}

/**
 * Props for ControlPanel component
 */
export interface ControlPanelProps {
  /** Current command state */
  currentCommand: VentilatorCommand;
  
  /** Callback when command changes */
  onCommandChange: (command: VentilatorCommand) => void;
  
  /** Callback when command is submitted */
  onCommandSubmit: (command: VentilatorCommand) => void;
  
  /** Whether controls are disabled */
  disabled?: boolean;
  
  /** Whether send button is loading */
  isLoading?: boolean;
}

/**
 * Props for ChartComponent
 */
export interface ChartComponentProps {
  /** Chart data points */
  data: ChartDataPoint[];
  
  /** Chart configuration */
  config: ChartConfig;
  
  /** Chart height in pixels */
  height?: number;
  
  /** Chart width in pixels */
  width?: number;
  
  /** Whether to show legend */
  showLegend?: boolean;
  
  /** Whether to show tooltips */
  showTooltips?: boolean;
}

/**
 * Props for ChartsGrid component
 */
export interface ChartsGridProps {
  /** Pressure data points */
  pressureData: ChartDataPoint[];
  
  /** Flow data points */
  flowData: ChartDataPoint[];
  
  /** Volume data points */
  volumeData: ChartDataPoint[];
  
  /** PCO2 data points (optional) */
  pco2Data?: ChartDataPoint[];
  
  /** Grid layout */
  layout?: '2x2' | '1x3' | '1x4';
  
  /** Chart height */
  chartHeight?: number;
}

/**
 * Props for AlarmPanel component
 */
export interface AlarmPanelProps {
  /** Active alarms */
  alarms: VentilatorAlarm[];
  
  /** Callback when alarm is acknowledged */
  onAcknowledge: (alarmId: string) => void;
  
  /** Whether panel is compact */
  compact?: boolean;
  
  /** Maximum alarms to show */
  maxAlarms?: number;
}

/**
 * Props for StatusIndicator component
 */
export interface StatusIndicatorProps {
  /** Ventilator status */
  status: VentilatorStatus;
  
  /** Whether connection is active */
  isConnected: boolean;
  
  /** Whether reserved */
  isReserved?: boolean;
  
  /** Show detailed info */
  showDetails?: boolean;
}

/**
 * Props for ParameterInput component
 */
export interface ParameterInputProps {
  /** Parameter label */
  label: string;
  
  /** Current value */
  value: number;
  
  /** Callback when value changes */
  onChange: (value: number) => void;
  
  /** Minimum value */
  min: number;
  
  /** Maximum value */
  max: number;
  
  /** Step size */
  step?: number;
  
  /** Unit of measurement */
  unit: string;
  
  /** Whether input is disabled */
  disabled?: boolean;
  
  /** Helper text */
  helperText?: string;
  
  /** Error message */
  error?: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Simulator UI state
 */
export interface SimulatorUIState {
  /** Whether sidebar is open */
  sidebarOpen: boolean;
  
  /** Active tab */
  activeTab: 'controls' | 'alarms' | 'history' | 'settings';
  
  /** Chart time window (seconds) */
  chartTimeWindow: number;
  
  /** Chart zoom level */
  chartZoom: number;
  
  /** Whether charts are paused */
  chartsPaused: boolean;
  
  /** Selected chart view */
  chartView: 'grid' | 'stacked' | 'single';
  
  /** Theme */
  theme: 'light' | 'dark';
}

/**
 * Simulator preferences
 */
export interface SimulatorPreferences {
  /** Default time window (seconds) */
  defaultTimeWindow: number;
  
  /** Auto-save interval (minutes) */
  autoSaveInterval: number;
  
  /** Show notifications */
  showNotifications: boolean;
  
  /** Sound alerts */
  soundAlerts: boolean;
  
  /** Chart animation */
  chartAnimation: boolean;
  
  /** Data decimation (reduce points for performance) */
  dataDecimation: boolean;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validation result for ventilator command
 */
export interface CommandValidation {
  /** Whether command is valid */
  isValid: boolean;
  
  /** Validation errors by parameter */
  errors: {
    [key: string]: string;
  };
  
  /** Warnings (non-blocking) */
  warnings: {
    [key: string]: string;
  };
}

/**
 * Parameter validation rule
 */
export interface ParameterValidationRule {
  /** Parameter name */
  name: keyof VentilatorCommand;
  
  /** Minimum value */
  min: number;
  
  /** Maximum value */
  max: number;
  
  /** Required */
  required: boolean;
  
  /** Custom validator */
  validator?: (value: any, command: VentilatorCommand) => boolean;
  
  /** Error message */
  errorMessage: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Chart configurations for different measurements
 */
export const CHART_CONFIGS: Record<string, ChartConfig> = {
  PRESSURE: {
    color: '#3b82f6',
    label: 'Presión',
    unit: 'cmH₂O',
    min: 0,
    max: 50,
    showGrid: true,
    animate: true,
  },
  FLOW: {
    color: '#10b981',
    label: 'Flujo',
    unit: 'L/min',
    min: -100,
    max: 100,
    showGrid: true,
    animate: true,
  },
  VOLUME: {
    color: '#f59e0b',
    label: 'Volumen',
    unit: 'ml',
    min: 0,
    max: 1000,
    showGrid: true,
    animate: true,
  },
  PCO2: {
    color: '#ef4444',
    label: 'PCO₂',
    unit: 'mmHg',
    min: 0,
    max: 100,
    showGrid: true,
    animate: true,
  },
} as const;

/**
 * Default chart time windows (seconds)
 */
export const TIME_WINDOWS = {
  SHORT: 10,
  MEDIUM: 30,
  LONG: 60,
  EXTENDED: 120,
} as const;

/**
 * Data buffer size (number of readings to keep)
 */
export const DATA_BUFFER_SIZE = 1000;

/**
 * Update frequency (milliseconds)
 */
export const UPDATE_FREQUENCY = 33; // ~30 FPS
