/**
 * Centralized ventilator parameter limits and constants.
 * Single source of truth for medical parameter ranges.
 */

// --- Default compliance value (L/cmH2O) ---
export const DEFAULT_COMPLIANCE = 0.02051;
export const COMPLIANCE_RANGE = { min: 0.01, max: 0.2 } as const;
export const COMPLIANCE_NORMAL_RANGE = { min: 0.015, max: 0.15 } as const;

// --- Error detection ---
export const ERROR_THRESHOLD_PERCENT = 5;
export const HIGH_SEVERITY_THRESHOLD_PIP = 10;
export const HIGH_SEVERITY_THRESHOLD_VOLUME = 15;
export const HIGH_SEVERITY_THRESHOLD_FLOW = 15;

// --- Cycle-based compliance calculation ---
export const SAMPLES_PER_CYCLE = 100;
export const CYCLES_FOR_COMPLIANCE = 5;
export const CYCLES_TO_SKIP = 2; // First 2 cycles are always elevated

// --- Real-time data buffer ---
export const RT_BUFFER_SIZE = 700;

// --- Parameter value ranges for color coding ---
export interface ParameterRange {
  normal: [number, number];
  warning: [number, number];
  danger: [number, number];
}

export const VALUE_COLOR_RANGES: Record<string, ParameterRange> = {
  presionPico: { normal: [8, 30], warning: [30, 40], danger: [40, Infinity] },
  presionMedia: { normal: [4, 15], warning: [15, 25], danger: [25, Infinity] },
  peep: { normal: [3, 15], warning: [15, 20], danger: [20, Infinity] },
  flujoMax: { normal: [30, 100], warning: [100, 150], danger: [150, Infinity] },
  flujo: { normal: [-20, 80], warning: [80, 120], danger: [120, Infinity] },
  flujoMin: { normal: [-60, 0], warning: [-80, -60], danger: [-Infinity, -80] },
  volMax: { normal: [400, 900], warning: [900, 1200], danger: [1200, Infinity] },
  volumen: { normal: [300, 800], warning: [800, 1000], danger: [1000, Infinity] },
  volumenIntegrado: { normal: [0, 1000], warning: [1000, 1500], danger: [1500, Infinity] },
  compliance: { normal: [0.02, 0.1], warning: [0.01, 0.02], danger: [0, 0.01] },
  presionMeseta: { normal: [10, 25], warning: [25, 35], danger: [35, Infinity] },
};

// --- Parameter trend ranges ---
export const TREND_RANGES: Record<string, { normal: [number, number] }> = {
  presionPico: { normal: [10, 35] },
  presionMedia: { normal: [5, 20] },
  peep: { normal: [3, 12] },
  flujoMax: { normal: [20, 80] },
  flujo: { normal: [10, 60] },
  flujoMin: { normal: [-10, 10] },
  volMax: { normal: [300, 800] },
  volumen: { normal: [200, 600] },
  volumenIntegrado: { normal: [0, 800] },
};

// --- Parameter safe ranges (for validation) ---
export const PARAMETER_SAFE_RANGES = {
  frecuencia: { min: 5, max: 60, unit: 'resp/min', safe: [8, 35] as const },
  volumen: { min: 50, max: 2000, unit: 'ml', safe: [200, 1000] as const },
  presionMax: { min: 5, max: 60, unit: 'cmH2O', safe: [10, 35] as const },
  peep: { min: 0, max: 20, unit: 'cmH2O', safe: [3, 15] as const },
  fio2: { min: 21, max: 100, unit: '%', safe: [21, 80] as const },
  tiempoInspiratorio: { min: 0.2, max: 3.0, unit: 's', safe: [0.3, 2.0] as const },
  tiempoEspiratorio: { min: 0.2, max: 10.0, unit: 's', safe: [0.5, 5.0] as const },
  inspiracionEspiracion: { min: 0, max: 1, unit: '', safe: [0.3, 0.7] as const },
} as const;

// --- Adjustment limits (for auto-correction) ---
export const ADJUSTMENT_LIMITS = {
  pip: { min: 5, max: 50 },
  volume: { min: 100, max: 2000 },
  flow: { min: 10, max: 150 },
} as const;

// --- Default card configuration ---
export const DEFAULT_CARD_CONFIG = [
  { id: 'presionPico', label: 'Presión Pico', visible: true, order: 0 },
  { id: 'presionMedia', label: 'Presión Media', visible: true, order: 1 },
  { id: 'peep', label: 'PEEP', visible: true, order: 2 },
  { id: 'flujoMax', label: 'Flujo Max', visible: true, order: 3 },
  { id: 'flujo', label: 'Flujo', visible: true, order: 4 },
  { id: 'flujoMin', label: 'Flujo Min', visible: true, order: 5 },
  { id: 'volMax', label: 'Vol Max', visible: true, order: 6 },
  { id: 'volumen', label: 'Volumen', visible: true, order: 7 },
  { id: 'volumenIntegrado', label: 'Vol Integrado', visible: true, order: 8 },
  { id: 'compliance', label: 'Compliance', visible: false, order: 9 },
  { id: 'presionMeseta', label: 'Presión Meseta', visible: false, order: 10 },
  { id: 'presionPlaton', label: 'Presión Platón', visible: false, order: 11 },
] as const;

// --- Unit labels for parameter export ---
export const PARAMETER_UNITS: Record<string, string> = {
  fio2: '%',
  volumen: 'mL',
  presionMax: 'cmH₂O',
  peep: 'cmH₂O',
  qMax: 'L/min',
  frecuencia: 'resp/min',
  tiempoInspiratorio: 's',
  tiempoEspiratorio: 's',
};

// --- Color constants ---
export const COLORS = {
  normal: '#4caf50',
  warning: '#ff9800',
  danger: '#f44336',
  neutral: '#76c7c0',
  configured: '#4caf50',
} as const;

/**
 * Get the display color for a parameter value based on its range.
 * Compliance has inverted logic (low values are dangerous).
 */
export function getValueColor(id: string, value: number): string {
  const range = VALUE_COLOR_RANGES[id];
  if (!range) return COLORS.neutral;

  if (id === 'compliance') {
    if (value <= range.danger[1]) return COLORS.danger;
    if (value <= range.warning[1]) return COLORS.warning;
    if (value <= range.normal[1]) return COLORS.normal;
    return COLORS.neutral;
  }

  if (value >= range.danger[0] && (range.danger[1] === Infinity || value <= range.danger[1])) return COLORS.danger;
  if (value >= range.warning[0] && value <= range.warning[1]) return COLORS.warning;
  if (value >= range.normal[0] && value <= range.normal[1]) return COLORS.normal;
  return COLORS.neutral;
}

/**
 * Get the trend direction for a parameter value.
 */
export function getTrend(id: string, value: number): 'increasing' | 'decreasing' | 'stable' {
  const range = TREND_RANGES[id];
  if (!range) return 'stable';

  if (value > range.normal[1]) return 'increasing';
  if (value < range.normal[0]) return 'decreasing';
  return 'stable';
}
