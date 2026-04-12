// Barrel export for simuladorVentilador sub-module
export { default as VentilatorDashboard } from './dashboard/componentes/VentilatorDashboard';
export { default as VentilatorDashboardWrapper } from './dashboard/componentes/VentilatorDashboardWrapper';
export { default as AIAnalysisPanel } from './IAMonitor/componentes/AIAnalysisPanel';
export { useAIAnalysis } from './IAMonitor/hooks/useAIAnalysis';
export { useComplianceCalculation } from './graficasMonitor/hooks/useComplianceCalculation';
export { useSignalProcessing } from './graficasMonitor/hooks/useSignalProcessing';
export { useErrorDetection } from './panelControl/hooks/useErrorDetection';
export { useVentilatorControls } from './panelControl/hooks/useVentilatorControls';
export { useParameterValidation } from './panelControl/hooks/useParameterValidation';
export { useCardConfig } from './dashboard/hooks/useCardConfig';
export { default as useDashboardState } from './dashboard/hooks/useDashboardState';
