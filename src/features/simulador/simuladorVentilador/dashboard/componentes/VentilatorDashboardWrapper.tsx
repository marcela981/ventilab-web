import { useMemo, useEffect, useRef } from 'react';

import VentilatorDashboard from './VentilatorDashboard';
import { NoSignalBanner } from './NoSignalBanner';
import { useVentilatorData } from '@/features/simulador/conexion/websocket/hooks/useVentilatorData';
import { useChartCalculations } from '@/features/simulador/simuladorVentilador/graficasMonitor/hooks/useChartCalculations';
import { useVentilatorControls } from '@/features/simulador/simuladorVentilador/panelControl/hooks/useVentilatorControls';
import { simulatorApi } from '@/features/simulador/compartido/api/simulator.api';

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

  /**
   * Whether this session is connected to a real physical ventilator.
   * Defaults to false (digital synthetic simulation).
   * Set to true only when coming from a confirmed VentilatorReservation.
   * This value is persisted to SimulatorSession on unmount.
   */
  isRealVentilator?: boolean;
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
  isRealVentilator = false,
}: VentilatorDashboardWrapperProps) {
  const ventilatorData = useVentilatorData();
  const { isStale } = ventilatorData;
  const chartCalculations = useChartCalculations({ data: ventilatorData.data });
  const controls = useVentilatorControls();

  // -------------------------------------------------------------------------
  // Session persistence on unmount
  // Use refs so the cleanup closure always sees the latest data without
  // having to list live state as effect deps (which would re-run the effect).
  // -------------------------------------------------------------------------
  const dataRef = useRef(ventilatorData.data);
  useEffect(() => { dataRef.current = ventilatorData.data; }, [ventilatorData.data]);

  const historyRef = useRef(controls.commandHistory);
  useEffect(() => { historyRef.current = controls.commandHistory; }, [controls.commandHistory]);

  useEffect(() => {
    return () => {
      const readings = dataRef.current;
      const commands = historyRef.current;
      if (readings.length === 0) return; // nothing to save
      simulatorApi.saveSession({
        isRealVentilator,
        parametersLog: commands,
        ventilatorData: readings,
      }).catch((err) => {
        console.error('[VentilatorDashboardWrapper] Session save failed:', err);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run cleanup only on unmount

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
      // integratedVolume: not tracked in WebSocket mode; empty so Chart.js skips it
      integratedVolume: [] as number[],
      // time: millisecond timestamps aligned with chart window (x in seconds → ms)
      time: chartCalculations.pressurePoints.map((p) => Math.round(p.x * 1000)),
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
  return (
    <>
      {isStale && isRealVentilator && <NoSignalBanner />}
      <VentilatorDashboard
        externalVentilatorData={adaptedVentilatorData}
        externalRealTimeData={adaptedRealTimeData}
        externalSystemStatus={adaptedSystemStatus}
        externalSendCommand={controls.sendCommand}
        isRemoteConnection={true}
      />
    </>
  );
}

export default VentilatorDashboardWrapper;
