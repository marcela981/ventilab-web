import { useMemo } from 'react';

import VentilatorDashboard from './components/VentilatorDashboard';
import { useVentilatorData } from './hooks/useVentilatorData';
import { useChartCalculations } from './hooks/useChartCalculations';
import { useVentilatorControls } from './hooks/useVentilatorControls';

// =============================================================================
// Types
// =============================================================================

interface VentilatorDashboardWrapperProps {
  /**
   * 'websocket' — real ventilator via WebSocket (data from useVentilatorData).
   * 'serial'    — local physical connection via the legacy serialConnection hooks.
   * Defaults to 'websocket'.
   */
  connectionMode?: 'websocket' | 'serial';
}

// =============================================================================
// Component
// =============================================================================

/**
 * Bridge between the WebSocket data layer and the existing VentilatorDashboard UI.
 *
 * In 'serial' mode the original dashboard renders untouched.
 *
 * In 'websocket' mode the three TS hooks run and their adapted output is passed
 * as optional props.  VentilatorDashboard currently ignores unknown props — the
 * next step is to update it to consume:
 *   externalVentilatorData, externalRealTimeData, externalSystemStatus,
 *   externalSendCommand, isRemoteConnection
 */
export function VentilatorDashboardWrapper({
  connectionMode = 'websocket',
}: VentilatorDashboardWrapperProps) {
  const ventilatorData = useVentilatorData();
  const chartCalculations = useChartCalculations({ data: ventilatorData.data });
  const controls = useVentilatorControls();

  // Adapt WebSocket data to the shape the legacy dashboard expects
  const adaptedVentilatorData = useMemo(
    () => ({
      pressure: ventilatorData.latest?.pressure ?? 0,
      flow: ventilatorData.latest?.flow ?? 0,
      volume: ventilatorData.latest?.volume ?? 0,
    }),
    [ventilatorData.latest]
  );

  const adaptedRealTimeData = useMemo(
    () => ({
      pressure: chartCalculations.pressurePoints.map((p) => p.y),
      flow: chartCalculations.flowPoints.map((p) => p.y),
      volume: chartCalculations.volumePoints.map((p) => p.y),
    }),
    [chartCalculations.pressurePoints, chartCalculations.flowPoints, chartCalculations.volumePoints]
  );

  const adaptedSystemStatus = useMemo(
    () => ({
      connectionState: ventilatorData.isConnected ? 'connected' : 'disconnected',
      lastError: ventilatorData.error?.message ?? null,
    }),
    [ventilatorData.isConnected, ventilatorData.error]
  );

  // Serial mode: render the unmodified legacy dashboard
  if (connectionMode === 'serial') {
    return <VentilatorDashboard />;
  }

  // WebSocket mode: pass adapted data as future-compatible props.
  // VentilatorDashboard currently ignores these props until it is updated
  // to consume them (the hooks above are already running and data is ready).
  return (
    <VentilatorDashboard
      externalVentilatorData={adaptedVentilatorData}
      externalRealTimeData={adaptedRealTimeData}
      externalSystemStatus={adaptedSystemStatus}
      externalSendCommand={controls.sendCommand}
      isRemoteConnection={true}
    />
  );
}

export default VentilatorDashboardWrapper;
