// =============================================================================
// Hooks
// =============================================================================

export { useVentilatorData } from './hooks/useVentilatorData';
export { useChartCalculations } from './hooks/useChartCalculations';
export type { ChartDataPoint, ChartTimeRange } from './hooks/useChartCalculations';
export { useVentilatorControls } from './hooks/useVentilatorControls';

// =============================================================================
// API
// =============================================================================

export { simulatorApi } from './simulator.api';

// =============================================================================
// Types
// Includes: VentilatorData, RealTimeData, MaxMinData, SystemStatus, Compliance*,
// Error*, FilteredSignalData, CardConfig*, Notification, VentilationMode (legacy),
// DataSource, ChartConfig, CHART_CONFIGS, ControlPanelState, SAFE_RANGES,
// and re-exports from @/contracts/simulator.contracts:
//   VentilatorReading, VentilatorCommand, VentilatorAlarm, VentilatorStatus,
//   AlarmType, AlarmSeverity
// =============================================================================

export * from './simulator.types';

// =============================================================================
// Components
// =============================================================================

export { VentilatorDashboardWrapper, default as VentilatorDashboardWrapperDefault } from './VentilatorDashboardWrapper';
export { default as VentilatorDashboard } from './components/VentilatorDashboard';
