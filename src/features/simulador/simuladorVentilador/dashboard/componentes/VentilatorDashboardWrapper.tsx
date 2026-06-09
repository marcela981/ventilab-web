import { useEffect, useRef } from 'react';

import VentilatorDashboard from './VentilatorDashboard';
import { NoSignalBanner } from './NoSignalBanner';
import {
  useVentilatorStale,
  useBindVentilatorStream,
} from '@/features/simulador/conexion/websocket/hooks/useVentilatorData';
import { getSnapshot } from '@/features/simulador/conexion/websocket/stream/ventilatorStreamStore';
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
// Banner de "sin señal" (sólo ventilador real)
// =============================================================================

/**
 * Aísla la suscripción a `isStale` en un componente propio para que SÓLO exista
 * cuando hay un ventilador real. Así, en el modo simulado/enseñanza el wrapper no
 * mantiene consumidores del store y el stream (y el bucle de flush) se pausa al
 * salir de la tab Monitoreo.
 */
function NoSignalGate() {
  const isStale = useVentilatorStale();
  return isStale ? <NoSignalBanner /> : null;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Puente entre la capa de datos WebSocket y el dashboard del ventilador.
 *
 * En modo 'serial' renderiza el dashboard legacy sin tocar.
 *
 * En modo 'websocket' enlaza el stream UNA sola vez (useBindVentilatorStream) y
 * consume sólo `isStale` (selector ligero) para el banner de "sin señal". Las
 * curvas y tarjetas obtienen los datos directamente del store (ChartsColumn /
 * MonitoringTab), por lo que el wrapper NO recibe ni propaga datos en vivo: así
 * el dashboard deja de re-renderizarse a la cadencia del stream (desacople
 * ingesta → render). La persistencia de sesión lee el buffer del store al
 * desmontar, sin suscribirse por muestra.
 */
export function VentilatorDashboardWrapper({
  connectionMode = 'websocket',
  isRealVentilator = false,
}: VentilatorDashboardWrapperProps) {
  // Enlaza el socket del contexto al store (no-op en modo serial más abajo).
  // bindSocket NO registra un consumidor del store: el bucle de flush sólo corre
  // cuando hay componentes suscritos (tab Monitoreo).
  useBindVentilatorStream();
  const controls = useVentilatorControls();

  // -------------------------------------------------------------------------
  // Persistencia de sesión al desmontar.
  // Refs para que el cleanup vea el último valor sin re-ejecutar el efecto.
  // Las lecturas se leen del store en el momento del desmontaje (no se rastrean
  // por muestra, evitando renders del wrapper).
  // -------------------------------------------------------------------------
  const historyRef = useRef(controls.commandHistory);
  useEffect(() => { historyRef.current = controls.commandHistory; }, [controls.commandHistory]);

  useEffect(() => {
    return () => {
      const readings = getSnapshot().data;
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

  // Serial mode: render the unmodified legacy dashboard
  if (connectionMode === 'serial') {
    return <VentilatorDashboard />;
  }

  return (
    <>
      {isRealVentilator && <NoSignalGate />}
      <VentilatorDashboard />
    </>
  );
}

export default VentilatorDashboardWrapper;
