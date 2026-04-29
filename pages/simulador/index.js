/*
 * Funcionalidad: SimuladorPage
 * Descripción: Página principal del simulador de ventilador. Orquesta ConnectionPanel
 *   (estado de conexión/reserva) y VentilatorDashboardWrapper (datos en tiempo real).
 *   useVentilatorConnection provee el estado unificado de conexión al árbol.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React from 'react';
import { LearningProgressProvider } from '@/features/progress/LearningProgressContext';
import { useVentilatorConnection } from '@/features/simulador/conexion/websocket/hooks/useVentilatorConnection';
import { ConnectionPanel } from '@/features/simulador/compartido/componentes/ConnectionPanel';
import { VentilatorDashboardWrapper } from '@/features/simulador/simuladorVentilador/dashboard/componentes/VentilatorDashboardWrapper';
import styles from '@/features/simulador/ui/SimuladorPage.module.css';

// =============================================================================
// Inner component — hooks require a React function component scope
// =============================================================================

function SimuladorContent() {
  const { connectionState, reservation, actions } = useVentilatorConnection();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <ConnectionPanel
          connectionState={connectionState}
          reservation={reservation}
          onSwitchToLocal={actions.switchToLocal}
          onSwitchToRemote={actions.switchToRemote}
          onDisconnect={actions.disconnect}
          onRequestReservation={actions.requestReservation}
          onReleaseReservation={actions.releaseReservation}
        />
      </aside>
      <main className={styles.main}>
        <VentilatorDashboardWrapper
          isRealVentilator={reservation.hasReservation}
        />
      </main>
    </div>
  );
}

// =============================================================================
// Page export
// =============================================================================

export default function SimuladorPage() {
  return (
    <LearningProgressProvider>
      <SimuladorContent />
    </LearningProgressProvider>
  );
}
